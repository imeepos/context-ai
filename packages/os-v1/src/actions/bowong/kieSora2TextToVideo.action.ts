import OpenAI from "openai";
import { Type, type Static } from "@sinclair/typebox";
import type { Injector } from "@context-ai/core";
import type { Action, Token } from "../../tokens.js";
import { ShellSessionStore } from "../../core/shell-session.js";

export const KieSora2TextToVideoRequestSchema = Type.Object({
  "prompt": Type.String({ "description": "Text prompt describing the desired video motion." }),
  "extra_body": Type.Optional(Type.Object({
  "aspect_ratio": Type.Optional(Type.String({ "description": "Video aspect ratio." })),
  "n_frames": Type.Optional(Type.Integer({ "description": "Number of frames to generate." })),
  "remove_watermark": Type.Optional(Type.Boolean({ "description": "Whether to remove watermark from generated video." })),
  "character_id_list": Type.Optional(Type.Array(Type.Unknown(), { "description": "Optional list of Sora character IDs (max 5)." })),
  "callbackUrl": Type.Optional(Type.String({ "description": "Callback URL for receiving asynchronous task result notifications.", "pattern": "^https?://.+" }))
}, { "additionalProperties": false }))
}, { "additionalProperties": false });

export type KieSora2TextToVideoRequest = Static<typeof KieSora2TextToVideoRequestSchema>;

export const KieSora2TextToVideoResponseSchema = Type.Object({
	object: Type.Literal("video"),
	model: Type.String({ description: "Model name used" }),
	id: Type.String({ description: "Video task identifier" }),
	status: Type.String({ description: "Video task status" }),
	url: Type.Optional(Type.String({ description: "Video URL when available" })),
	error: Type.Optional(Type.String({ description: "Error message when failed" })),
	raw: Type.Unknown({ description: "Provider raw response payload" }),
});

export type KieSora2TextToVideoResponse = Static<typeof KieSora2TextToVideoResponseSchema>;

export const KIE_SORA2_TEXT_TO_VIDEO_TOKEN: Token<typeof KieSora2TextToVideoRequestSchema, typeof KieSora2TextToVideoResponseSchema> = "bowong.model.kie.sora.2.text.to.video.run";

export const kieSora2TextToVideoAction: Action<typeof KieSora2TextToVideoRequestSchema, typeof KieSora2TextToVideoResponseSchema> = {
	type: KIE_SORA2_TEXT_TO_VIDEO_TOKEN,
	description: "Run Bowong model kie/sora-2-text-to-video",
	request: KieSora2TextToVideoRequestSchema,
	response: KieSora2TextToVideoResponseSchema,
	requiredPermissions: ["bowong:model:invoke"],
	dependencies: [],
	execute: async (params: KieSora2TextToVideoRequest, injector: Injector): Promise<KieSora2TextToVideoResponse> => {
		const shellSessionStore = injector.get(ShellSessionStore);
		const env = shellSessionStore.getEnv();
		const baseURL = env.BOWONG_BASE_URL ?? env.AI_BASE_URL ?? "https://ai.bowong.cc";
		const apiKey = env.BOWONG_API_KEY ?? env.AI_VIDEO_API_KEY ?? env.API_KEY ?? "";

		if (!apiKey) {
			throw new Error("API key is required. Set BOWONG_API_KEY, AI_VIDEO_API_KEY or API_KEY in shell env.");
		}

		const client = new OpenAI({ baseURL, apiKey });

		const response = await client.videos.create({
			model: "kie/sora-2-text-to-video",
			...(params as any),
		} as any);

		return {
			object: "video",
			model: (response as any).model ?? "kie/sora-2-text-to-video",
			id: String((response as any).id ?? ""),
			status: String((response as any).status ?? "unknown"),
			url: (response as any).url,
			error: (response as any).error ? String((response as any).error) : undefined,
			raw: response,
		};
	},
};
