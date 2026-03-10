import OpenAI from "openai";
import { Type, type Static } from "@sinclair/typebox";
import type { Injector } from "@context-ai/core";
import type { Action, Token } from "../../tokens.js";
import { ShellSessionStore } from "../../core/shell-session.js";

export const KieQwenTextToImageRequestSchema = Type.Object({
  "prompt": Type.String(),
  "size": Type.Optional(Type.String()),
  "response_format": Type.Optional(Type.String()),
  "extra_body": Type.Optional(Type.Object({
  "callbackUrl": Type.Optional(Type.String({ "description": "Callback URL for receiving asynchronous task result notifications.", "pattern": "^https?://.+" }))
}, { "additionalProperties": false }))
}, { "additionalProperties": false });

export type KieQwenTextToImageRequest = Static<typeof KieQwenTextToImageRequestSchema>;

export const KieQwenTextToImageResponseSchema = Type.Object({
	object: Type.Literal("image"),
	model: Type.String({ description: "Model name used" }),
	id: Type.String({ description: "Image response identifier" }),
	data: Type.Array(Type.Unknown(), { description: "Raw image data entries" }),
	raw: Type.Unknown({ description: "Provider raw response payload" }),
});

export type KieQwenTextToImageResponse = Static<typeof KieQwenTextToImageResponseSchema>;

export const KIE_QWEN_TEXT_TO_IMAGE_TOKEN: Token<typeof KieQwenTextToImageRequestSchema, typeof KieQwenTextToImageResponseSchema> = "bowong.model.kie.qwen.text.to.image.run";

export const kieQwenTextToImageAction: Action<typeof KieQwenTextToImageRequestSchema, typeof KieQwenTextToImageResponseSchema> = {
	type: KIE_QWEN_TEXT_TO_IMAGE_TOKEN,
	description: "Run Bowong model kie/qwen/text-to-image",
	request: KieQwenTextToImageRequestSchema,
	response: KieQwenTextToImageResponseSchema,
	requiredPermissions: ["bowong:model:invoke"],
	dependencies: [],
	execute: async (params: KieQwenTextToImageRequest, injector: Injector): Promise<KieQwenTextToImageResponse> => {
		const shellSessionStore = injector.get(ShellSessionStore);
		const env = shellSessionStore.getEnv();
		const baseURL = env.BOWONG_BASE_URL ?? env.AI_BASE_URL ?? "https://ai.bowong.cc";
		const apiKey = env.BOWONG_API_KEY ?? env.AI_VIDEO_API_KEY ?? env.API_KEY ?? "";

		if (!apiKey) {
			throw new Error("API key is required. Set BOWONG_API_KEY, AI_VIDEO_API_KEY or API_KEY in shell env.");
		}

		const client = new OpenAI({ baseURL, apiKey });

		const response = await client.images.generate({
			model: "kie/qwen/text-to-image",
			...(params as any),
		} as any);

		return {
			object: "image",
			model: "kie/qwen/text-to-image",
			id: String((response as any).created ?? ""),
			data: ((response as any).data ?? []) as unknown[],
			raw: response,
		};
	},
};
