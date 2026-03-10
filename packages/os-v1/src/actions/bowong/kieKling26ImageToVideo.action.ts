import OpenAI from "openai";
import { Type, type Static } from "@sinclair/typebox";
import type { Injector } from "@context-ai/core";
import type { Action, Token } from "../../tokens.js";
import { ShellSessionStore } from "../../core/shell-session.js";

export const KieKling26ImageToVideoRequestSchema = Type.Object({
  "prompt": Type.String({ "description": "Text prompt for video generation." }),
  "extra_body": Type.Object({
  "image_urls": Type.Array(Type.Unknown(), { "description": "KIE input.image_urls. Image URL used for image-to-video.", "maxItems": 1 }),
  "sound": Type.Boolean({ "description": "KIE input.sound. Whether generated video includes sound." }),
  "duration": Type.Union([Type.Integer(), Type.String()], { "description": "KIE input.duration. Video duration in seconds." }),
  "callbackUrl": Type.Optional(Type.String({ "description": "Callback URL for receiving asynchronous task result notifications.", "pattern": "^https?://.+" }))
}, { "additionalProperties": false })
}, { "additionalProperties": false });

export type KieKling26ImageToVideoRequest = Static<typeof KieKling26ImageToVideoRequestSchema>;

export const KieKling26ImageToVideoResponseSchema = Type.Object({
	object: Type.Literal("video"),
	model: Type.String({ description: "Model name used" }),
	id: Type.String({ description: "Video task identifier" }),
	status: Type.String({ description: "Video task status" }),
	url: Type.Optional(Type.String({ description: "Video URL when available" })),
	error: Type.Optional(Type.String({ description: "Error message when failed" })),
	raw: Type.Unknown({ description: "Provider raw response payload" }),
});

export type KieKling26ImageToVideoResponse = Static<typeof KieKling26ImageToVideoResponseSchema>;

export const KIE_KLING26_IMAGE_TO_VIDEO_TOKEN: Token<typeof KieKling26ImageToVideoRequestSchema, typeof KieKling26ImageToVideoResponseSchema> = "bowong.model.kie.kling.2.6.image.to.video.run";

export const kieKling26ImageToVideoAction: Action<typeof KieKling26ImageToVideoRequestSchema, typeof KieKling26ImageToVideoResponseSchema> = {
	type: KIE_KLING26_IMAGE_TO_VIDEO_TOKEN,
	description: "Run Bowong model kie/kling-2.6/image-to-video",
	request: KieKling26ImageToVideoRequestSchema,
	response: KieKling26ImageToVideoResponseSchema,
	requiredPermissions: ["bowong:model:invoke"],
	dependencies: [],
	execute: async (params: KieKling26ImageToVideoRequest, injector: Injector): Promise<KieKling26ImageToVideoResponse> => {
		const shellSessionStore = injector.get(ShellSessionStore);
		const env = shellSessionStore.getEnv();
		const baseURL = env.BOWONG_BASE_URL ?? env.AI_BASE_URL ?? "https://ai.bowong.cc";
		const apiKey = env.BOWONG_API_KEY ?? env.AI_VIDEO_API_KEY ?? env.API_KEY ?? "";

		if (!apiKey) {
			throw new Error("API key is required. Set BOWONG_API_KEY, AI_VIDEO_API_KEY or API_KEY in shell env.");
		}

		const client = new OpenAI({ baseURL, apiKey });

		const response = await client.videos.create({
			model: "kie/kling-2.6/image-to-video",
			...(params as any),
		} as any);

		return {
			object: "video",
			model: (response as any).model ?? "kie/kling-2.6/image-to-video",
			id: String((response as any).id ?? ""),
			status: String((response as any).status ?? "unknown"),
			url: (response as any).url,
			error: (response as any).error ? String((response as any).error) : undefined,
			raw: response,
		};
	},
};
