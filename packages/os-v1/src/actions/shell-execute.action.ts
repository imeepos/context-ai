import { Type, type Static } from "@sinclair/typebox";
import type { Action, Token } from "../tokens.js";
import type { Injector } from "@context-ai/core";

// ============================================================================
// Shell Execute Action - 请求/响应 Schema 定义
// ============================================================================

/**
 * 执行配置 Schema
 *
 * 用于细粒度的权限控制，限制可执行的命令范围。
 * 参考自 packages/os 中的 ShellPolicyGuard 实现。
 */
export const ExecutionProfileSchema = Type.Object({
    /** 允许执行的命令模式列表（白名单） */
    allowedPatterns: Type.Optional(Type.Array(Type.String({ description: "Allowed command pattern (glob or regex)" }))),
    /** 禁止执行的命令模式列表（黑名单） */
    deniedPatterns: Type.Optional(Type.Array(Type.String({ description: "Denied command pattern (glob or regex)" }))),
});

/** 执行配置 TypeScript 类型 */
export type ExecutionProfile = Static<typeof ExecutionProfileSchema>;

/**
 * Shell 执行请求 Schema
 */
export const ShellExecuteRequestSchema = Type.Object({
    /** 要执行的 shell 命令 */
    command: Type.String({ description: "The shell command to execute" }),
    /** 执行超时时间（毫秒），超时后自动终止进程 */
    timeoutMs: Type.Optional(Type.Number({ description: "Timeout in milliseconds" })),
    /** 执行配置文件，用于细粒度的权限控制 */
    profile: Type.Optional(ExecutionProfileSchema),
});

/** Shell 执行请求 TypeScript 类型 */
export type ShellExecuteRequest = Static<typeof ShellExecuteRequestSchema>;

/**
 * Shell 执行结果 Schema
 */
export const ShellExecuteResultSchema = Type.Object({
    /** 标准输出内容（UTF-8 编码） */
    stdout: Type.String({ description: "Standard output from the command" }),
    /** 标准错误输出内容（UTF-8 编码） */
    stderr: Type.String({ description: "Standard error output from the command" }),
    /** 进程退出码：0=成功，非0=失败 */
    exitCode: Type.Number({ description: "Exit code of the process (0 = success)" }),
});

/** Shell 执行结果 TypeScript 类型 */
export type ShellExecuteResult = Static<typeof ShellExecuteResultSchema>;

// ============================================================================
// Shell Execute Action - Token 定义
// ============================================================================

/**
 * Shell 执行令牌
 *
 * 唯一标识 Shell 执行能力，用于 Action 类型识别和依赖注入。
 */
export const SHELL_EXECUTE_TOKEN: Token<typeof ShellExecuteRequestSchema, typeof ShellExecuteResultSchema> = "shell.execute";

/**
 * Shell 权限令牌
 *
 * 执行 shell 命令所需的基础权限。
 */
export const SHELL_PERMISSION: string = "shell:exec";

// ============================================================================
// Shell Execute Action - Action 定义
// ============================================================================

/**
 * Shell 执行 Action
 *
 * 核心能力：执行 shell 命令并返回结果。
 *
 * 参考自 packages/os/src/shell-service/index.ts 中的 ShellService。
 *
 * 设计要点：
 * - 使用 TypeBox 定义 Schema（与 pi-ai 的 Type 兼容）
 * - 权限控制：需要 shell:exec 权限
 * - 支持超时控制
 * - 审计日志记录（通过外部依赖）
 *
 * 使用方式:
 * const result = await actionExecuter.execute(SHELL_EXECUTE_TOKEN, {
 *     command: 'ls -la',
 *     timeoutMs: 5000
 * });
 */
export const shellExecuteAction: Action<typeof ShellExecuteRequestSchema, typeof ShellExecuteResultSchema> = {
    type: SHELL_EXECUTE_TOKEN,
    description: "Execute a shell command and return the result",
    request: ShellExecuteRequestSchema,
    response: ShellExecuteResultSchema,
    requiredPermissions: [SHELL_PERMISSION],
    dependencies: [],
    execute: async (params: ShellExecuteRequest, _injector: Injector): Promise<ShellExecuteResult> => {
        const { exec } = await import('child_process');
        const { promisify } = await import('util');
        const execAsync = promisify(exec);

        try {
            const { stdout, stderr } = await execAsync(params.command, {
                timeout: params.timeoutMs,
                encoding: 'utf-8',
                maxBuffer: 10 * 1024 * 1024, // 10MB
            });

            return {
                stdout: stdout || '',
                stderr: stderr || '',
                exitCode: 0,
            };
        } catch (error: any) {
            // exec 在非零退出码时会抛出错误
            return {
                stdout: error.stdout || '',
                stderr: error.stderr || error.message || '',
                exitCode: error.code || 1,
            };
        }
    },
};
