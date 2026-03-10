import OpenAI from "openai";
import { Type, type Static } from "@sinclair/typebox";
import type { Injector } from "@context-ai/core";
import type { Action, Token } from "../../tokens.js";
import { ShellSessionStore } from "../../core/shell-session.js";

export const GoogleVertexAiVeo31FastGenerate001RequestSchema = Type.Object({
  "prompt": Type.String({ "description": "OpenAI video prompt.", "minLength": 1, "maxLength": 32768 }),
  "image": Type.Optional(Type.Union([Type.String(), Type.Array(Type.String(), { "minItems": 1 })], { "description": "image/image_url/input_reference alias." })),
  "image_url": Type.Optional(Type.String({ "description": "OpenAI image_url alias.", "pattern": "^https?://.+" })),
  "duration": Type.Optional(Type.Integer({ "description": "video duration.", "minimum": 1, "maximum": 120 })),
  "aspect_ratio": Type.Optional(Type.String({ "description": "video aspect ratio." })),
  "seed": Type.Optional(Type.Integer({ "description": "deterministic seed.", "minimum": 0 })),
  "response_format": Type.Optional(Type.Union([Type.String(), Type.Object({}, { additionalProperties: true })], { "description": "OpenAI response_format(url|b64_json)." })),
  "extra_body": Type.Optional(Type.Object({
  "negative_prompt": Type.Optional(Type.String({ "description": "video negative prompt.", "maxLength": 32768 })),
  "person_generation": Type.Optional(Type.String({ "description": "person generation policy." })),
  "safety_filter_level": Type.Optional(Type.String({ "description": "safety filter level." })),
  "generate_audio": Type.Optional(Type.Boolean({ "description": "generate audio switch." })),
  "enhance_prompt": Type.Optional(Type.Boolean({ "description": "prompt enhancement switch." })),
  "add_watermark": Type.Optional(Type.Boolean({ "description": "output watermark switch." })),
  "include_rai_reason": Type.Optional(Type.Boolean({ "description": "include RAI reason switch." })),
  "storage_uri": Type.Optional(Type.String({ "description": "output GCS URI alias." })),
  "output_gcs_uri": Type.Optional(Type.String({ "description": "output GCS URI." })),
  "reference_images": Type.Optional(Type.Array(Type.String({ "pattern": "^https?://.+" }), { "description": "video reference images.", "minItems": 1, "maxItems": 3 })),
  "watermark": Type.Optional(Type.Boolean({ "description": "watermark alias." }))
}, { "additionalProperties": false })),
  "user": Type.Optional(Type.String({ "description": "OpenAI user field.", "maxLength": 128 }))
}, { "additionalProperties": false });

export type GoogleVertexAiVeo31FastGenerate001Request = Static<typeof GoogleVertexAiVeo31FastGenerate001RequestSchema>;

export const GoogleVertexAiVeo31FastGenerate001ResponseSchema = Type.Object({
	object: Type.Literal("video"),
	model: Type.String({ description: "Model name used" }),
	id: Type.String({ description: "Video task identifier" }),
	status: Type.String({ description: "Video task status" }),
	url: Type.Optional(Type.String({ description: "Video URL when available" })),
	error: Type.Optional(Type.String({ description: "Error message when failed" })),
	raw: Type.Unknown({ description: "Provider raw response payload" }),
});

export type GoogleVertexAiVeo31FastGenerate001Response = Static<typeof GoogleVertexAiVeo31FastGenerate001ResponseSchema>;

export const GOOGLE_VERTEX_AI_VEO31_FAST_GENERATE001_TOKEN: Token<typeof GoogleVertexAiVeo31FastGenerate001RequestSchema, typeof GoogleVertexAiVeo31FastGenerate001ResponseSchema> = "bowong.model.google.vertex.ai.veo.3.1.fast.generate.001.run";

export const googleVertexAiVeo31FastGenerate001Action: Action<typeof GoogleVertexAiVeo31FastGenerate001RequestSchema, typeof GoogleVertexAiVeo31FastGenerate001ResponseSchema> = {
	type: GOOGLE_VERTEX_AI_VEO31_FAST_GENERATE001_TOKEN,
	description: "Run Bowong model google-vertex-ai/veo-3.1-fast-generate-001",
	request: GoogleVertexAiVeo31FastGenerate001RequestSchema,
	response: GoogleVertexAiVeo31FastGenerate001ResponseSchema,
	requiredPermissions: ["bowong:model:invoke"],
	dependencies: [],
	execute: async (params: GoogleVertexAiVeo31FastGenerate001Request, injector: Injector): Promise<GoogleVertexAiVeo31FastGenerate001Response> => {
		const shellSessionStore = injector.get(ShellSessionStore);
		const env = shellSessionStore.getEnv();
		const baseURL = env.BOWONG_BASE_URL ?? env.AI_BASE_URL ?? "https://ai.bowong.cc";
		const apiKey = env.BOWONG_API_KEY ?? env.AI_VIDEO_API_KEY ?? env.API_KEY ?? "";

		if (!apiKey) {
			throw new Error("API key is required. Set BOWONG_API_KEY, AI_VIDEO_API_KEY or API_KEY in shell env.");
		}

		const client = new OpenAI({ baseURL, apiKey });

		const response = await client.videos.create({
			model: "google-vertex-ai/veo-3.1-fast-generate-001",
			...(params as any),
		} as any);

		return {
			object: "video",
			model: (response as any).model ?? "google-vertex-ai/veo-3.1-fast-generate-001",
			id: String((response as any).id ?? ""),
			status: String((response as any).status ?? "unknown"),
			url: (response as any).url,
			error: (response as any).error ? String((response as any).error) : undefined,
			raw: response,
		};
	},
};
