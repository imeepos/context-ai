import OpenAI from "openai";
import { Type, type Static } from "@sinclair/typebox";
import type { Injector } from "@context-ai/core";
import type { Action, Token } from "../../tokens.js";
import { ShellSessionStore } from "../../core/shell-session.js";

export const GoogleVertexAiGemini31FlashImagePreviewRequestSchema = Type.Object({
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

export type GoogleVertexAiGemini31FlashImagePreviewRequest = Static<typeof GoogleVertexAiGemini31FlashImagePreviewRequestSchema>;

export const GoogleVertexAiGemini31FlashImagePreviewResponseSchema = Type.Object({
	object: Type.Literal("image"),
	model: Type.String({ description: "Model name used" }),
	id: Type.String({ description: "Image response identifier" }),
	data: Type.Array(Type.Unknown(), { description: "Raw image data entries" }),
	raw: Type.Unknown({ description: "Provider raw response payload" }),
});

export type GoogleVertexAiGemini31FlashImagePreviewResponse = Static<typeof GoogleVertexAiGemini31FlashImagePreviewResponseSchema>;

export const GOOGLE_VERTEX_AI_GEMINI31_FLASH_IMAGE_PREVIEW_TOKEN: Token<typeof GoogleVertexAiGemini31FlashImagePreviewRequestSchema, typeof GoogleVertexAiGemini31FlashImagePreviewResponseSchema> = "bowong.model.google.vertex.ai.gemini.3.1.flash.image.preview.run";

export const googleVertexAiGemini31FlashImagePreviewAction: Action<typeof GoogleVertexAiGemini31FlashImagePreviewRequestSchema, typeof GoogleVertexAiGemini31FlashImagePreviewResponseSchema> = {
	type: GOOGLE_VERTEX_AI_GEMINI31_FLASH_IMAGE_PREVIEW_TOKEN,
	description: "Run Bowong model google-vertex-ai/gemini-3.1-flash-image-preview",
	request: GoogleVertexAiGemini31FlashImagePreviewRequestSchema,
	response: GoogleVertexAiGemini31FlashImagePreviewResponseSchema,
	requiredPermissions: ["bowong:model:invoke"],
	dependencies: [],
	execute: async (params: GoogleVertexAiGemini31FlashImagePreviewRequest, injector: Injector): Promise<GoogleVertexAiGemini31FlashImagePreviewResponse> => {
		const shellSessionStore = injector.get(ShellSessionStore);
		const env = shellSessionStore.getEnv();
		const baseURL = env.BOWONG_BASE_URL ?? env.AI_BASE_URL ?? "https://ai.bowong.cc";
		const apiKey = env.BOWONG_API_KEY ?? env.AI_VIDEO_API_KEY ?? env.API_KEY ?? "";

		if (!apiKey) {
			throw new Error("API key is required. Set BOWONG_API_KEY, AI_VIDEO_API_KEY or API_KEY in shell env.");
		}

		const client = new OpenAI({ baseURL, apiKey });

		const response = await client.images.generate({
			model: "google-vertex-ai/gemini-3.1-flash-image-preview",
			...(params as any),
		} as any);

		return {
			object: "image",
			model: "google-vertex-ai/gemini-3.1-flash-image-preview",
			id: String((response as any).created ?? ""),
			data: ((response as any).data ?? []) as unknown[],
			raw: response,
		};
	},
};
