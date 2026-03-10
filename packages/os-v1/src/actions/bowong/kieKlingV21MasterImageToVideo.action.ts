import OpenAI from "openai";
import { Type, type Static } from "@sinclair/typebox";
import type { Injector } from "@context-ai/core";
import type { Action, Token } from "../../tokens.js";
import { ShellSessionStore } from "../../core/shell-session.js";

export const KieKlingV21MasterImageToVideoRequestSchema = Type.Object({
  "prompt": Type.String({ "description": "Text prompt for video generation." }),
  "extra_body": Type.Object({
  "image_url": Type.String({ "description": "Input image URL for image-to-video." }),
  "duration": Type.Optional(Type.Union([Type.Integer(), Type.String()], { "description": "Video duration in seconds." })),
  "negative_prompt": Type.Optional(Type.String({ "description": "Negative prompt to exclude unwanted elements." })),
  "cfg_scale": Type.Optional(Type.Number({ "description": "Classifier-free guidance scale." })),
  "callbackUrl": Type.Optional(Type.String({ "description": "Callback URL for receiving asynchronous task result notifications.", "pattern": "^https?://.+" }))
}, { "additionalProperties": false })
}, { "additionalProperties": false });

export type KieKlingV21MasterImageToVideoRequest = Static<typeof KieKlingV21MasterImageToVideoRequestSchema>;

export const KieKlingV21MasterImageToVideoResponseSchema = Type.Object({
	object: Type.Literal("video"),
	model: Type.String({ description: "Model name used" }),
	id: Type.String({ description: "Video task identifier" }),
	status: Type.String({ description: "Video task status" }),
	url: Type.Optional(Type.String({ description: "Video URL when available" })),
	error: Type.Optional(Type.String({ description: "Error message when failed" })),
	raw: Type.Unknown({ description: "Provider raw response payload" }),
});

export type KieKlingV21MasterImageToVideoResponse = Static<typeof KieKlingV21MasterImageToVideoResponseSchema>;

export const KIE_KLING_V21_MASTER_IMAGE_TO_VIDEO_TOKEN: Token<typeof KieKlingV21MasterImageToVideoRequestSchema, typeof KieKlingV21MasterImageToVideoResponseSchema> = "bowong.model.kie.kling.v2.1.master.image.to.video.run";

export const kieKlingV21MasterImageToVideoAction: Action<typeof KieKlingV21MasterImageToVideoRequestSchema, typeof KieKlingV21MasterImageToVideoResponseSchema> = {
	type: KIE_KLING_V21_MASTER_IMAGE_TO_VIDEO_TOKEN,
	description: "Run Bowong model kie/kling/v2-1-master-image-to-video",
	request: KieKlingV21MasterImageToVideoRequestSchema,
	response: KieKlingV21MasterImageToVideoResponseSchema,
	requiredPermissions: ["bowong:model:invoke"],
	dependencies: [],
	execute: async (params: KieKlingV21MasterImageToVideoRequest, injector: Injector): Promise<KieKlingV21MasterImageToVideoResponse> => {
		const shellSessionStore = injector.get(ShellSessionStore);
		const env = shellSessionStore.getEnv();
		const baseURL = env.BOWONG_BASE_URL ?? env.AI_BASE_URL ?? "https://ai.bowong.cc";
		const apiKey = env.BOWONG_API_KEY ?? env.AI_VIDEO_API_KEY ?? env.API_KEY ?? "";

		if (!apiKey) {
			throw new Error("API key is required. Set BOWONG_API_KEY, AI_VIDEO_API_KEY or API_KEY in shell env.");
		}

		const client = new OpenAI({ baseURL, apiKey });

		const response = await client.videos.create({
			model: "kie/kling/v2-1-master-image-to-video",
			...(params as any),
		} as any);

		return {
			object: "video",
			model: (response as any).model ?? "kie/kling/v2-1-master-image-to-video",
			id: String((response as any).id ?? ""),
			status: String((response as any).status ?? "unknown"),
			url: (response as any).url,
			error: (response as any).error ? String((response as any).error) : undefined,
			raw: response,
		};
	},
};
