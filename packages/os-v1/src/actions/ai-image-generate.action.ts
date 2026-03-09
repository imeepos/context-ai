import { Type, type Static } from "@sinclair/typebox";
import type { Action, Token } from "../tokens.js";
import type { Injector } from "@context-ai/core";
import OpenAI from "openai";
import { ShellSessionStore } from "../core/shell-session.js";

// ============================================================================
// AI Image Generate Action - 请求/响应 Schema 定义
// ============================================================================

/**
 * 图片配置 Schema
 */
export const ImageConfigSchema = Type.Object({
	/** 输出图片格式 */
	output_mime_type: Type.Optional(Type.String({ description: "Output image MIME type (e.g., image/png)" })),
	/** 图片宽高比 */
	aspect_ratio: Type.Optional(Type.String({ description: "Image aspect ratio (e.g., 9:16, 16:9)" })),
	/** 图片尺寸 */
	image_size: Type.Optional(Type.String({ description: "Image size (e.g., 2K, 4K)" })),
});

/**
 * AI 图片生成请求 Schema
 */
export const AiImageGenerateRequestSchema = Type.Object({
	/** 模型名称 */
	model: Type.String({ description: "Model name (e.g., google-vertex-ai/gemini-3.1-flash-image-preview)" }),
	/** 提示词 */
	prompt: Type.String({ description: "Image generation prompt" }),
	/** 生成图片数量 */
	n: Type.Optional(Type.Number({ description: "Number of images to generate", default: 1 })),
	/** 响应格式 */
	response_format: Type.Optional(Type.Union([Type.Literal("url"), Type.Literal("b64_json")], { description: "Response format", default: "url" })),
	/** 参考图片 URL 列表 */
	reference_images: Type.Optional(Type.Array(Type.String(), { description: "Reference image URLs" })),
	/** 图片配置 */
	image_config: Type.Optional(ImageConfigSchema),
	/** API 基础 URL */
	base_url: Type.Optional(Type.String({ description: "API base URL", default: "https://ai.bowong.cc" })),
	/** API 密钥 */
	api_key: Type.Optional(Type.String({ description: "API key" })),
});

/** AI 图片生成请求 TypeScript 类型 */
export type AiImageGenerateRequest = Static<typeof AiImageGenerateRequestSchema>;

/**
 * 图片数据 Schema
 */
export const ImageDataSchema = Type.Object({
	/** Base64 编码的图片数据 */
	b64_json: Type.Optional(Type.String({ description: "Base64 encoded image data" })),
	/** 图片 URL */
	url: Type.Optional(Type.String({ description: "Image URL" })),
});

/**
 * AI 图片生成响应 Schema
 */
export const AiImageGenerateResponseSchema = Type.Object({
	/** 创建时间戳 */
	created: Type.Number({ description: "Creation timestamp" }),
	/** 图片数据列表 */
	data: Type.Array(ImageDataSchema, { description: "Generated images" }),
});

/** AI 图片生成响应 TypeScript 类型 */
export type AiImageGenerateResponse = Static<typeof AiImageGenerateResponseSchema>;

// ============================================================================
// AI Image Generate Action - Token 定义
// ============================================================================

/**
 * AI 图片生成令牌
 */
export const AI_IMAGE_GENERATE_TOKEN: Token<typeof AiImageGenerateRequestSchema, typeof AiImageGenerateResponseSchema> = "ai.image.generate";

// ============================================================================
// AI Image Generate Action - 权限定义
// ============================================================================

/**
 * AI 图片生成权限
 */
export const AI_IMAGE_GENERATE_PERMISSION = "ai:image:generate";

// ============================================================================
// AI Image Generate Action - Action 定义
// ============================================================================

/**
 * AI 图片生成 Action
 *
 * 核心能力：调用 AI 服务生成图片。
 *
 * 参考测试文件：packages/ai-video/src/tests/online.images.test.ts
 *
 * 设计要点：
 * - 使用 OpenAI SDK 调用 images.generate API
 * - 支持参考图片（reference_images）
 * - 支持图片配置（aspect_ratio, image_size, output_mime_type）
 * - 返回图片 URL 或 Base64 数据
 *
 * 使用方式:
 * const result = await actionExecuter.execute(AI_IMAGE_GENERATE_TOKEN, {
 *     model: 'google-vertex-ai/gemini-3.1-flash-image-preview',
 *     prompt: 'A minimal flat icon of a red apple on white background.',
 *     n: 1,
 *     response_format: 'url',
 *     image_config: {
 *         output_mime_type: 'image/png',
 *         aspect_ratio: '9:16',
 *         image_size: '2K'
 *     }
 * });
 */
export const aiImageGenerateAction: Action<typeof AiImageGenerateRequestSchema, typeof AiImageGenerateResponseSchema> = {
	type: AI_IMAGE_GENERATE_TOKEN,
	description: "Generate images using AI models via OpenAI-compatible API",
	request: AiImageGenerateRequestSchema,
	response: AiImageGenerateResponseSchema,
	requiredPermissions: [AI_IMAGE_GENERATE_PERMISSION],
	dependencies: [],
	execute: async (params: AiImageGenerateRequest, _injector: Injector): Promise<AiImageGenerateResponse> => {
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
		if (params.image_config) {
			extraBody.image_config = params.image_config;
		}

		// 使用类型安全的方式调用 OpenAI API
		// extra_body 是 provider 扩展,不在标准类型定义中
		const generateParams = {
			model: params.model,
			prompt: params.prompt,
			n: params.n ?? 1,
			response_format: params.response_format ?? "url",
			...(Object.keys(extraBody).length > 0 ? { extra_body: extraBody } : {}),
		};

		const response = await client.images.generate(generateParams);

		return {
			created: response.created,
			data: (response.data ?? []).map((item: { b64_json?: string; url?: string }) => ({
				b64_json: item.b64_json,
				url: item.url,
			})),
		};
	},
};
