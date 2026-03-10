import { Type, type Static } from "@sinclair/typebox";
import { PAGES, SESSION_LOGGER, type Action, type Token } from "../tokens.js";
import type { Injector } from "@context-ai/core";
import { createAgent } from '@context-ai/agent';
import type { AgentEvent, AgentMessage } from '@mariozechner/pi-agent-core';
import { findMatchingPage } from "../core/path-matcher.js";

// ============================================================================
// 类型定义
// ============================================================================

interface TokenUsage {
    input: number;
    output: number;
    cacheRead: number;
    cacheWrite: number;
    totalTokens: number;
}

interface ToolCallRecord {
    toolCallId: string;
    toolName: string;
    args: Record<string, unknown>;
    result: unknown;
    isError: boolean;
    startTime: number;
    endTime: number;
    duration: number;
}

interface ApiCallRecord {
    turnIndex: number;
    provider: string;
    model: string;
    usage: TokenUsage;
    stopReason: string;
    timestamp: number;
}

// ============================================================================
// Loop Action - 请求/响应 Schema 定义
// ============================================================================

/**
 * Agent 循环执行请求 Schema
 */
export const LoopRequestRequestSchema = Type.Object({
    /** 页面路径，用于查找对应的 Page */
    path: Type.String({ description: "The page path to execute" }),
    /** 用户提示词，传递给 Agent */
    prompt: Type.String({ description: "The prompt to send to the agent" })
});

export type LoopRequestRequest = Static<typeof LoopRequestRequestSchema>;

/**
 * Agent 循环执行响应 Schema
 */
export const LoopRequestResponseSchema = Type.Object({
    /** 执行是否成功 */
    success: Type.Boolean({ description: "Whether the agent execution succeeded" }),
    /** Agent 的输出内容 */
    output: Type.String({ description: "The agent's output text" }),
    /** 错误信息（如果失败） */
    error: Type.Optional(Type.String({ description: "Error message if execution failed" })),
    /** 工具调用次数 */
    toolCallsCount: Type.Number({ description: "Number of tool calls made by the agent" })
});

export type LoopRequestResponse = Static<typeof LoopRequestResponseSchema>;

// ============================================================================
// Loop Action - Token 定义
// ============================================================================

/**
 * Agent 循环执行令牌
 */
export const LOOP_REQUEST_TOKEN: Token<typeof LoopRequestRequestSchema, typeof LoopRequestResponseSchema> = "loop.request";

// ============================================================================
// Loop Action - 权限定义
// ============================================================================

/**
 * Agent 循环执行权限
 */
export const LOOP_REQUEST_PERMISSION = "loop:request";

// ============================================================================
// Loop Action - Action 定义
// ============================================================================

/**
 * Agent 循环执行 Action
 *
 * 核心能力：根据页面路径创建 Agent 上下文，执行用户提示词，并返回执行结果。
 *
 * 设计要点：
 * - 使用 TypeBox 定义 Schema
 * - 权限控制：需要 loop:request 权限
 * - 通过事件监听器捕获 Agent 执行结果
 * - 支持完整的错误处理和状态返回
 * - 统计工具调用次数
 *
 * 使用方式:
 * const result = await actionExecuter.execute(LOOP_REQUEST_TOKEN, {
 *     path: '/chat',
 *     prompt: 'Hello, how are you?'
 * });
 * console.log(result.success, result.output);
 */
export const loopRequestAction: Action<typeof LoopRequestRequestSchema, typeof LoopRequestResponseSchema> = {
    type: LOOP_REQUEST_TOKEN,
    description: "Execute an agent loop with the given prompt and return the result",
    request: LoopRequestRequestSchema,
    response: LoopRequestResponseSchema,
    requiredPermissions: [LOOP_REQUEST_PERMISSION],
    dependencies: [],
    execute: async (params: LoopRequestRequest, _injector: Injector): Promise<LoopRequestResponse> => {
        const logger = _injector.get(SESSION_LOGGER);
        const executionStartTime = Date.now();

        // ============================================================================
        // 1. 请求日志 - 记录完整的请求信息
        // ============================================================================
        logger.info('LOOP_ACTION', '========== LOOP REQUEST START ==========');
        logger.info('LOOP_ACTION', 'Request Parameters', {
            path: params.path,
            prompt: params.prompt,
            promptLength: params.prompt.length,
            timestamp: new Date().toISOString()
        });

        // 用于统计的数据结构
        const apiCalls: ApiCallRecord[] = [];
        const toolCalls: ToolCallRecord[] = [];
        let currentToolCall: Partial<ToolCallRecord> | null = null;
        let toolCallsCount = 0;

        try {
            // ============================================================================
            // 2. 页面匹配 - 记录路由信息
            // ============================================================================
            const pages = _injector.get(PAGES, []);
            logger.info('LOOP_ACTION', 'Available Pages', {
                totalPages: pages.length,
                pagePaths: pages.map(p => p.path)
            });

            const matchResult = findMatchingPage(pages, params.path);

            if (!matchResult) {
                logger.warn('LOOP_ACTION', 'Page Not Found', {
                    requestedPath: params.path,
                    availablePaths: pages.map(p => p.path)
                });
                return {
                    success: false,
                    output: "",
                    error: `Page not found: ${params.path}`,
                    toolCallsCount: 0
                };
            }

            const { page, params: routeParams } = matchResult;
            logger.info('LOOP_ACTION', 'Page Matched', {
                pagePath: page.path,
                routeParams,
                matchedPath: params.path
            });

            // ============================================================================
            // 3. 页面上下文创建 - 记录完整的 system prompt 和工具信息
            // ============================================================================
            const ctx = await page.create({ ...routeParams }, _injector);

            logger.info('LOOP_ACTION', 'Page Context Created', {
                toolsCount: ctx.tools.length,
                systemPromptLength: ctx.prompt.length
            });

            // 记录完整的 System Prompt
            logger.info('LOOP_ACTION', 'System Prompt (Full)', {
                prompt: ctx.prompt
            });

            // ============================================================================
            // 4. 创建 Agent
            // ============================================================================
            const agent = createAgent(ctx.prompt, ctx.tools);
            logger.info('LOOP_ACTION', 'Agent Created', {
                toolsCount: ctx.tools.length
            });

            // ============================================================================
            // 5. 设置结果收集器
            // ============================================================================
            let finalMessages: AgentMessage[] = [];
            let executionError: string | undefined;
            let agentResponseError: string | undefined;
            let turnIndex = 0;

            // ============================================================================
            // 6. 订阅 Agent 事件 - 详细记录所有事件
            // ============================================================================
            const unsubscribe = agent.subscribe((event: AgentEvent) => {

                if (event.type === "turn_start") {
                    turnIndex++;
                    logger.info('LOOP_ACTION', `========== TURN #${turnIndex} START ==========`, {
                        turnIndex,
                        timestamp: new Date().toISOString()
                    });

                } else if (event.type === "turn_end") {
                    const message = event.message;
                    const messageRole = 'role' in message ? message.role : 'unknown';

                    logger.info('LOOP_ACTION', `Turn #${turnIndex} - Response Received`, {
                        role: messageRole,
                        hasToolResults: event.toolResults.length > 0,
                        toolResultsCount: event.toolResults.length
                    });

                    // 记录完整的消息内容
                    if ('content' in message && Array.isArray(message.content)) {
                        message.content.forEach((content, idx) => {
                            if (content.type === 'text') {
                                logger.info('LOOP_ACTION', `Turn #${turnIndex} - Text Content`, {
                                    index: idx,
                                    text: 'text' in content ? content.text : '',
                                    textLength: 'text' in content ? content.text.length : 0
                                });
                            } else if (content.type === 'thinking') {
                                logger.info('LOOP_ACTION', `Turn #${turnIndex} - Thinking Content`, {
                                    index: idx,
                                    thinking: 'thinking' in content ? content.thinking : '',
                                    signature: 'thinkingSignature' in content ? content.thinkingSignature : undefined
                                });
                            } else if (content.type === 'toolCall') {
                                logger.info('LOOP_ACTION', `Turn #${turnIndex} - Tool Call Requested`, {
                                    index: idx,
                                    toolCallId: 'id' in content ? content.id : undefined,
                                    toolName: 'name' in content ? content.name : undefined,
                                    arguments: 'arguments' in content ? content.arguments : undefined
                                });
                            }
                        });
                    }

                    // 记录 API 使用情况
                    if ('usage' in message) {
                        const usage = message.usage as TokenUsage;
                        const stopReason = 'stopReason' in message ? (message.stopReason as string) : 'unknown';
                        const apiCall: ApiCallRecord = {
                            turnIndex,
                            provider: 'provider' in message ? (message.provider as string) : 'unknown',
                            model: 'model' in message ? (message.model as string) : 'unknown',
                            usage,
                            stopReason,
                            timestamp: Date.now()
                        };
                        apiCalls.push(apiCall);

                        logger.info('LOOP_ACTION', `Turn #${turnIndex} - Token Usage`, {
                            provider: apiCall.provider,
                            model: apiCall.model,
                            input: usage.input,
                            output: usage.output,
                            cacheRead: usage.cacheRead,
                            cacheWrite: usage.cacheWrite,
                            totalTokens: usage.totalTokens,
                            stopReason: apiCall.stopReason
                        });

                        if (stopReason === "error") {
                            const messageWithError = message as { errorMessage?: string };
                            agentResponseError = messageWithError.errorMessage ?? "Agent model stopReason=error";
                        }
                    }

                    logger.info('LOOP_ACTION', `========== TURN #${turnIndex} END ==========`, {
                        turnIndex,
                        duration: 'N/A'
                    });

                } else if (event.type === "tool_execution_start") {
                    currentToolCall = {
                        toolCallId: event.toolCallId,
                        toolName: event.toolName,
                        args: event.args,
                        startTime: Date.now()
                    };

                    logger.info('LOOP_ACTION', `Tool Execution START: ${event.toolName}`, {
                        toolCallId: event.toolCallId,
                        toolName: event.toolName,
                        arguments: event.args,
                        timestamp: new Date().toISOString()
                    });

                } else if (event.type === "tool_execution_end") {
                    toolCallsCount++;

                    const endTime = Date.now();
                    const toolCallRecord: ToolCallRecord = {
                        toolCallId: event.toolCallId,
                        toolName: event.toolName,
                        args: currentToolCall?.args || {},
                        result: event.result,
                        isError: event.isError,
                        startTime: currentToolCall?.startTime || endTime,
                        endTime: endTime,
                        duration: endTime - (currentToolCall?.startTime || endTime)
                    };
                    toolCalls.push(toolCallRecord);
                    currentToolCall = null;

                    logger.info('LOOP_ACTION', `Tool Execution END: ${event.toolName}`, {
                        toolCallId: event.toolCallId,
                        toolName: event.toolName,
                        isError: event.isError,
                        duration: `${toolCallRecord.duration}ms`,
                        timestamp: new Date().toISOString()
                    });

                    // 记录完整的工具执行结果
                    logger.info('LOOP_ACTION', `Tool Result: ${event.toolName}`, {
                        toolCallId: event.toolCallId,
                        result: event.result
                    });

                    if (event.isError) {
                        executionError = `Tool execution error: ${event.toolName}`;
                        logger.error('LOOP_ACTION', `Tool Execution ERROR: ${event.toolName}`, {
                            toolCallId: event.toolCallId,
                            error: event.result
                        });
                    }

                } else if (event.type === "agent_end") {
                    finalMessages = event.messages;
                    logger.info('LOOP_ACTION', 'Agent Execution Completed', {
                        messagesCount: event.messages.length,
                        totalTurns: turnIndex
                    });

                    // 记录所有消息的完整内容
                    event.messages.forEach((msg, idx) => {
                        logger.info('LOOP_ACTION', `Final Message #${idx}`, {
                            index: idx,
                            message: JSON.stringify(msg, null, 2)
                        });
                    });
                }
            });

            try {
                // ============================================================================
                // 7. 执行 Agent 提示词
                // ============================================================================
                logger.info('LOOP_ACTION', 'Sending Prompt to Agent', {
                    prompt: params.prompt,
                    promptLength: params.prompt.length,
                    conversationHistory: 0,
                    timestamp: new Date().toISOString()
                });

                await agent.prompt(params.prompt, []);

                // ============================================================================
                // 8. 等待 Agent 完成
                // ============================================================================
                await agent.waitForIdle();
                const executionEndTime = Date.now();
                const totalDuration = executionEndTime - executionStartTime;

                logger.info('LOOP_ACTION', 'Agent Idle - Processing Results', {
                    totalDuration: `${totalDuration}ms`,
                    messagesCount: finalMessages.length
                });

                // ============================================================================
                // 9. 提取 Assistant 消息作为输出
                // ============================================================================
                const assistantMessages = finalMessages
                    .filter((msg: AgentMessage) => 'role' in msg && msg.role === 'assistant')
                    .map((msg: AgentMessage) => {
                        if ('content' in msg && Array.isArray(msg.content)) {
                            return msg.content
                                .filter(c => c.type === 'text')
                                .map(c => 'text' in c ? c.text : '')
                                .join('\n');
                        }
                        return '';
                    })
                    .filter(text => text.length > 0);

                const output = assistantMessages.join('\n\n');

                // ============================================================================
                // 10. 计算总 Token 使用量
                // ============================================================================
                const totalTokenUsage = apiCalls.reduce((acc, call) => ({
                    input: acc.input + call.usage.input,
                    output: acc.output + call.usage.output,
                    cacheRead: acc.cacheRead + call.usage.cacheRead,
                    cacheWrite: acc.cacheWrite + call.usage.cacheWrite,
                    totalTokens: acc.totalTokens + call.usage.totalTokens
                }), { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, totalTokens: 0 });

                // ============================================================================
                // 11. 构建最终结果
                // ============================================================================
                const result = {
                    success: !executionError && !agentResponseError,
                    output: output || "(Agent completed with no text output)",
                    error: executionError ?? agentResponseError,
                    toolCallsCount
                };

                // ============================================================================
                // 12. 完整的执行摘要日志
                // ============================================================================
                logger.info('LOOP_ACTION', '========== EXECUTION SUMMARY ==========', {
                    success: result.success,
                    error: result.error,
                    output: result.output,
                    totalDuration: `${totalDuration}ms`,
                    totalTurns: turnIndex,
                    totalApiCalls: apiCalls.length,
                    totalToolCalls: toolCallsCount
                });

                logger.info('LOOP_ACTION', 'Token Usage Summary', {
                    totalInput: totalTokenUsage.input,
                    totalOutput: totalTokenUsage.output,
                    totalCacheRead: totalTokenUsage.cacheRead,
                    totalCacheWrite: totalTokenUsage.cacheWrite,
                    totalTokens: totalTokenUsage.totalTokens
                });

                logger.info('LOOP_ACTION', 'API Calls Detail', {
                    calls: apiCalls.map(call => ({
                        turn: call.turnIndex,
                        model: call.model,
                        input: call.usage.input,
                        output: call.usage.output,
                        total: call.usage.totalTokens,
                        stopReason: call.stopReason
                    }))
                });

                logger.info('LOOP_ACTION', 'Tool Calls Summary', {
                    totalCalls: toolCalls.length,
                    calls: toolCalls.map(call => ({
                        toolName: call.toolName,
                        toolCallId: call.toolCallId,
                        duration: `${call.duration}ms`,
                        isError: call.isError
                    }))
                });

                logger.info('LOOP_ACTION', 'Final Output', {
                    outputLength: result.output.length,
                    output: result.output
                });

                logger.info('LOOP_ACTION', '========== LOOP REQUEST END ==========');

                return result;

            } finally {
                // ============================================================================
                // 13. 清理订阅
                // ============================================================================
                unsubscribe();
            }

        } catch (error) {
            // ============================================================================
            // 14. 错误处理
            // ============================================================================
            const errorMessage = error instanceof Error ? error.message : String(error);
            const errorStack = error instanceof Error ? error.stack : undefined;
            const executionEndTime = Date.now();
            const totalDuration = executionEndTime - executionStartTime;

            logger.error('LOOP_ACTION', '========== LOOP REQUEST FAILED ==========', {
                error: errorMessage,
                stack: errorStack,
                totalDuration: `${totalDuration}ms`,
                apiCallsCount: apiCalls.length,
                toolCallsCount: toolCalls.length
            });

            return {
                success: false,
                output: "",
                error: `Agent execution failed: ${errorMessage}`,
                toolCallsCount
            };
        }
    },
};
