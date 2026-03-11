import { Type, type Static } from "@sinclair/typebox";
import { CURRENT_PAGE, CURRENT_PAGE_PARAMS, PAGES, SESSION_LOGGER, type Action, type Token } from "../tokens.js";
import { createFeatureInjector, type Injector } from "@context-ai/core";
import { createAgent } from '@context-ai/agent';
import type { AgentEvent, AgentMessage } from '@mariozechner/pi-agent-core';
import { findMatchingPage } from "../core/path-matcher.js";
import SYSTEM_PROMPT from "../SYSTEM_PROMPT.js";

// ============================================================================
// 类型定义
// ============================================================================

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

function truncateText(input: string, maxLength: number = 300): string {
    if (input.length <= maxLength) {
        return input;
    }
    return `${input.slice(0, maxLength)}...<truncated>`;
}

function toLogSafeValue(input: unknown, maxLength: number = 1000): unknown {
    if (typeof input === "string") {
        return truncateText(input, maxLength);
    }

    try {
        return truncateText(JSON.stringify(input), maxLength);
    } catch {
        return "[unserializable]";
    }
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
        // ============================================================================
        // 1. 请求日志 - 记录完整的请求信息
        // ============================================================================
        logger.info('LOOP_ACTION', '========== LOOP REQUEST START ==========');
        logger.info('LOOP_ACTION', 'Request Parameters', {
            path: params.path,
            promptLength: params.prompt.length,
            promptPreview: truncateText(params.prompt)
        });

        // 用于统计的数据结构
        const toolCalls: ToolCallRecord[] = [];
        let currentToolCall: Partial<ToolCallRecord> | null = null;
        let toolCallsCount = 0;

        try {
            // ============================================================================
            // 2. 页面匹配 - 记录路由信息
            // ============================================================================
            const pages = _injector.get(PAGES, []);

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
                requestedPath: params.path,
                matchedPath: page.path,
                pageName: page.name,
                routeParams
            });

            const runInjector = createFeatureInjector([
                { provide: CURRENT_PAGE, useValue: page },
                { provide: CURRENT_PAGE_PARAMS, useValue: routeParams }
            ], _injector);

            // ============================================================================
            // 3. 页面上下文创建 - 记录完整的 system prompt 和工具信息
            // ============================================================================
            const ctx = await page.create({ ...routeParams }, runInjector);
            logger.info('LOOP_ACTION', 'Context Created', {
                pageName: ctx.name,
                contextPromptLength: ctx.prompt.length,
                contextPromptPreview: truncateText(ctx.prompt),
                toolsCount: ctx.tools.length,
                toolNames: ctx.tools.map(tool => ("name" in tool ? String(tool.name) : "unknown"))
            });

            // ============================================================================
            // 4. 创建 Agent
            // ============================================================================
            const agent = createAgent(SYSTEM_PROMPT, ctx.tools);
            logger.info('LOOP_ACTION', 'Agent Created', {
                systemPromptLength: SYSTEM_PROMPT.length,
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
                    logger.debug('LOOP_ACTION', 'Turn Start', { turnIndex });

                } else if (event.type === "turn_end") {
                    const message = event.message;
                    // 记录 API 使用情况
                    if ('usage' in message) {
                        const stopReason = 'stopReason' in message ? (message.stopReason as string) : 'unknown';
                        logger.debug('LOOP_ACTION', 'Turn End', {
                            turnIndex,
                            stopReason,
                            usage: message.usage
                        });
                        if (stopReason === "error") {
                            const messageWithError = message as { errorMessage?: string };
                            agentResponseError = messageWithError.errorMessage ?? "Agent model stopReason=error";
                        }
                    }

                } else if (event.type === "tool_execution_start") {
                    currentToolCall = {
                        toolCallId: event.toolCallId,
                        toolName: event.toolName,
                        args: event.args,
                        startTime: Date.now()
                    };
                    logger.info('LOOP_ACTION', 'Tool Execution Start', {
                        turnIndex,
                        toolCallId: event.toolCallId,
                        toolName: event.toolName,
                        args: event.args
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
                    logger.info('LOOP_ACTION', 'Tool Execution End', {
                        turnIndex,
                        toolCallId: event.toolCallId,
                        toolName: event.toolName,
                        isError: event.isError,
                        durationMs: toolCallRecord.duration,
                        args: toolCallRecord.args,
                        resultSummary: toLogSafeValue(event.result)
                    });

                    if (event.isError) {
                        executionError = `Tool execution error: ${event.toolName}`;
                    }

                } else if (event.type === "agent_end") {
                    finalMessages = event.messages;
                    logger.info('LOOP_ACTION', 'Agent End', {
                        turnCount: turnIndex,
                        messagesCount: event.messages.length
                    });
                }
            });

            try {
                const mergedPrompt = `${ctx.prompt}\n\n 世界意志: ${params.prompt}`;
                logger.info('LOOP_ACTION', 'Prompt Composition', {
                    contextPromptLength: ctx.prompt.length,
                    userPromptLength: params.prompt.length,
                    mergedPromptLength: mergedPrompt.length
                });

                await agent.prompt(mergedPrompt, []);
                await agent.waitForIdle();

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
                logger.info('LOOP_ACTION', 'Output Summary', {
                    assistantMessagesCount: assistantMessages.length,
                    outputLength: output.length,
                    outputPreview: truncateText(output)
                });

                // ============================================================================
                // 11. 构建最终结果
                // ============================================================================
                const result = {
                    success: !executionError && !agentResponseError,
                    output: output || "(Agent completed with no text output)",
                    error: executionError ?? agentResponseError,
                    toolCallsCount
                };
                logger.info('LOOP_ACTION', 'Execution Summary', {
                    success: result.success,
                    turnCount: turnIndex,
                    toolCallsCount,
                    toolCallNames: toolCalls.map(call => call.toolName),
                    outputLength: result.output.length,
                    error: result.error
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
            logger.error('LOOP_ACTION', 'LOOP REQUEST FAILED', {
                error: errorMessage,
                toolCallsCount
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
