import { Type, type Static } from "@sinclair/typebox";
import type { Action, Token } from "../tokens.js";
import type { Injector } from "@context-ai/core";
import { spawn } from "node:child_process";
import { APP_EXECUTE_PERMISSION, APP_READ_PERMISSION } from "./app-common.js";

// ============================================================================
// App Build Action - 请求/响应 Schema 定义
// ============================================================================

/**
 * 应用构建请求 Schema
 */
export const AppBuildRequestSchema = Type.Object({
    /** 应用路径（工作区内的相对路径或绝对路径） */
    appPath: Type.String({ description: "Path to the application to build" }),
    /** 输出目录，默认 "dist" */
    outDir: Type.Optional(Type.String({ description: "Output directory for build artifacts (default: dist)" })),
    /** 构建配置文件路径 */
    configPath: Type.Optional(Type.String({ description: "Path to build configuration file" })),
    /** 额外的构建参数 */
    buildArgs: Type.Optional(Type.Array(Type.String({ description: "Additional build arguments" }))),
    /** 构建超时时间（毫秒），默认 300000 (5分钟) */
    timeoutMs: Type.Optional(Type.Number({ description: "Build timeout in milliseconds (default: 300000)" })),
});

/** 应用构建请求 TypeScript 类型 */
export type AppBuildRequest = Static<typeof AppBuildRequestSchema>;

/**
 * 应用构建响应 Schema
 */
export const AppBuildResponseSchema = Type.Object({
    /** 操作是否成功 */
    success: Type.Boolean({ description: "Whether the build completed successfully" }),
    /** 输出目录的绝对路径 */
    outputPath: Type.Optional(Type.String({ description: "Absolute path to the output directory" })),
    /** 构建输出日志 */
    buildLog: Type.Optional(Type.String({ description: "Build output log" })),
    /** 错误信息（如果构建失败） */
    error: Type.Optional(Type.String({ description: "Error message if build failed" })),
});

/** 应用构建响应 TypeScript 类型 */
export type AppBuildResponse = Static<typeof AppBuildResponseSchema>;

// ============================================================================
// App Build Action - Token 定义
// ============================================================================

/**
 * 应用构建令牌
 */
export const APP_BUILD_TOKEN: Token<typeof AppBuildRequestSchema, typeof AppBuildResponseSchema> = "app.build";

// ============================================================================
// App Build Action - Action 定义
// ============================================================================

/**
 * 应用构建 Action
 *
 * 核心能力：构建应用程序，生成可部署的构建产物。
 *
 * 设计要点：
 * - 使用 TypeBox 定义 Schema
 * - 权限控制：需要 app:execute 和 app:read 权限
 * - 使用 spawn 直接执行构建命令
 * - 默认输出目录为 "dist"
 * - 支持自定义构建参数
 */
export const appBuildAction: Action<typeof AppBuildRequestSchema, typeof AppBuildResponseSchema> = {
    type: APP_BUILD_TOKEN,
    description: "Build an application and generate deployable artifacts",
    request: AppBuildRequestSchema,
    response: AppBuildResponseSchema,
    requiredPermissions: [APP_EXECUTE_PERMISSION, APP_READ_PERMISSION],
    dependencies: [],
    execute: async (params: AppBuildRequest, _injector: Injector): Promise<AppBuildResponse> => {
        const outDir = params.outDir ?? "dist";
        const timeoutMs = params.timeoutMs ?? 300000;

        // 构建构建命令
        const commandParts = ["npm run build"];

        // 添加输出目录参数
        commandParts.push(`-- --outDir=${outDir}`);

        // 添加配置文件参数
        if (params.configPath) {
            commandParts.push(`--config=${params.configPath}`);
        }

        // 添加额外构建参数
        if (params.buildArgs && params.buildArgs.length > 0) {
            commandParts.push(...params.buildArgs.map(arg => `--${arg}`));
        }

        const command = commandParts.join(" ");

        return new Promise((resolve) => {
            // 平台特定的 shell 选择
            const shell = process.platform === "win32" ? "powershell.exe" : "bash";
            const shellArgs = process.platform === "win32"
                ? ["-Command", `cd ${params.appPath}; ${command}`]
                : ["-lc", `cd ${params.appPath} && ${command}`];

            // 启动子进程
            const child = spawn(shell, shellArgs, {
                stdio: ["ignore", "pipe", "pipe"],
            });

            // 缓冲 stdout 和 stderr
            const stdoutChunks: Buffer[] = [];
            const stderrChunks: Buffer[] = [];

            // 超时处理
            const timeoutHandle = setTimeout(() => {
                child.kill();
            }, timeoutMs);

            // 收集输出
            child.stdout.on("data", (chunk: Buffer) => stdoutChunks.push(chunk));
            child.stderr.on("data", (chunk: Buffer) => stderrChunks.push(chunk));

            // 错误处理
            child.on("error", (error) => {
                clearTimeout(timeoutHandle);
                resolve({
                    success: false,
                    error: error.message,
                });
            });

            // 进程结束
            child.on("close", (code) => {
                clearTimeout(timeoutHandle);
                const stdout = Buffer.concat(stdoutChunks).toString("utf8");
                const stderr = Buffer.concat(stderrChunks).toString("utf8");

                if (code === 0) {
                    resolve({
                        success: true,
                        outputPath: `${params.appPath}/${outDir}`,
                        buildLog: stdout,
                    });
                } else {
                    resolve({
                        success: false,
                        error: stderr || stdout || "Build failed with unknown error",
                        buildLog: stdout + "\n" + stderr,
                    });
                }
            });
        });
    },
};
