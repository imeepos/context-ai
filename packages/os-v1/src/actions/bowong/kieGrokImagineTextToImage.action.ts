import OpenAI from "openai";
import { Type, type Static } from "@sinclair/typebox";
import type { Injector } from "@context-ai/core";
import type { Action, Token } from "../../tokens.js";
import { ShellSessionStore } from "../../core/shell-session.js";

export const KieGrokImagineTextToImageRequestSchema = Type.Object({
  "prompt": Type.String({ "description": "Text prompt describing the image to generate." }),
  "extra_body": Type.Object({
  "aspect_ratio": Type.String({ "description": "Aspect ratio of the generated image." }),
  "callbackUrl": Type.Optional(Type.String({ "description": "Callback URL for receiving asynchronous task result notifications.", "pattern": "^https?://.+" }))
}, { "additionalProperties": false })
}, { "additionalProperties": false });

export type KieGrokImagineTextToImageRequest = Static<typeof KieGrokImagineTextToImageRequestSchema>;

export const KieGrokImagineTextToImageResponseSchema = Type.Object({
	object: Type.Literal("image"),
	model: Type.String({ description: "Model name used" }),
	id: Type.String({ description: "Image response identifier" }),
	data: Type.Array(Type.Unknown(), { description: "Raw image data entries" }),
	raw: Type.Unknown({ description: "Provider raw response payload" }),
});

export type KieGrokImagineTextToImageResponse = Static<typeof KieGrokImagineTextToImageResponseSchema>;

export const KIE_GROK_IMAGINE_TEXT_TO_IMAGE_TOKEN: Token<typeof KieGrokImagineTextToImageRequestSchema, typeof KieGrokImagineTextToImageResponseSchema> = "bowong.model.kie.grok.imagine.text.to.image.run";

export const kieGrokImagineTextToImageAction: Action<typeof KieGrokImagineTextToImageRequestSchema, typeof KieGrokImagineTextToImageResponseSchema> = {
	type: KIE_GROK_IMAGINE_TEXT_TO_IMAGE_TOKEN,
	description: "Run Bowong model kie/grok-imagine/text-to-image",
	request: KieGrokImagineTextToImageRequestSchema,
	response: KieGrokImagineTextToImageResponseSchema,
	requiredPermissions: ["bowong:model:invoke"],
	dependencies: [],
	execute: async (params: KieGrokImagineTextToImageRequest, injector: Injector): Promise<KieGrokImagineTextToImageResponse> => {
		const shellSessionStore = injector.get(ShellSessionStore);
		const env = shellSessionStore.getEnv();
		const baseURL = env.BOWONG_BASE_URL ?? env.AI_BASE_URL ?? "https://ai.bowong.cc";
		const apiKey = env.BOWONG_API_KEY ?? env.AI_VIDEO_API_KEY ?? env.API_KEY ?? "";

		if (!apiKey) {
			throw new Error("API key is required. Set BOWONG_API_KEY, AI_VIDEO_API_KEY or API_KEY in shell env.");
		}

		const client = new OpenAI({ baseURL, apiKey });

		const response = await client.images.generate({
			model: "kie/grok-imagine/text-to-image",
			...(params as any),
		} as any);

		return {
			object: "image",
			model: "kie/grok-imagine/text-to-image",
			id: String((response as any).created ?? ""),
			data: ((response as any).data ?? []) as unknown[],
			raw: response,
		};
	},
};
