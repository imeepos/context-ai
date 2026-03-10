import OpenAI from "openai";
import { Type, type Static } from "@sinclair/typebox";
import type { Injector } from "@context-ai/core";
import type { Action, Token } from "../../tokens.js";
import { ShellSessionStore } from "../../core/shell-session.js";

export const KieGrokImagineTextToVideoRequestSchema = Type.Object({
  "prompt": Type.String({ "description": "Text prompt describing the desired video motion." }),
  "extra_body": Type.Optional(Type.Object({
  "aspect_ratio": Type.Optional(Type.String({ "description": "Video aspect ratio." })),
  "mode": Type.Optional(Type.String({ "description": "Generation mode." })),
  "duration": Type.Optional(Type.Union([Type.Integer(), Type.String()], { "description": "Video duration in seconds." })),
  "resolution": Type.Optional(Type.String({ "description": "Video resolution." })),
  "callbackUrl": Type.Optional(Type.String({ "description": "Callback URL for receiving asynchronous task result notifications.", "pattern": "^https?://.+" }))
}, { "additionalProperties": false }))
}, { "additionalProperties": false });

export type KieGrokImagineTextToVideoRequest = Static<typeof KieGrokImagineTextToVideoRequestSchema>;

export const KieGrokImagineTextToVideoResponseSchema = Type.Object({
	object: Type.Literal("video"),
	model: Type.String({ description: "Model name used" }),
	id: Type.String({ description: "Video task identifier" }),
	status: Type.String({ description: "Video task status" }),
	url: Type.Optional(Type.String({ description: "Video URL when available" })),
	error: Type.Optional(Type.String({ description: "Error message when failed" })),
	raw: Type.Unknown({ description: "Provider raw response payload" }),
});

export type KieGrokImagineTextToVideoResponse = Static<typeof KieGrokImagineTextToVideoResponseSchema>;

export const KIE_GROK_IMAGINE_TEXT_TO_VIDEO_TOKEN: Token<typeof KieGrokImagineTextToVideoRequestSchema, typeof KieGrokImagineTextToVideoResponseSchema> = "bowong.model.kie.grok.imagine.text.to.video.run";

export const kieGrokImagineTextToVideoAction: Action<typeof KieGrokImagineTextToVideoRequestSchema, typeof KieGrokImagineTextToVideoResponseSchema> = {
	type: KIE_GROK_IMAGINE_TEXT_TO_VIDEO_TOKEN,
	description: "Run Bowong model kie/grok-imagine/text-to-video",
	request: KieGrokImagineTextToVideoRequestSchema,
	response: KieGrokImagineTextToVideoResponseSchema,
	requiredPermissions: ["bowong:model:invoke"],
	dependencies: [],
	execute: async (params: KieGrokImagineTextToVideoRequest, injector: Injector): Promise<KieGrokImagineTextToVideoResponse> => {
		const shellSessionStore = injector.get(ShellSessionStore);
		const env = shellSessionStore.getEnv();
		const baseURL = env.BOWONG_BASE_URL ?? env.AI_BASE_URL ?? "https://ai.bowong.cc";
		const apiKey = env.BOWONG_API_KEY ?? env.AI_VIDEO_API_KEY ?? env.API_KEY ?? "";

		if (!apiKey) {
			throw new Error("API key is required. Set BOWONG_API_KEY, AI_VIDEO_API_KEY or API_KEY in shell env.");
		}

		const client = new OpenAI({ baseURL, apiKey });

		const response = await client.videos.create({
			model: "kie/grok-imagine/text-to-video",
			...(params as any),
		} as any);

		return {
			object: "video",
			model: (response as any).model ?? "kie/grok-imagine/text-to-video",
			id: String((response as any).id ?? ""),
			status: String((response as any).status ?? "unknown"),
			url: (response as any).url,
			error: (response as any).error ? String((response as any).error) : undefined,
			raw: response,
		};
	},
};
