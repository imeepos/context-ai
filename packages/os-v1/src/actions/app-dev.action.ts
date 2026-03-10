import { Type, type Static } from "@sinclair/typebox";
import type { Action, Token } from "../tokens.js";
import type { Injector } from "@context-ai/core";
import { spawn } from "node:child_process";
import { APP_EXECUTE_PERMISSION, APP_READ_PERMISSION } from "./app-common.js";

import { ShellSessionStore } from "../core/shell-session.js";

// ============================================================================
// App Dev Action - 请求/响应 Schema 定义
// ============================================================================

/**
 * AI 助手类型 Schema
 */
export const AssistantTypeSchema = Type.Union([
    Type.Literal("claude"),
    Type.Literal("codex"),
    Type.Literal("gemini"),
]);

/** AI 助手类型 TypeScript 类型 */
export type AssistantType = Static<typeof AssistantTypeSchema>;

/**
 * 应用开发请求 Schema
 */
export const AppDevRequestSchema = Type.Object({
    /** 应用路径（工作区内的相对路径或绝对路径） */
    appPath: Type.String({ description: "Path to the application for development" }),
    /** 使用的 AI 助手，默认 "claude" */
    assistant: Type.Optional(AssistantTypeSchema),
    /** 开发服务器端口 */
    port: Type.Optional(Type.Number({ description: "Port for the development server" })),
    /** 是否开启热重载 */
    hotReload: Type.Optional(Type.Boolean({ description: "Enable hot reload (default: true)" })),
    /** 额外的开发参数 */
    devArgs: Type.Optional(Type.Array(Type.String({ description: "Additional development arguments" }))),
    /** 开发超时时间（毫秒），0 表示无限等待 */
    timeoutMs: Type.Optional(Type.Number({ description: "Development session timeout in milliseconds (0 for no timeout)" })),
});

/** 应用开发请求 TypeScript 类型 */
export type AppDevRequest = Static<typeof AppDevRequestSchema>;

/**
 * 应用开发响应 Schema
 */
export const AppDevResponseSchema = Type.Object({
    /** 操作是否成功启动 */
    success: Type.Boolean({ description: "Whether the dev server started successfully" }),
    /** 开发服务器 URL */
    serverUrl: Type.Optional(Type.String({ description: "URL of the development server" })),
    /** 进程 ID（用于后续管理） */
    pid: Type.Optional(Type.Number({ description: "Process ID of the dev server" })),
    /** 错误信息（如果启动失败） */
    error: Type.Optional(Type.String({ description: "Error message if startup failed" })),
});

/** 应用开发响应 TypeScript 类型 */
export type AppDevResponse = Static<typeof AppDevResponseSchema>;

// ============================================================================
// App Dev Action - Token 定义
// ============================================================================

/**
 * 应用开发令牌
 */
export const APP_DEV_TOKEN: Token<typeof AppDevRequestSchema, typeof AppDevResponseSchema> = "app.dev";

// ============================================================================
// App Dev Action - Action 定义
// ============================================================================

/**
 * 应用开发 Action
 *
 * 核心能力：启动应用开发服务器，支持 AI 辅助开发。
 *
 * 设计要点:
 * - 使用 TypeBox 定义 Schema
 * - 权限控制:需要 app:execute 和 app:read 权限
 * - 默认使用 "claude" 作为 AI 助手
 * - 支持热重载和自定义端口
 */
export const appDevAction: Action<typeof AppDevRequestSchema, typeof AppDevResponseSchema> = {
    type: APP_DEV_TOKEN,
    description: "Start a development server for the application with AI assistance",
    request: AppDevRequestSchema,
    response: AppDevResponseSchema,
    requiredPermissions: [APP_EXECUTE_PERMISSION, APP_READ_PERMISSION],
    dependencies: [],
    execute: async (params: AppDevRequest, injector: Injector): Promise<AppDevResponse> => {
        const assistant = params.assistant ?? "claude";
        const port = params.port ?? 3000;
        const hotReload = params.hotReload ?? true;
        const timeoutMs = params.timeoutMs ?? 60000;

        return new Promise((resolve) => {
            // 获取会话环境变量
            const store = injector.get(ShellSessionStore);
            const sessionEnv = store.getEnv();

            // 构建开发命令
            const commandParts = ["npm run dev"];
            commandParts.push(`--port=${port}`);

            if (!hotReload) {
                commandParts.push("--no-hot-reload");
            }

            commandParts.push(`--assistant=${assistant}`);

            if (params.devArgs && params.devArgs.length > 0) {
                commandParts.push(...params.devArgs.map(arg => `--${arg}`));
            }

            const command = commandParts.join(" ");

            // 平台特定的 shell 选择
            const shell = process.platform === "win32" ? "powershell.exe" : "bash";
            const shellArgs = process.platform === "win32"
                ? ["-Command", `cd ${params.appPath}; ${command}`]
                : ["-lc", `cd ${params.appPath} && ${command}`];

            // 启动子进程
            const child = spawn(shell, shellArgs, {
                env: { ...process.env, ...sessionEnv },
                stdio: ["ignore", "pipe", "pipe"],
            });

            const stdoutChunks: Buffer[] = [];
            const stderrChunks: Buffer[] = [];

            // 超时处理
            let timeoutHandle: ReturnType<typeof setTimeout> | undefined;
            if (timeoutMs > 0) {
                timeoutHandle = setTimeout(() => {
                    child.kill();
                }, timeoutMs);
            }

            // 收集输出
            child.stdout.on("data", (chunk: Buffer) => stdoutChunks.push(chunk));
            child.stderr.on("data", (chunk: Buffer) => stderrChunks.push(chunk));

            // 错误处理
            child.on("error", (error) => {
                if (timeoutHandle) clearTimeout(timeoutHandle);
                resolve({
                    success: false,
                    error: error.message,
                });
            });

            // 进程结束
            child.on("close", (code) => {
                if (timeoutHandle) clearTimeout(timeoutHandle);
                const stdout = Buffer.concat(stdoutChunks).toString("utf8");
                const stderr = Buffer.concat(stderrChunks).toString("utf8");

                if (code === 0 || code === null) {
                    resolve({
                        success: true,
                        serverUrl: `http://localhost:${port}`,
                    });
                } else {
                    resolve({
                        success: false,
                        error: stderr || stdout || "Dev server failed to start",
                    });
                }
            });
        });
    },
};
