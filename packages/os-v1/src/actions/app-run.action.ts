import { Type, type Static } from "@sinclair/typebox";
import type { Action, Token } from "../tokens.js";
import type { Injector } from "@context-ai/core";
import { APP_EXECUTE_PERMISSION, APP_READ_PERMISSION, getInstalledApps } from "./app-common.js";
import { spawn } from "node:child_process";
import { ShellSessionStore } from "../core/shell-session.js";

// ============================================================================
// App Run Action - 请求/响应 Schema 定义
// ============================================================================

/**
 * 应用运行请求 Schema
 */
export const AppRunRequestSchema = Type.Object({
    /** 应用 ID（已安装的应用）或应用路径 */
    app: Type.String({ description: "Application ID (for installed apps) or path to the application" }),
    /** 运行参数 */
    args: Type.Optional(Type.Array(Type.String({ description: "Arguments to pass to the application" }))),
    /** 环境变量 */
    env: Type.Optional(Type.Record(Type.String(), Type.String(), { description: "Environment variables for the application" })),
    /** 运行超时时间（毫秒），0 表示无限等待 */
    timeoutMs: Type.Optional(Type.Number({ description: "Run timeout in milliseconds (0 for no timeout)" })),
    /** 是否在后台运行 */
    background: Type.Optional(Type.Boolean({ description: "Run application in background (default: false)" })),
});

/** 应用运行请求 TypeScript 类型 */
export type AppRunRequest = Static<typeof AppRunRequestSchema>;

/**
 * 应用运行响应 Schema
 */
export const AppRunResponseSchema = Type.Object({
    /** 操作是否成功 */
    success: Type.Boolean({ description: "Whether the application started successfully" }),
    /** 进程 ID（用于后续管理） */
    pid: Type.Optional(Type.Number({ description: "Process ID of the running application" })),
    /** 标准输出 */
    stdout: Type.Optional(Type.String({ description: "Standard output from the application" })),
    /** 标准错误 */
    stderr: Type.Optional(Type.String({ description: "Standard error from the application" })),
    /** 退出码（如果应用已结束） */
    exitCode: Type.Optional(Type.Number({ description: "Exit code if application has finished" })),
    /** 错误信息（如果启动失败） */
    error: Type.Optional(Type.String({ description: "Error message if startup failed" })),
});

/** 应用运行响应 TypeScript 类型 */
export type AppRunResponse = Static<typeof AppRunResponseSchema>;

// ============================================================================
// App Run Action - Token 定义
// ============================================================================

/**
 * 应用运行令牌
 */
export const APP_RUN_TOKEN: Token<typeof AppRunRequestSchema, typeof AppRunResponseSchema> = "app.run";

// ============================================================================
// App Run Action - Action 定义
// ============================================================================

/**
 * 应用运行 Action
 *
 * 核心能力：运行已安装或指定路径的应用程序。
 *
 * 设计要点:
 * - 使用 TypeBox 定义 Schema
 * - 权限控制:需要 app:execute 和 app:read 权限
 * - 支持通过应用 ID 或路径指定应用
 * - 支持环境变量和运行参数
 */
export const appRunAction: Action<typeof AppRunRequestSchema, typeof AppRunResponseSchema> = {
    type: APP_RUN_TOKEN,
    description: "Run an installed or specified application",
    request: AppRunRequestSchema,
    response: AppRunResponseSchema,
    requiredPermissions: [APP_EXECUTE_PERMISSION, APP_READ_PERMISSION],
    dependencies: [],
    execute: async (params: AppRunRequest, injector: Injector): Promise<AppRunResponse> => {
        const timeoutMs = params.timeoutMs ?? 60000;
        const background = params.background ?? false;

        return new Promise((resolve) => {
            // 获取会话环境变量
            const store = injector.get(ShellSessionStore);
            const sessionEnv = store.getEnv();

            // 获取已安装的应用信息
            getInstalledApps(injector).then(installedApps => {
                const installedApp = installedApps.find(a => a.id === params.app);
                const appPath = installedApp?.installPath ?? params.app;

                // 构建运行命令
                let command = `cd ${appPath} && npm start`;

                if (params.args && params.args.length > 0) {
                    command += " -- " + params.args.map(arg => `"${arg}"`).join(" ");
                }

                // 构建环境变量字符串
                const mergedEnv = { ...process.env, ...sessionEnv, ...(params.env || {}) };

                // 平台特定的 shell 选择
                const shell = process.platform === "win32" ? "powershell.exe" : "bash";
                const shellArgs = process.platform === "win32"
                    ? ["-Command", command]
                    : ["-lc", command];

                // 启动子进程
                const child = spawn(shell, shellArgs, {
                    env: mergedEnv,
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

                    // 后台运行时，即使应用未结束也视为成功启动
                    if (background || code === 0) {
                        resolve({
                            success: true,
                            stdout,
                            stderr,
                            exitCode: code ?? undefined,
                        });
                    } else {
                        resolve({
                            success: false,
                            stdout,
                            stderr,
                            exitCode: code ?? undefined,
                            error: stderr || "Application exited with non-zero code",
                        });
                    }
                });
            }).catch(error => {
                resolve({
                    success: false,
                    error: error instanceof Error ? error.message : String(error),
                });
            });
        });
    },
};
