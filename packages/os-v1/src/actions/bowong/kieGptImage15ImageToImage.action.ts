import OpenAI from "openai";
import { Type, type Static } from "@sinclair/typebox";
import type { Injector } from "@context-ai/core";
import type { Action, Token } from "../../tokens.js";
import { ShellSessionStore } from "../../core/shell-session.js";

export const KieGptImage15ImageToImageRequestSchema = Type.Object({
  "extra_body": Type.Object({
  "input_urls": Type.Array(Type.Unknown(), { "description": "Input image URLs used for editing.", "minItems": 1 }),
  "aspect_ratio": Type.String({ "description": "Width-height ratio for the generated image." }),
  "quality": Type.String({ "description": "Generation quality level." }),
  "callbackUrl": Type.Optional(Type.String({ "description": "Callback URL for receiving asynchronous task result notifications.", "pattern": "^https?://.+" }))
}, { "additionalProperties": false }),
  "prompt": Type.String({ "description": "Text description of the desired edit." })
}, { "additionalProperties": false });

export type KieGptImage15ImageToImageRequest = Static<typeof KieGptImage15ImageToImageRequestSchema>;

export const KieGptImage15ImageToImageResponseSchema = Type.Object({
	object: Type.Literal("image"),
	model: Type.String({ description: "Model name used" }),
	id: Type.String({ description: "Image response identifier" }),
	data: Type.Array(Type.Unknown(), { description: "Raw image data entries" }),
	raw: Type.Unknown({ description: "Provider raw response payload" }),
});

export type KieGptImage15ImageToImageResponse = Static<typeof KieGptImage15ImageToImageResponseSchema>;

export const KIE_GPT_IMAGE15_IMAGE_TO_IMAGE_TOKEN: Token<typeof KieGptImage15ImageToImageRequestSchema, typeof KieGptImage15ImageToImageResponseSchema> = "bowong.model.kie.gpt.image.1.5.image.to.image.run";

export const kieGptImage15ImageToImageAction: Action<typeof KieGptImage15ImageToImageRequestSchema, typeof KieGptImage15ImageToImageResponseSchema> = {
	type: KIE_GPT_IMAGE15_IMAGE_TO_IMAGE_TOKEN,
	description: "Run Bowong model kie/gpt-image/1.5-image-to-image",
	request: KieGptImage15ImageToImageRequestSchema,
	response: KieGptImage15ImageToImageResponseSchema,
	requiredPermissions: ["bowong:model:invoke"],
	dependencies: [],
	execute: async (params: KieGptImage15ImageToImageRequest, injector: Injector): Promise<KieGptImage15ImageToImageResponse> => {
		const shellSessionStore = injector.get(ShellSessionStore);
		const env = shellSessionStore.getEnv();
		const baseURL = env.BOWONG_BASE_URL ?? env.AI_BASE_URL ?? "https://ai.bowong.cc";
		const apiKey = env.BOWONG_API_KEY ?? env.AI_VIDEO_API_KEY ?? env.API_KEY ?? "";

		if (!apiKey) {
			throw new Error("API key is required. Set BOWONG_API_KEY, AI_VIDEO_API_KEY or API_KEY in shell env.");
		}

		const client = new OpenAI({ baseURL, apiKey });

		const response = await client.images.generate({
			model: "kie/gpt-image/1.5-image-to-image",
			...(params as any),
		} as any);

		return {
			object: "image",
			model: "kie/gpt-image/1.5-image-to-image",
			id: String((response as any).created ?? ""),
			data: ((response as any).data ?? []) as unknown[],
			raw: response,
		};
	},
};
