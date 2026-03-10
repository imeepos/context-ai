import OpenAI from "openai";
import { Type, type Static } from "@sinclair/typebox";
import type { Injector } from "@context-ai/core";
import type { Action, Token } from "../../tokens.js";
import { ShellSessionStore } from "../../core/shell-session.js";

export const KieGrokImagineImageToVideoRequestSchema = Type.Object({
  "extra_body": Type.Object({
  "task_id": Type.Optional(Type.String({ "description": "Optional Grok image task ID as source image set." })),
  "image_urls": Type.Array(Type.Unknown(), { "description": "External input image URLs (max 1)." }),
  "mode": Type.Optional(Type.String({ "description": "Generation mode." })),
  "duration": Type.Optional(Type.Union([Type.Integer(), Type.String()], { "description": "Video duration in seconds." })),
  "resolution": Type.Optional(Type.String({ "description": "Video resolution." })),
  "callbackUrl": Type.Optional(Type.String({ "description": "Callback URL for receiving asynchronous task result notifications.", "pattern": "^https?://.+" }))
}, { "additionalProperties": false }),
  "prompt": Type.Optional(Type.String({ "description": "Optional text prompt describing motion." }))
}, { "additionalProperties": false });

export type KieGrokImagineImageToVideoRequest = Static<typeof KieGrokImagineImageToVideoRequestSchema>;

export const KieGrokImagineImageToVideoResponseSchema = Type.Object({
	object: Type.Literal("video"),
	model: Type.String({ description: "Model name used" }),
	id: Type.String({ description: "Video task identifier" }),
	status: Type.String({ description: "Video task status" }),
	url: Type.Optional(Type.String({ description: "Video URL when available" })),
	error: Type.Optional(Type.String({ description: "Error message when failed" })),
	raw: Type.Unknown({ description: "Provider raw response payload" }),
});

export type KieGrokImagineImageToVideoResponse = Static<typeof KieGrokImagineImageToVideoResponseSchema>;

export const KIE_GROK_IMAGINE_IMAGE_TO_VIDEO_TOKEN: Token<typeof KieGrokImagineImageToVideoRequestSchema, typeof KieGrokImagineImageToVideoResponseSchema> = "bowong.model.kie.grok.imagine.image.to.video.run";

export const kieGrokImagineImageToVideoAction: Action<typeof KieGrokImagineImageToVideoRequestSchema, typeof KieGrokImagineImageToVideoResponseSchema> = {
	type: KIE_GROK_IMAGINE_IMAGE_TO_VIDEO_TOKEN,
	description: "Run Bowong model kie/grok-imagine/image-to-video",
	request: KieGrokImagineImageToVideoRequestSchema,
	response: KieGrokImagineImageToVideoResponseSchema,
	requiredPermissions: ["bowong:model:invoke"],
	dependencies: [],
	execute: async (params: KieGrokImagineImageToVideoRequest, injector: Injector): Promise<KieGrokImagineImageToVideoResponse> => {
		const shellSessionStore = injector.get(ShellSessionStore);
		const env = shellSessionStore.getEnv();
		const baseURL = env.BOWONG_BASE_URL ?? env.AI_BASE_URL ?? "https://ai.bowong.cc";
		const apiKey = env.BOWONG_API_KEY ?? env.AI_VIDEO_API_KEY ?? env.API_KEY ?? "";

		if (!apiKey) {
			throw new Error("API key is required. Set BOWONG_API_KEY, AI_VIDEO_API_KEY or API_KEY in shell env.");
		}

		const client = new OpenAI({ baseURL, apiKey });

		const response = await client.videos.create({
			model: "kie/grok-imagine/image-to-video",
			...(params as any),
		} as any);

		return {
			object: "video",
			model: (response as any).model ?? "kie/grok-imagine/image-to-video",
			id: String((response as any).id ?? ""),
			status: String((response as any).status ?? "unknown"),
			url: (response as any).url,
			error: (response as any).error ? String((response as any).error) : undefined,
			raw: response,
		};
	},
};
