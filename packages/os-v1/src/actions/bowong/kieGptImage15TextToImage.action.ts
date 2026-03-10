import OpenAI from "openai";
import { Type, type Static } from "@sinclair/typebox";
import type { Injector } from "@context-ai/core";
import type { Action, Token } from "../../tokens.js";
import { ShellSessionStore } from "../../core/shell-session.js";

export const KieGptImage15TextToImageRequestSchema = Type.Object({
  "prompt": Type.String({ "description": "Text description of the image to generate." }),
  "extra_body": Type.Object({
  "aspect_ratio": Type.String({ "description": "Width-height ratio for the generated image." }),
  "quality": Type.String({ "description": "Generation quality level." }),
  "callbackUrl": Type.Optional(Type.String({ "description": "Callback URL for receiving asynchronous task result notifications.", "pattern": "^https?://.+" }))
}, { "additionalProperties": false })
}, { "additionalProperties": false });

export type KieGptImage15TextToImageRequest = Static<typeof KieGptImage15TextToImageRequestSchema>;

export const KieGptImage15TextToImageResponseSchema = Type.Object({
	object: Type.Literal("image"),
	model: Type.String({ description: "Model name used" }),
	id: Type.String({ description: "Image response identifier" }),
	data: Type.Array(Type.Unknown(), { description: "Raw image data entries" }),
	raw: Type.Unknown({ description: "Provider raw response payload" }),
});

export type KieGptImage15TextToImageResponse = Static<typeof KieGptImage15TextToImageResponseSchema>;

export const KIE_GPT_IMAGE15_TEXT_TO_IMAGE_TOKEN: Token<typeof KieGptImage15TextToImageRequestSchema, typeof KieGptImage15TextToImageResponseSchema> = "bowong.model.kie.gpt.image.1.5.text.to.image.run";

export const kieGptImage15TextToImageAction: Action<typeof KieGptImage15TextToImageRequestSchema, typeof KieGptImage15TextToImageResponseSchema> = {
	type: KIE_GPT_IMAGE15_TEXT_TO_IMAGE_TOKEN,
	description: "Run Bowong model kie/gpt-image/1.5-text-to-image",
	request: KieGptImage15TextToImageRequestSchema,
	response: KieGptImage15TextToImageResponseSchema,
	requiredPermissions: ["bowong:model:invoke"],
	dependencies: [],
	execute: async (params: KieGptImage15TextToImageRequest, injector: Injector): Promise<KieGptImage15TextToImageResponse> => {
		const shellSessionStore = injector.get(ShellSessionStore);
		const env = shellSessionStore.getEnv();
		const baseURL = env.BOWONG_BASE_URL ?? env.AI_BASE_URL ?? "https://ai.bowong.cc";
		const apiKey = env.BOWONG_API_KEY ?? env.AI_VIDEO_API_KEY ?? env.API_KEY ?? "";

		if (!apiKey) {
			throw new Error("API key is required. Set BOWONG_API_KEY, AI_VIDEO_API_KEY or API_KEY in shell env.");
		}

		const client = new OpenAI({ baseURL, apiKey });

		const response = await client.images.generate({
			model: "kie/gpt-image/1.5-text-to-image",
			...(params as any),
		} as any);

		return {
			object: "image",
			model: "kie/gpt-image/1.5-text-to-image",
			id: String((response as any).created ?? ""),
			data: ((response as any).data ?? []) as unknown[],
			raw: response,
		};
	},
};
