import { Type, type Static } from "@sinclair/typebox";
import type { Action, Token } from "../tokens.js";
import type { Injector } from "@context-ai/core";
import OpenAI from "openai";
import { ShellEnvListRequestSchema } from "./shell-env-list.action.js";
import { ShellSessionStore } from "../core/shell-session.js";

// ============================================================================
// AI Video Generate Action - 请求/响应 Schema 定义
// ============================================================================

/**
 * AI 视频生成请求 Schema
 */
export const AiVideoGenerateRequestSchema = Type.Object({
	/** 模型名称 */
	model: Type.String({ description: "Model name (e.g., google-vertex-ai/veo-3.1-fast-generate-001)" }),
	/** 提示词 */
	prompt: Type.String({ description: "Video generation prompt" }),
	/** 视频时长（秒） */
	seconds: Type.Optional(Type.String({ description: "Video duration in seconds (e.g., '4', '8')", default: "4" })),
	/** 视频尺寸 */
	size: Type.Optional(Type.String({ description: "Video size (e.g., '1280x720', '1920x1080')", default: "1280x720" })),
	/** 参考图片 URL 列表 */
	reference_images: Type.Optional(Type.Array(Type.String(), { description: "Reference image URLs" })),
	/** API 基础 URL */
	base_url: Type.Optional(Type.String({ description: "API base URL", default: "https://ai.bowong.cc" })),
	/** API 密钥 */
	api_key: Type.Optional(Type.String({ description: "API key" })),
});

/** AI 视频生成请求 TypeScript 类型 */
export type AiVideoGenerateRequest = Static<typeof AiVideoGenerateRequestSchema>;

/**
 * AI 视频生成响应 Schema
 */
export const AiVideoGenerateResponseSchema = Type.Object({
	/** 任务 ID */
	id: Type.String({ description: "Video generation task ID" }),
	/** 对象类型 */
	object: Type.Literal("video", { description: "Object type" }),
	/** 模型名称 */
	model: Type.String({ description: "Model name used" }),
	/** 任务状态 */
	status: Type.Union([
		Type.Literal("queued"),
		Type.Literal("in_progress"),
		Type.Literal("completed"),
		Type.Literal("failed")
	], { description: "Task status" }),
	/** 视频 URL（仅在 completed 状态时存在） */
	url: Type.Optional(Type.String({ description: "Video URL (only available when status is completed)" })),
	/** 错误信息（仅在 failed 状态时存在） */
	error: Type.Optional(Type.String({ description: "Error message (only available when status is failed)" })),
});

/** AI 视频生成响应 TypeScript 类型 */
export type AiVideoGenerateResponse = Static<typeof AiVideoGenerateResponseSchema>;

// ============================================================================
// AI Video Retrieve Action - 请求/响应 Schema 定义
// ============================================================================

/**
 * AI 视频查询请求 Schema
 */
export const AiVideoRetrieveRequestSchema = Type.Object({
	/** 任务 ID */
	id: Type.String({ description: "Video generation task ID" }),
	/** API 基础 URL */
	base_url: Type.Optional(Type.String({ description: "API base URL", default: "https://ai.bowong.cc" })),
	/** API 密钥 */
	api_key: Type.Optional(Type.String({ description: "API key" })),
});

/** AI 视频查询请求 TypeScript 类型 */
export type AiVideoRetrieveRequest = Static<typeof AiVideoRetrieveRequestSchema>;

/**
 * AI 视频查询响应 Schema（与生成响应相同）
 */
export const AiVideoRetrieveResponseSchema = AiVideoGenerateResponseSchema;

/** AI 视频查询响应 TypeScript 类型 */
export type AiVideoRetrieveResponse = Static<typeof AiVideoRetrieveResponseSchema>;

// ============================================================================
// AI Video Actions - Token 定义
// ============================================================================

/**
 * AI 视频生成令牌
 */
export const AI_VIDEO_GENERATE_TOKEN: Token<typeof AiVideoGenerateRequestSchema, typeof AiVideoGenerateResponseSchema> = "ai.video.generate";

/**
 * AI 视频查询令牌
 */
export const AI_VIDEO_RETRIEVE_TOKEN: Token<typeof AiVideoRetrieveRequestSchema, typeof AiVideoRetrieveResponseSchema> = "ai.video.retrieve";

// ============================================================================
// AI Video Actions - 权限定义
// ============================================================================

/**
 * AI 视频生成权限
 */
export const AI_VIDEO_GENERATE_PERMISSION = "ai:video:generate";

/**
 * AI 视频查询权限
 */
export const AI_VIDEO_RETRIEVE_PERMISSION = "ai:video:retrieve";

// ============================================================================
// AI Video Generate Action - Action 定义
// ============================================================================

/**
 * AI 视频生成 Action
 *
 * 核心能力：调用 AI 服务生成视频。
 *
 * 参考测试文件：packages/ai-video/src/tests/online.videos.test.ts
 *
 * 设计要点：
 * - 使用 OpenAI SDK 调用 videos.create API
 * - 支持参考图片（reference_images）
 * - 返回任务 ID 和状态
 * - 异步任务，需要通过 retrieve 查询结果
 *
 * 使用方式:
 * const result = await actionExecuter.execute(AI_VIDEO_GENERATE_TOKEN, {
 *     model: 'google-vertex-ai/veo-3.1-fast-generate-001',
 *     prompt: 'A short cinematic shot of ocean waves at sunrise.',
 *     seconds: '4',
 *     size: '1280x720'
 * });
 * console.log(result.id, result.status);
 */
export const aiVideoGenerateAction: Action<typeof AiVideoGenerateRequestSchema, typeof AiVideoGenerateResponseSchema> = {
	type: AI_VIDEO_GENERATE_TOKEN,
	description: "Generate videos using AI models via OpenAI-compatible API",
	request: AiVideoGenerateRequestSchema,
	response: AiVideoGenerateResponseSchema,
	requiredPermissions: [AI_VIDEO_GENERATE_PERMISSION],
	dependencies: [],
	execute: async (params: AiVideoGenerateRequest, _injector: Injector): Promise<AiVideoGenerateResponse> => {
		const shellSessionStore = _injector.get(ShellSessionStore)
		const env = shellSessionStore.getEnv()
		const baseURL = params.base_url ?? "https://ai.bowong.cc";
		const apiKey = params.api_key ?? env.AI_VIDEO_API_KEY ?? env.API_KEY ?? "";

		if (!apiKey) {
			throw new Error("API key is required. Set AI_VIDEO_API_KEY or API_KEY environment variable, or provide api_key in request.");
		}

		const client = new OpenAI({ baseURL, apiKey });

		// 构建 extra_body
		const extraBody: Record<string, unknown> = {};
		if (params.reference_images && params.reference_images.length > 0) {
			extraBody.reference_images = params.reference_images;
		}

		const response = await client.videos.create({
			model: params.model,
			prompt: params.prompt,
			// @ts-expect-error - 兼容 OpenAI 的第三方服务支持更灵活的 seconds 格式
			seconds: params.seconds ?? "4",
			// @ts-expect-error - 兼容 OpenAI 的第三方服务支持更灵活的 size 格式
			size: params.size ?? "1280x720",
			extra_body: Object.keys(extraBody).length > 0 ? extraBody : undefined,
		});

		// 响应类型与标准 OpenAI SDK 不完全匹配
		return {
			id: response.id,
			object: "video",
			model: response.model,
			status: response.status,
			// @ts-expect-error - 第三方服务在响应中包含 url 字段
			url: response.url,
			// @ts-expect-error - 第三方服务返回简单的 error 字符串而非对象
			error: response.error ?? undefined,
		};
	},
};

/**
 * AI 视频查询 Action
 *
 * 核心能力：查询视频生成任务状态。
 *
 * 参考测试文件：packages/ai-video/src/tests/online.videos.test.ts
 *
 * 设计要点：
 * - 使用 OpenAI SDK 调用 videos.retrieve API
 * - 根据任务 ID 查询状态
 * - 返回任务状态和视频 URL（如果已完成）
 *
 * 使用方式:
 * const result = await actionExecuter.execute(AI_VIDEO_RETRIEVE_TOKEN, {
 *     id: 'veo-3.1-fast-generate-001/operations/a96f2f05-e542-4223-82fe-2816d8f86a3c'
 * });
 * console.log(result.status, result.url);
 */
export const aiVideoRetrieveAction: Action<typeof AiVideoRetrieveRequestSchema, typeof AiVideoRetrieveResponseSchema> = {
	type: AI_VIDEO_RETRIEVE_TOKEN,
	description: "Retrieve video generation task status via OpenAI-compatible API",
	request: AiVideoRetrieveRequestSchema,
	response: AiVideoRetrieveResponseSchema,
	requiredPermissions: [AI_VIDEO_RETRIEVE_PERMISSION],
	dependencies: [],
	execute: async (params: AiVideoRetrieveRequest, _injector: Injector): Promise<AiVideoRetrieveResponse> => {
		const baseURL = params.base_url ?? "https://ai.bowong.cc";
		const apiKey = params.api_key ?? process.env.AI_VIDEO_API_KEY ?? process.env.API_KEY ?? "";

		if (!apiKey) {
			throw new Error("API key is required. Set AI_VIDEO_API_KEY or API_KEY environment variable, or provide api_key in request.");
		}

		const client = new OpenAI({ baseURL, apiKey });

		const response = await client.videos.retrieve(params.id);

		return {
			id: response.id,
			object: "video",
			model: response.model,
			status: response.status,
			// @ts-expect-error - 第三方服务在响应中包含 url 字段
			url: response.url,
			// @ts-expect-error - 第三方服务返回简单的 error 字符串而非对象
			error: response.error ?? undefined,
		};
	},
};
