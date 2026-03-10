import { Type, type Static } from "@sinclair/typebox";
import type { Action, Token } from "../tokens.js";
import type { Injector } from "@context-ai/core";
import { spawn } from "node:child_process";
import { ShellSessionStore } from "../core/shell-session.js";

// ============================================================================
// Claude Action - 请求/响应 Schema 定义
// ============================================================================

/**
 * Claude 执行请求 Schema
 */
export const ClaudeRequestSchema = Type.Object({
	/** 编码任务描述 */
	prompt: Type.String({ description: "Coding task prompt for Claude" }),
	/** 工作目录 */
	cwd: Type.Optional(Type.String({ description: "Working directory for Claude execution" })),
	/** 模型名称 */
	model: Type.Optional(Type.String({ description: "Model to use (e.g., sonnet, opus, haiku)" })),
	/** 是否使用 print 模式（非交互式） */
	print: Type.Optional(Type.Boolean({ description: "Use print mode for non-interactive output", default: true })),
	/** 输出格式 */
	output_format: Type.Optional(Type.Union([
		Type.Literal("text"),
		Type.Literal("json"),
		Type.Literal("stream-json")
	], { description: "Output format (only works with print mode)", default: "text" })),
	/** 权限模式 */
	permission_mode: Type.Optional(Type.Union([
		Type.Literal("acceptEdits"),
		Type.Literal("bypassPermissions"),
		Type.Literal("default"),
		Type.Literal("delegate"),
		Type.Literal("dontAsk"),
		Type.Literal("plan")
	], { description: "Permission mode", default: "dontAsk" })),
	/** 是否禁用会话持久化 */
	no_session_persistence: Type.Optional(Type.Boolean({ description: "Disable session persistence", default: true })),
	/** 最大预算（美元） */
	max_budget_usd: Type.Optional(Type.Number({ description: "Maximum dollar amount to spend on API calls" })),
	/** 超时时间（毫秒） */
	timeout_ms: Type.Optional(Type.Number({ description: "Execution timeout in milliseconds", default: 300000 })),
});

/** Claude 执行请求 TypeScript 类型 */
export type ClaudeRequest = Static<typeof ClaudeRequestSchema>;

/**
 * Claude 执行响应 Schema
 */
export const ClaudeResponseSchema = Type.Object({
	/** 标准输出 */
	stdout: Type.String({ description: "Standard output from Claude execution" }),
	/** 标准错误输出 */
	stderr: Type.String({ description: "Standard error output from Claude execution" }),
	/** 退出码 */
	exit_code: Type.Number({ description: "Exit code (0 = success)" }),
	/** 是否成功 */
	success: Type.Boolean({ description: "Whether execution succeeded" }),
});

/** Claude 执行响应 TypeScript 类型 */
export type ClaudeResponse = Static<typeof ClaudeResponseSchema>;

// ============================================================================
// Claude Action - Token 定义
// ============================================================================

/**
 * Claude 执行令牌
 */
export const CLAUDE_TOKEN: Token<typeof ClaudeRequestSchema, typeof ClaudeResponseSchema> = "claude.execute";

// ============================================================================
// Claude Action - 权限定义
// ============================================================================

/**
 * Claude 执行权限
 */
export const CLAUDE_PERMISSION = "claude:execute";

// ============================================================================
// Claude Action - Action 定义
// ============================================================================

/**
 * Claude 执行 Action
 *
 * 核心能力：调用 Claude CLI 工具执行编码任务。
 *
 * 设计要点：
 * - 使用 spawn 调用 claude 命令
 * - 支持工作目录、模型选择、权限模式等配置
 * - 默认使用 print 模式（非交互式）
 * - 返回执行结果（stdout、stderr、exit_code）
 *
 * 使用方式:
 * const result = await actionExecuter.execute(CLAUDE_TOKEN, {
 *     prompt: 'Write a function to calculate fibonacci numbers in TypeScript',
 *     cwd: '/path/to/project',
 *     model: 'sonnet',
 *     print: true,
 *     permission_mode: 'dontAsk'
 * });
 */
export const claudeAction: Action<typeof ClaudeRequestSchema, typeof ClaudeResponseSchema> = {
	type: CLAUDE_TOKEN,
	description: "Execute coding tasks using Claude CLI tool",
	request: ClaudeRequestSchema,
	response: ClaudeResponseSchema,
	requiredPermissions: [CLAUDE_PERMISSION],
	dependencies: [],
	execute: async (params: ClaudeRequest, injector: Injector): Promise<ClaudeResponse> => {
		return new Promise((resolve, reject) => {
			const shellSessionStore = injector.get(ShellSessionStore);
			const sessionEnv = shellSessionStore.getEnv();

			// 构建 claude 命令参数
			const args: string[] = [];

			if (params.print ?? true) {
				args.push("--print");
			}

			if (params.model) {
				args.push("--model", params.model);
			}

			if (params.output_format) {
				args.push("--output-format", params.output_format);
			}

			if (params.permission_mode) {
				args.push("--permission-mode", params.permission_mode);
			}

			if (params.no_session_persistence ?? true) {
				args.push("--no-session-persistence");
			}

			if (params.max_budget_usd !== undefined) {
				args.push("--max-budget-usd", params.max_budget_usd.toString());
			}

			// 添加 prompt 作为最后一个参数
			args.push(params.prompt);

			// 启动 claude 子进程
			const child = spawn("claude", args, {
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
				reject(new Error(`Failed to spawn claude: ${error.message}`));
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
