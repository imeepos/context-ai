import OpenAI from "openai";
import { Type, type Static } from "@sinclair/typebox";
import type { Injector } from "@context-ai/core";
import type { Action, Token } from "../../tokens.js";
import { ShellSessionStore } from "../../core/shell-session.js";

export const GoogleVertexAiGemini31ProPreviewRequestSchema = Type.Object({
  "input": Type.Optional(Type.Union([Type.String({ "minLength": 1 }), Type.Array(Type.Unknown(), { "minItems": 1 })], { "description": "OpenAI Responses input shape." })),
  "instructions": Type.Optional(Type.String({ "description": "OpenAI Responses instructions." })),
  "messages": Type.Optional(Type.Array(Type.Unknown(), { "description": "OpenAI Chat messages.", "minItems": 1 })),
  "stream": Type.Optional(Type.Boolean({ "description": "OpenAI stream flag." })),
  "stream_options": Type.Optional(Type.Object({
  "include_usage": Type.Optional(Type.Boolean({ "description": "OpenAI stream options." }))
}, { "additionalProperties": false })),
  "temperature": Type.Optional(Type.Number({ "description": "OpenAI sampling control.", "minimum": 0, "maximum": 2 })),
  "top_p": Type.Optional(Type.Number({ "description": "OpenAI nucleus sampling.", "minimum": 0, "maximum": 1 })),
  "max_tokens": Type.Optional(Type.Integer({ "description": "OpenAI max_tokens.", "minimum": 1, "maximum": 65536 })),
  "max_completion_tokens": Type.Optional(Type.Integer({ "description": "OpenAI max_completion_tokens.", "minimum": 1, "maximum": 65536 })),
  "max_output_tokens": Type.Optional(Type.Integer({ "description": "OpenAI Responses max_output_tokens.", "minimum": 1, "maximum": 65536 })),
  "stop": Type.Optional(Type.Union([Type.String({ "minLength": 1 }), Type.Array(Type.String(), { "maxItems": 16 })], { "description": "OpenAI stop sequences." })),
  "presence_penalty": Type.Optional(Type.Number({ "description": "OpenAI presence_penalty.", "minimum": -2, "maximum": 2 })),
  "frequency_penalty": Type.Optional(Type.Number({ "description": "OpenAI frequency_penalty.", "minimum": -2, "maximum": 2 })),
  "seed": Type.Optional(Type.Integer({ "description": "OpenAI seed.", "minimum": 0 })),
  "tools": Type.Optional(Type.Array(Type.Unknown(), { "description": "OpenAI tools/function calling." })),
  "tool_choice": Type.Optional(Type.Union([Type.Union([Type.Literal("auto"), Type.Literal("none"), Type.Literal("required")]), Type.Object({}, { additionalProperties: true })], { "description": "OpenAI tool_choice." })),
  "response_format": Type.Optional(Type.Object({}, { additionalProperties: true })),
  "text": Type.Optional(Type.Object({
  "format": Type.Optional(Type.Object({}, { additionalProperties: true })),
  "$schema": Type.Optional(Type.Object({}, { additionalProperties: true }))
})),
  "reasoning": Type.Optional(Type.Object({}, { additionalProperties: true })),
  "extra_body": Type.Optional(Type.Object({
  "thinking": Type.Optional(Type.Object({}, { additionalProperties: true })),
  "thinking_config": Type.Optional(Type.Object({}, { additionalProperties: true })),
  "response_modalities": Type.Optional(Type.Array(Type.Unknown(), { "description": "Gemini generationConfig.responseModalities." })),
  "safety_settings": Type.Optional(Type.Array(Type.Unknown(), { "description": "Gemini safetySettings." })),
  "candidate_count": Type.Optional(Type.Integer({ "description": "Gemini candidateCount.", "minimum": 1, "maximum": 8 }))
}, { "additionalProperties": false })),
  "user": Type.Optional(Type.String({ "description": "OpenAI user field.", "maxLength": 128 }))
}, { "additionalProperties": false });

export type GoogleVertexAiGemini31ProPreviewRequest = Static<typeof GoogleVertexAiGemini31ProPreviewRequestSchema>;

export const GoogleVertexAiGemini31ProPreviewResponseSchema = Type.Object({
	object: Type.Literal("response"),
	model: Type.String({ description: "Model name used" }),
	id: Type.String({ description: "Response identifier" }),
	output_text: Type.String({ description: "Generated text output" }),
	raw: Type.Unknown({ description: "Provider raw response payload" }),
});

export type GoogleVertexAiGemini31ProPreviewResponse = Static<typeof GoogleVertexAiGemini31ProPreviewResponseSchema>;

export const GOOGLE_VERTEX_AI_GEMINI31_PRO_PREVIEW_TOKEN: Token<typeof GoogleVertexAiGemini31ProPreviewRequestSchema, typeof GoogleVertexAiGemini31ProPreviewResponseSchema> = "bowong.model.google.vertex.ai.gemini.3.1.pro.preview.run";

export const googleVertexAiGemini31ProPreviewAction: Action<typeof GoogleVertexAiGemini31ProPreviewRequestSchema, typeof GoogleVertexAiGemini31ProPreviewResponseSchema> = {
	type: GOOGLE_VERTEX_AI_GEMINI31_PRO_PREVIEW_TOKEN,
	description: "Run Bowong model google-vertex-ai/gemini-3.1-pro-preview",
	request: GoogleVertexAiGemini31ProPreviewRequestSchema,
	response: GoogleVertexAiGemini31ProPreviewResponseSchema,
	requiredPermissions: ["bowong:model:invoke"],
	dependencies: [],
	execute: async (params: GoogleVertexAiGemini31ProPreviewRequest, injector: Injector): Promise<GoogleVertexAiGemini31ProPreviewResponse> => {
		const shellSessionStore = injector.get(ShellSessionStore);
		const env = shellSessionStore.getEnv();
		const baseURL = env.BOWONG_BASE_URL ?? env.AI_BASE_URL ?? "https://ai.bowong.cc";
		const apiKey = env.BOWONG_API_KEY ?? env.AI_VIDEO_API_KEY ?? env.API_KEY ?? "";

		if (!apiKey) {
			throw new Error("API key is required. Set BOWONG_API_KEY, AI_VIDEO_API_KEY or API_KEY in shell env.");
		}

		const client = new OpenAI({ baseURL, apiKey });

		const response = await client.responses.create({
			model: "google-vertex-ai/gemini-3.1-pro-preview",
			...(params as any),
			stream: false,
		} as any);

		return {
			object: "response",
			model: (response as any).model ?? "google-vertex-ai/gemini-3.1-pro-preview",
			id: String((response as any).id ?? ""),
			output_text: String((response as any).output_text ?? ""),
			raw: response,
		};
	},
};
