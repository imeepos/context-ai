import OpenAI from "openai";
import { Type, type Static } from "@sinclair/typebox";
import type { Injector } from "@context-ai/core";
import type { Action, Token } from "../../tokens.js";
import { ShellSessionStore } from "../../core/shell-session.js";

export const KieHailuo23ImageToVideoProRequestSchema = Type.Object({
  "prompt": Type.String({ "description": "Text prompt describing video animation." }),
  "extra_body": Type.Object({
  "image_url": Type.String({ "description": "Input image URL to animate." }),
  "duration": Type.Optional(Type.Union([Type.Integer(), Type.String()], { "description": "Video duration in seconds." })),
  "resolution": Type.Optional(Type.String({ "description": "Video resolution." })),
  "callbackUrl": Type.Optional(Type.String({ "description": "Callback URL for receiving asynchronous task result notifications.", "pattern": "^https?://.+" }))
}, { "additionalProperties": false })
}, { "additionalProperties": false });

export type KieHailuo23ImageToVideoProRequest = Static<typeof KieHailuo23ImageToVideoProRequestSchema>;

export const KieHailuo23ImageToVideoProResponseSchema = Type.Object({
	object: Type.Literal("video"),
	model: Type.String({ description: "Model name used" }),
	id: Type.String({ description: "Video task identifier" }),
	status: Type.String({ description: "Video task status" }),
	url: Type.Optional(Type.String({ description: "Video URL when available" })),
	error: Type.Optional(Type.String({ description: "Error message when failed" })),
	raw: Type.Unknown({ description: "Provider raw response payload" }),
});

export type KieHailuo23ImageToVideoProResponse = Static<typeof KieHailuo23ImageToVideoProResponseSchema>;

export const KIE_HAILUO23_IMAGE_TO_VIDEO_PRO_TOKEN: Token<typeof KieHailuo23ImageToVideoProRequestSchema, typeof KieHailuo23ImageToVideoProResponseSchema> = "bowong.model.kie.hailuo.2.3.image.to.video.pro.run";

export const kieHailuo23ImageToVideoProAction: Action<typeof KieHailuo23ImageToVideoProRequestSchema, typeof KieHailuo23ImageToVideoProResponseSchema> = {
	type: KIE_HAILUO23_IMAGE_TO_VIDEO_PRO_TOKEN,
	description: "Run Bowong model kie/hailuo/2-3-image-to-video-pro",
	request: KieHailuo23ImageToVideoProRequestSchema,
	response: KieHailuo23ImageToVideoProResponseSchema,
	requiredPermissions: ["bowong:model:invoke"],
	dependencies: [],
	execute: async (params: KieHailuo23ImageToVideoProRequest, injector: Injector): Promise<KieHailuo23ImageToVideoProResponse> => {
		const shellSessionStore = injector.get(ShellSessionStore);
		const env = shellSessionStore.getEnv();
		const baseURL = env.BOWONG_BASE_URL ?? env.AI_BASE_URL ?? "https://ai.bowong.cc";
		const apiKey = env.BOWONG_API_KEY ?? env.AI_VIDEO_API_KEY ?? env.API_KEY ?? "";

		if (!apiKey) {
			throw new Error("API key is required. Set BOWONG_API_KEY, AI_VIDEO_API_KEY or API_KEY in shell env.");
		}

		const client = new OpenAI({ baseURL, apiKey });

		const response = await client.videos.create({
			model: "kie/hailuo/2-3-image-to-video-pro",
			...(params as any),
		} as any);

		return {
			object: "video",
			model: (response as any).model ?? "kie/hailuo/2-3-image-to-video-pro",
			id: String((response as any).id ?? ""),
			status: String((response as any).status ?? "unknown"),
			url: (response as any).url,
			error: (response as any).error ? String((response as any).error) : undefined,
			raw: response,
		};
	},
};
