import OpenAI from "openai";
import { Type, type Static } from "@sinclair/typebox";
import type { Injector } from "@context-ai/core";
import type { Action, Token } from "../../tokens.js";
import { ShellSessionStore } from "../../core/shell-session.js";

export const GoogleVertexAiGemini25FlashImageRequestSchema = Type.Object({
  "prompt": Type.String({ "description": "OpenAI images prompt.", "minLength": 1, "maxLength": 32768 }),
  "n": Type.Optional(Type.Integer({ "description": "OpenAI n.", "minimum": 1, "maximum": 8 })),
  "size": Type.Optional(Type.String({ "description": "OpenAI image size." })),
  "response_format": Type.Optional(Type.Union([Type.Union([Type.Literal("url"), Type.Literal("b64_json")]), Type.Object({}, { additionalProperties: true })], { "description": "OpenAI image response_format(url|b64_json)." })),
  "image": Type.Optional(Type.Union([Type.String(), Type.Array(Type.String(), { "minItems": 1 })], { "description": "optional image input." })),
  "stream": Type.Optional(Type.Boolean({ "description": "OpenAI-style flag (not used by image route)." })),
  "extra_body": Type.Optional(Type.Object({
  "response_modalities": Type.Optional(Type.Array(Type.Unknown(), { "description": "Gemini generationConfig.responseModalities." })),
  "image_config": Type.Optional(Type.Object({
  "aspect_ratio": Type.Optional(Type.String({ "description": "Gemini imageConfig.aspectRatio." })),
  "image_size": Type.Optional(Type.String({ "description": "Gemini imageConfig.imageSize." })),
  "output_mime_type": Type.Optional(Type.Union([Type.Literal("image/png"), Type.Literal("image/jpeg")], { "description": "Imagen outputMimeType / Vertex imageOutputOptions.mimeType." })),
  "output_compression_quality": Type.Optional(Type.Integer({ "description": "output compression quality.", "minimum": 0, "maximum": 100 }))
}, { "description": "image tuning bundle.", "additionalProperties": false })),
  "safety_settings": Type.Optional(Type.Array(Type.Unknown(), { "description": "Gemini safety settings." })),
  "safety_filter_level": Type.Optional(Type.String({ "description": "image safety filter level." })),
  "person_generation": Type.Optional(Type.String({ "description": "person generation policy." })),
  "seed": Type.Optional(Type.Integer({ "description": "deterministic seed.", "minimum": 0 })),
  "reference_images": Type.Optional(Type.Array(Type.String({ "pattern": "^https?://.+" }), { "description": "Gemini image reference inputs (URL).", "minItems": 1, "maxItems": 8 })),
  "output_gcs_uri": Type.Optional(Type.String({ "description": "GCS output URI." }))
}, { "additionalProperties": false })),
  "user": Type.Optional(Type.String({ "description": "OpenAI user field.", "maxLength": 128 }))
}, { "additionalProperties": false });

export type GoogleVertexAiGemini25FlashImageRequest = Static<typeof GoogleVertexAiGemini25FlashImageRequestSchema>;

export const GoogleVertexAiGemini25FlashImageResponseSchema = Type.Object({
	object: Type.Literal("image"),
	model: Type.String({ description: "Model name used" }),
	id: Type.String({ description: "Image response identifier" }),
	data: Type.Array(Type.Unknown(), { description: "Raw image data entries" }),
	raw: Type.Unknown({ description: "Provider raw response payload" }),
});

export type GoogleVertexAiGemini25FlashImageResponse = Static<typeof GoogleVertexAiGemini25FlashImageResponseSchema>;

export const GOOGLE_VERTEX_AI_GEMINI25_FLASH_IMAGE_TOKEN: Token<typeof GoogleVertexAiGemini25FlashImageRequestSchema, typeof GoogleVertexAiGemini25FlashImageResponseSchema> = "bowong.model.google.vertex.ai.gemini.2.5.flash.image.run";

export const googleVertexAiGemini25FlashImageAction: Action<typeof GoogleVertexAiGemini25FlashImageRequestSchema, typeof GoogleVertexAiGemini25FlashImageResponseSchema> = {
	type: GOOGLE_VERTEX_AI_GEMINI25_FLASH_IMAGE_TOKEN,
	description: "Run Bowong model google-vertex-ai/gemini-2.5-flash-image",
	request: GoogleVertexAiGemini25FlashImageRequestSchema,
	response: GoogleVertexAiGemini25FlashImageResponseSchema,
	requiredPermissions: ["bowong:model:invoke"],
	dependencies: [],
	execute: async (params: GoogleVertexAiGemini25FlashImageRequest, injector: Injector): Promise<GoogleVertexAiGemini25FlashImageResponse> => {
		const shellSessionStore = injector.get(ShellSessionStore);
		const env = shellSessionStore.getEnv();
		const baseURL = env.BOWONG_BASE_URL ?? env.AI_BASE_URL ?? "https://ai.bowong.cc";
		const apiKey = env.BOWONG_API_KEY ?? env.AI_VIDEO_API_KEY ?? env.API_KEY ?? "";

		if (!apiKey) {
			throw new Error("API key is required. Set BOWONG_API_KEY, AI_VIDEO_API_KEY or API_KEY in shell env.");
		}

		const client = new OpenAI({ baseURL, apiKey });

		const response = await client.images.generate({
			model: "google-vertex-ai/gemini-2.5-flash-image",
			...(params as any),
		} as any);

		return {
			object: "image",
			model: "google-vertex-ai/gemini-2.5-flash-image",
			id: String((response as any).created ?? ""),
			data: ((response as any).data ?? []) as unknown[],
			raw: response,
		};
	},
};
