import { Type, type Static } from "@sinclair/typebox";
import { PAGES, type Action, type Token } from "../tokens.js";
import type { Injector } from "@context-ai/core";
import { createAgent } from '@context-ai/agent';
import type { AgentEvent, AgentMessage } from '@mariozechner/pi-agent-core';

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
        try {
            // 1. 查找对应的页面
            const pages = _injector.get(PAGES);
            const page = pages.find(p => p.path === params.path);

            if (!page) {
                return {
                    success: false,
                    output: "",
                    error: `Page not found: ${params.path}`,
                    toolCallsCount: 0
                };
            }

            // 2. 创建页面上下文
            const ctx = await page.create(params, _injector);

            // 3. 创建 Agent
            const agent = createAgent(ctx.prompt, ctx.tools);

            // 4. 设置结果收集器
            let finalMessages: AgentMessage[] = [];
            let toolCallsCount = 0;
            let executionError: string | undefined;

            // 5. 订阅 Agent 事件
            const unsubscribe = agent.subscribe((event: AgentEvent) => {
                if (event.type === "agent_end") {
                    finalMessages = event.messages;
                } else if (event.type === "tool_execution_end") {
                    toolCallsCount++;
                    // 检查工具执行是否出错
                    if (event.isError) {
                        executionError = `Tool execution error: ${event.toolName}`;
                    }
                }
            });

            try {
                // 6. 执行 Agent 提示词
                await agent.prompt(params.prompt, []);

                // 7. 等待 Agent 完成
                await agent.waitForIdle();

                // 8. 提取 Assistant 消息作为输出
                const assistantMessages = finalMessages
                    .filter((msg: AgentMessage) =>
                        'role' in msg && msg.role === 'assistant'
                    )
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

                return {
                    success: !executionError,
                    output: output || "(Agent completed with no text output)",
                    error: executionError,
                    toolCallsCount
                };

            } finally {
                // 9. 清理订阅
                unsubscribe();
            }

        } catch (error) {
            // 10. 错误处理
            const errorMessage = error instanceof Error ? error.message : String(error);
            return {
                success: false,
                output: "",
                error: `Agent execution failed: ${errorMessage}`,
                toolCallsCount: 0
            };
        }
    },
};
