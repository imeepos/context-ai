import { Type, type Static } from "@sinclair/typebox";
import type { Action, Token } from "../tokens.js";
import type { Injector } from "@context-ai/core";
import { spawn } from "node:child_process";
import { APP_EXECUTE_PERMISSION, APP_READ_PERMISSION } from "./app-common.js";
import { ShellSessionStore } from "../core/shell-session.js";

// ============================================================================
// App Test Action - 请求/响应 Schema 定义
// ============================================================================

/**
 * 测试类型 Schema
 */
export const TestTypeSchema = Type.Union([
    Type.Literal("unit"),
    Type.Literal("integration"),
    Type.Literal("e2e"),
    Type.Literal("all"),
]);

/** 测试类型 TypeScript 类型 */
export type TestType = Static<typeof TestTypeSchema>;

/**
 * 应用测试请求 Schema
 */
export const AppTestRequestSchema = Type.Object({
    /** 应用路径（工作区内的相对路径或绝对路径） */
    appPath: Type.String({ description: "Path to the application to test" }),
    /** 测试类型 */
    testType: Type.Optional(TestTypeSchema),
    /** 测试文件模式（glob） */
    testPattern: Type.Optional(Type.String({ description: "Glob pattern for test files" })),
    /** 是否生成覆盖率报告 */
    coverage: Type.Optional(Type.Boolean({ description: "Generate coverage report (default: false)" })),
    /** 是否在监听模式运行 */
    watch: Type.Optional(Type.Boolean({ description: "Run tests in watch mode (default: false)" })),
    /** 测试超时时间（毫秒） */
    timeoutMs: Type.Optional(Type.Number({ description: "Test timeout in milliseconds (default: 120000)" })),
    /** 额外的测试参数 */
    testArgs: Type.Optional(Type.Array(Type.String({ description: "Additional test arguments" }))),
    /** 是否并行运行测试 */
    parallel: Type.Optional(Type.Boolean({ description: "Run tests in parallel (default: true)" })),
});

/** 应用测试请求 TypeScript 类型 */
export type AppTestRequest = Static<typeof AppTestRequestSchema>;

/**
 * 测试结果统计 Schema
 */
export const TestStatsSchema = Type.Object({
    /** 测试套件总数 */
    suites: Type.Number({ description: "Total number of test suites" }),
    /** 通过的测试套件数 */
    suitesPassed: Type.Number({ description: "Number of passed test suites" }),
    /** 测试用例总数 */
    tests: Type.Number({ description: "Total number of test cases" }),
    /** 通过的测试用例数 */
    testsPassed: Type.Number({ description: "Number of passed test cases" }),
    /** 失败的测试用例数 */
    testsFailed: Type.Number({ description: "Number of failed test cases" }),
    /** 跳过的测试用例数 */
    testsSkipped: Type.Number({ description: "Number of skipped test cases" }),
    /** 测试持续时间（毫秒） */
    durationMs: Type.Number({ description: "Test duration in milliseconds" }),
});

/** 测试结果统计 TypeScript 类型 */
export type TestStats = Static<typeof TestStatsSchema>;

/**
 * 应用测试响应 Schema
 */
export const AppTestResponseSchema = Type.Object({
    /** 操作是否成功 */
    success: Type.Boolean({ description: "Whether all tests passed" }),
    /** 测试统计 */
    stats: Type.Optional(TestStatsSchema),
    /** 覆盖率百分比 */
    coveragePercent: Type.Optional(Type.Number({ description: "Coverage percentage if coverage was enabled" })),
    /** 测试输出日志 */
    testLog: Type.Optional(Type.String({ description: "Test output log" })),
    /** 错误信息（如果测试失败） */
    error: Type.Optional(Type.String({ description: "Error message if tests failed" })),
});

/** 应用测试响应 TypeScript 类型 */
export type AppTestResponse = Static<typeof AppTestResponseSchema>;

// ============================================================================
// App Test Action - Token 定义
// ============================================================================

/**
 * 应用测试令牌
 */
export const APP_TEST_TOKEN: Token<typeof AppTestRequestSchema, typeof AppTestResponseSchema> = "app.test";

// ============================================================================
// App Test Action - Action 定义
// ============================================================================

/**
 * 应用测试 Action
 *
 * 核心能力:运行应用程序的测试套件。
 *
 * 设计要点:
 * - 使用 TypeBox 定义 Schema
 * - 权限控制:需要 app:execute 和 app:read 权限
 * - 支持多种测试类型
 * - 支持覆盖率报告
 * - 支持监听模式
 */
export const appTestAction: Action<typeof AppTestRequestSchema, typeof AppTestResponseSchema> = {
    type: APP_TEST_TOKEN,
    description: "Run tests for an application",
    request: AppTestRequestSchema,
    response: AppTestResponseSchema,
    requiredPermissions: [APP_EXECUTE_PERMISSION, APP_READ_PERMISSION],
    dependencies: [],
    execute: async (params: AppTestRequest, injector: Injector): Promise<AppTestResponse> => {
        const testType = params.testType ?? "all";
        const coverage = params.coverage ?? false;
        const watch = params.watch ?? false;
        const parallel = params.parallel ?? true;
        const timeoutMs = params.timeoutMs ?? 120000;

        return new Promise((resolve) => {
            // 获取会话环境变量
            const store = injector.get(ShellSessionStore);
            const sessionEnv = store.getEnv();

            // 构建测试命令
            const commandParts = ["npm test"];

            if (testType !== "all") {
                commandParts.push(`--testPathPattern="${testType}"`);
            }

            if (params.testPattern) {
                commandParts.push(`--testPathPattern="${params.testPattern}"`);
            }

            if (coverage) {
                commandParts.push("--coverage");
            }

            if (watch) {
                commandParts.push("--watch");
            }

            if (!parallel) {
                commandParts.push("--runInBand");
            }

            if (params.testArgs && params.testArgs.length > 0) {
                commandParts.push(...params.testArgs);
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
            if (!watch && timeoutMs > 0) {
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
                const combinedOutput = stdout + "\n" + stderr;

                // 解析测试输出以提取统计信息
                const stats = parseTestStats(combinedOutput);
                const coveragePercent = coverage ? parseCoverage(combinedOutput) : undefined;

                if (code === 0) {
                    resolve({
                        success: true,
                        stats,
                        coveragePercent,
                        testLog: stdout,
                    });
                } else {
                    resolve({
                        success: false,
                        stats,
                        coveragePercent,
                        testLog: combinedOutput,
                        error: stderr || "Tests failed",
                    });
                }
            });
        });
    },
};

/**
 * 从测试输出中解析测试统计信息
 */
function parseTestStats(output: string): TestStats {
    const defaultStats: TestStats = {
        suites: 0,
        suitesPassed: 0,
        tests: 0,
        testsPassed: 0,
        testsFailed: 0,
        testsSkipped: 0,
        durationMs: 0,
    };

    // 尝试匹配 Jest 风格的输出
    const suitesMatch = output.match(/Test Suites:\s*(\d+)\s*(?:passed|failed)?\s*(?:,\s*(\d+)\s*passed)?\s*(?:,\s*(\d+)\s*failed)?\s*(?:,\s*(\d+)\s*total)?/i);
    const testsMatch = output.match(/Tests:\s*(\d+)\s*(?:passed|failed|skipped)?\s*(?:,\s*(\d+)\s*passed)?\s*(?:,\s*(\d+)\s*failed)?\s*(?:,\s*(\d+)\s*skipped)?\s*(?:,\s*(\d+)\s*total)?/i);
    const timeMatch = output.match(/Time:\s*([\d.]+)\s*(s|ms)/i);

    if (suitesMatch) {
        defaultStats.suites = parseInt(suitesMatch[4] ?? suitesMatch[1] ?? "0", 10);
        defaultStats.suitesPassed = parseInt(suitesMatch[2] ?? suitesMatch[1] ?? "0", 10);
    }

    if (testsMatch) {
        defaultStats.tests = parseInt(testsMatch[5] ?? testsMatch[1] ?? "0", 10);
        defaultStats.testsPassed = parseInt(testsMatch[2] ?? testsMatch[1] ?? "0", 10);
        defaultStats.testsFailed = parseInt(testsMatch[3] ?? "0", 10);
        defaultStats.testsSkipped = parseInt(testsMatch[4] ?? "0", 10);
    }

    if (timeMatch) {
        const timeValue = timeMatch[1];
        const unit = timeMatch[2];
        if (timeValue) {
            const time = parseFloat(timeValue);
            defaultStats.durationMs = unit === "s" ? time * 1000 : time;
        }
    }

    return defaultStats;
}

/**
 * 从测试输出中解析覆盖率百分比
 */
function parseCoverage(output: string): number | undefined {
    // 尝试匹配 Jest 覆盖率输出
    const coverageMatch = output.match(/All files\s*\|\s*([\d.]+)/);
    if (coverageMatch && coverageMatch[1]) {
        return parseFloat(coverageMatch[1]);
    }

    // 尝试匹配百分比格式的覆盖率
    const percentMatch = output.match(/coverage[:\s]+(\d+(?:\.\d+)?)\s*%/i);
    if (percentMatch && percentMatch[1]) {
        return parseFloat(percentMatch[1]);
    }

    return undefined;
}

