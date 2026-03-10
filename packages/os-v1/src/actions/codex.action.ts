import { Type, type Static } from "@sinclair/typebox";
import type { Action, Token } from "../tokens.js";
import type { Injector } from "@context-ai/core";
import { spawn } from "node:child_process";
import { ShellSessionStore } from "../core/shell-session.js";

// ============================================================================
// Codex Action - 请求/响应 Schema 定义
// ============================================================================

/**
 * Codex 执行请求 Schema
 */
export const CodexRequestSchema = Type.Object({
	/** 编码任务描述 */
	prompt: Type.String({ description: "Coding task prompt for Codex" }),
	/** 工作目录 */
	cwd: Type.Optional(Type.String({ description: "Working directory for Codex execution" })),
	/** 模型名称 */
	model: Type.Optional(Type.String({ description: "Model to use (e.g., claude-opus-4)" })),
	/** 沙箱模式 */
	sandbox: Type.Optional(Type.Union([
		Type.Literal("read-only"),
		Type.Literal("workspace-write"),
		Type.Literal("danger-full-access")
	], { description: "Sandbox policy", default: "workspace-write" })),
	/** 是否跳过 git 仓库检查 */
	skip_git_repo_check: Type.Optional(Type.Boolean({ description: "Allow running outside Git repository", default: false })),
	/** 是否使用 full-auto 模式 */
	full_auto: Type.Optional(Type.Boolean({ description: "Enable full-auto mode (low-friction execution)", default: true })),
	/** 超时时间（毫秒） */
	timeout_ms: Type.Optional(Type.Number({ description: "Execution timeout in milliseconds", default: 300000 })),
});

/** Codex 执行请求 TypeScript 类型 */
export type CodexRequest = Static<typeof CodexRequestSchema>;

/**
 * Codex 执行响应 Schema
 */
export const CodexResponseSchema = Type.Object({
	/** 标准输出 */
	stdout: Type.String({ description: "Standard output from Codex execution" }),
	/** 标准错误输出 */
	stderr: Type.String({ description: "Standard error output from Codex execution" }),
	/** 退出码 */
	exit_code: Type.Number({ description: "Exit code (0 = success)" }),
	/** 是否成功 */
	success: Type.Boolean({ description: "Whether execution succeeded" }),
});

/** Codex 执行响应 TypeScript 类型 */
export type CodexResponse = Static<typeof CodexResponseSchema>;

// ============================================================================
// Codex Action - Token 定义
// ============================================================================

/**
 * Codex 执行令牌
 */
export const CODEX_TOKEN: Token<typeof CodexRequestSchema, typeof CodexResponseSchema> = "codex.execute";

// ============================================================================
// Codex Action - 权限定义
// ============================================================================

/**
 * Codex 执行权限
 */
export const CODEX_PERMISSION = "codex:execute";

// ============================================================================
// Codex Action - Action 定义
// ============================================================================

/**
 * Codex 执行 Action
 *
 * 核心能力：调用 Codex CLI 工具执行编码任务。
 *
 * 设计要点：
 * - 使用 spawn 调用 codex exec 命令
 * - 支持工作目录、模型选择、沙箱模式等配置
 * - 返回执行结果（stdout、stderr、exit_code）
 *
 * 使用方式:
 * const result = await actionExecuter.execute(CODEX_TOKEN, {
 *     prompt: 'Write a function to calculate fibonacci numbers in TypeScript',
 *     cwd: '/path/to/project',
 *     model: 'claude-opus-4',
 *     full_auto: true
 * });
 */
export const codexAction: Action<typeof CodexRequestSchema, typeof CodexResponseSchema> = {
	type: CODEX_TOKEN,
	description: "Execute coding tasks using Codex CLI tool",
	request: CodexRequestSchema,
	response: CodexResponseSchema,
	requiredPermissions: [CODEX_PERMISSION],
	dependencies: [],
	execute: async (params: CodexRequest, injector: Injector): Promise<CodexResponse> => {
		return new Promise((resolve, reject) => {
			const shellSessionStore = injector.get(ShellSessionStore);
			const sessionEnv = shellSessionStore.getEnv();

			// 构建 codex exec 命令参数
			const args = ["exec"];

			if (params.model) {
				args.push("-m", params.model);
			}

			if (params.sandbox) {
				args.push("-s", params.sandbox);
			}

			if (params.skip_git_repo_check) {
				args.push("--skip-git-repo-check");
			}

			if (params.full_auto) {
				args.push("--full-auto");
			}

			// 添加 prompt 作为最后一个参数
			args.push(params.prompt);

			// 启动 codex 子进程
			const child = spawn("codex", args, {
				cwd: params.cwd ?? process.cwd(),
				env: { ...process.env, ...sessionEnv },
				stdio: ["ignore", "pipe", "pipe"],
			});

			const stdoutChunks: Buffer[] = [];
			const stderrChunks: Buffer[] = [];

			// 超时处理
			let timeoutHandle: NodeJS.Timeout | undefined;
			const timeoutMs = params.timeout_ms ?? 300000;
			if (timeoutMs > 0) {
				timeoutHandle = setTimeout(() => {
					child.kill("SIGTERM");
					setTimeout(() => child.kill("SIGKILL"), 5000);
				}, timeoutMs);
			}

			// 收集输出
			child.stdout.on("data", (chunk: Buffer) => stdoutChunks.push(chunk));
			child.stderr.on("data", (chunk: Buffer) => stderrChunks.push(chunk));

			// 错误处理
			child.on("error", (error) => {
				if (timeoutHandle) clearTimeout(timeoutHandle);
				reject(new Error(`Failed to spawn codex: ${error.message}`));
			});

			// 进程结束
			child.on("close", (code) => {
				if (timeoutHandle) clearTimeout(timeoutHandle);
				const stdout = Buffer.concat(stdoutChunks).toString("utf8");
				const stderr = Buffer.concat(stderrChunks).toString("utf8");
				const exitCode = code ?? -1;

				resolve({
					stdout,
					stderr,
					exit_code: exitCode,
					success: exitCode === 0,
				});
			});
		});
	},
};
