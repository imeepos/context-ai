import { Type, type Static } from "@sinclair/typebox";
import type { Action, Token } from "../tokens.js";
import type { Injector } from "@context-ai/core";
import OpenAI from "openai";
import { ShellSessionStore } from "../core/shell-session.js";

// ============================================================================
// AI Text Generate Action - 请求/响应 Schema 定义
// ============================================================================

/**
 * 输入文本内容 Schema
 */
export const InputTextContentSchema = Type.Object({
	type: Type.Literal("input_text"),
	text: Type.String({ description: "Text content" }),
});

/**
 * 输入图片内容 Schema
 */
export const InputImageContentSchema = Type.Object({
	type: Type.Literal("input_image"),
	image_url: Type.String({ description: "Image URL" }),
	detail: Type.Optional(Type.Union([Type.Literal("low"), Type.Literal("high")], { description: "Image detail level", default: "high" })),
});

/**
 * 输入消息内容 Schema
 */
export const InputMessageContentSchema = Type.Union([InputTextContentSchema, InputImageContentSchema]);

/**
 * 输入消息 Schema
 */
export const InputMessageSchema = Type.Object({
	type: Type.Literal("message"),
	role: Type.Union([Type.Literal("user"), Type.Literal("assistant"), Type.Literal("system")], { description: "Message role" }),
	content: Type.Array(InputMessageContentSchema, { description: "Message content" }),
});

/**
 * AI 文本生成请求 Schema
 */
export const AiTextGenerateRequestSchema = Type.Object({
	/** 模型名称 */
	model: Type.String({ description: "Model name (e.g., google-vertex-ai/gemini-3.1-pro-preview)" }),
	/** 输入内容（字符串或消息数组） */
	input: Type.Union([
		Type.String(),
		Type.Array(InputMessageSchema)
	], { description: "Input text or message array" }),
	/** 系统指令 */
	instructions: Type.Optional(Type.String({ description: "System instructions" })),
	/** 最大输出 token 数 */
	max_output_tokens: Type.Optional(Type.Number({ description: "Maximum output tokens", default: 512 })),
	/** 是否流式输出 */
	stream: Type.Optional(Type.Boolean({ description: "Enable streaming", default: false })),
	/** API 基础 URL */
	base_url: Type.Optional(Type.String({ description: "API base URL", default: "https://ai.bowong.cc" })),
	/** API 密钥 */
	api_key: Type.Optional(Type.String({ description: "API key" })),
});

/** AI 文本生成请求 TypeScript 类型 */
export type AiTextGenerateRequest = Static<typeof AiTextGenerateRequestSchema>;

/**
 * AI 文本生成响应 Schema
 */
export const AiTextGenerateResponseSchema = Type.Object({
	/** 响应 ID */
	id: Type.String({ description: "Response ID" }),
	/** 对象类型 */
	object: Type.Literal("response", { description: "Object type" }),
	/** 模型名称 */
	model: Type.String({ description: "Model name used" }),
	/** 输出文本 */
	output_text: Type.String({ description: "Generated text output" }),
});

/** AI 文本生成响应 TypeScript 类型 */
export type AiTextGenerateResponse = Static<typeof AiTextGenerateResponseSchema>;

// ============================================================================
// AI Text Generate Action - Token 定义
// ============================================================================

/**
 * AI 文本生成令牌
 */
export const AI_TEXT_GENERATE_TOKEN: Token<typeof AiTextGenerateRequestSchema, typeof AiTextGenerateResponseSchema> = "ai.text.generate";

// ============================================================================
// AI Text Generate Action - 权限定义
// ============================================================================

/**
 * AI 文本生成权限
 */
export const AI_TEXT_GENERATE_PERMISSION = "ai:text:generate";

// ============================================================================
// AI Text Generate Action - Action 定义
// ============================================================================

/**
 * AI 文本生成 Action
 *
 * 核心能力：调用 AI 服务生成文本内容。
 *
 * 参考测试文件：packages/ai-video/src/tests/online.responses.test.ts
 *
 * 设计要点：
 * - 使用 OpenAI SDK 调用 responses.create API
 * - 支持纯文本输入和多模态输入（文本+图片）
 * - 支持系统指令（instructions）
 * - 返回生成的文本内容
 *
 * 使用方式:
 * // 纯文本输入
 * const result1 = await actionExecuter.execute(AI_TEXT_GENERATE_TOKEN, {
 *     model: 'google-vertex-ai/gemini-3.1-pro-preview',
 *     input: 'Reply with exactly: online-responses-ok',
 *     instructions: 'You are a strict test assistant. Return plain text only.',
 *     max_output_tokens: 64
 * });
 *
 * // 多模态输入（文本+图片）
 * const result2 = await actionExecuter.execute(AI_TEXT_GENERATE_TOKEN, {
 *     model: 'google-vertex-ai/gemini-3.1-pro-preview',
 *     input: [
 *         {
 *             type: 'message',
 *             role: 'user',
 *             content: [
 *                 { type: 'input_text', text: '请识别这张图里最明显的主体' },
 *                 { type: 'input_image', image_url: 'https://example.com/image.png', detail: 'high' }
 *             ]
 *         }
 *     ],
 *     max_output_tokens: 512
 * });
 */
export const aiTextGenerateAction: Action<typeof AiTextGenerateRequestSchema, typeof AiTextGenerateResponseSchema> = {
	type: AI_TEXT_GENERATE_TOKEN,
	description: "Generate text using AI models via OpenAI-compatible API (supports multimodal input)",
	request: AiTextGenerateRequestSchema,
	response: AiTextGenerateResponseSchema,
	requiredPermissions: [AI_TEXT_GENERATE_PERMISSION],
	dependencies: [],
	execute: async (params: AiTextGenerateRequest, _injector: Injector): Promise<AiTextGenerateResponse> => {
		const shellSessionStore = _injector.get(ShellSessionStore)
		const env = shellSessionStore.getEnv()
		const baseURL = params.base_url ?? "https://ai.bowong.cc";
		const apiKey = params.api_key ?? env.AI_VIDEO_API_KEY ?? env.API_KEY ?? "";

		if (!apiKey) {
			throw new Error("API key is required. Set AI_VIDEO_API_KEY or API_KEY environment variable, or provide api_key in request.");
		}

		const client = new OpenAI({ baseURL, apiKey });

		const response = await client.responses.create({
			model: params.model,
			// @ts-expect-error - 兼容 OpenAI 的第三方服务支持扩展的 input 格式
			input: params.input,
			instructions: params.instructions,
			max_output_tokens: params.max_output_tokens ?? 512,
			stream: false,
		});

		return {
			id: response.id,
			object: "response",
			model: response.model,
			output_text: response.output_text,
		};
	},
};
