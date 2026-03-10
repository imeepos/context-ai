import OpenAI from "openai";
import { Type, type Static } from "@sinclair/typebox";
import type { Injector } from "@context-ai/core";
import type { Action, Token } from "../../tokens.js";
import { ShellSessionStore } from "../../core/shell-session.js";

export const KieGrokImagineImageToImageRequestSchema = Type.Object({
  "prompt": Type.Optional(Type.String({ "description": "Optional text prompt describing the edit direction." })),
  "extra_body": Type.Object({
  "image_urls": Type.Array(Type.Unknown(), { "description": "Reference image URLs (max 1 in KIE docs).", "minItems": 1 }),
  "callbackUrl": Type.Optional(Type.String({ "description": "Callback URL for receiving asynchronous task result notifications.", "pattern": "^https?://.+" }))
}, { "additionalProperties": false })
}, { "additionalProperties": false });

export type KieGrokImagineImageToImageRequest = Static<typeof KieGrokImagineImageToImageRequestSchema>;

export const KieGrokImagineImageToImageResponseSchema = Type.Object({
	object: Type.Literal("image"),
	model: Type.String({ description: "Model name used" }),
	id: Type.String({ description: "Image response identifier" }),
	data: Type.Array(Type.Unknown(), { description: "Raw image data entries" }),
	raw: Type.Unknown({ description: "Provider raw response payload" }),
});

export type KieGrokImagineImageToImageResponse = Static<typeof KieGrokImagineImageToImageResponseSchema>;

export const KIE_GROK_IMAGINE_IMAGE_TO_IMAGE_TOKEN: Token<typeof KieGrokImagineImageToImageRequestSchema, typeof KieGrokImagineImageToImageResponseSchema> = "bowong.model.kie.grok.imagine.image.to.image.run";

export const kieGrokImagineImageToImageAction: Action<typeof KieGrokImagineImageToImageRequestSchema, typeof KieGrokImagineImageToImageResponseSchema> = {
	type: KIE_GROK_IMAGINE_IMAGE_TO_IMAGE_TOKEN,
	description: "Run Bowong model kie/grok-imagine/image-to-image",
	request: KieGrokImagineImageToImageRequestSchema,
	response: KieGrokImagineImageToImageResponseSchema,
	requiredPermissions: ["bowong:model:invoke"],
	dependencies: [],
	execute: async (params: KieGrokImagineImageToImageRequest, injector: Injector): Promise<KieGrokImagineImageToImageResponse> => {
		const shellSessionStore = injector.get(ShellSessionStore);
		const env = shellSessionStore.getEnv();
		const baseURL = env.BOWONG_BASE_URL ?? env.AI_BASE_URL ?? "https://ai.bowong.cc";
		const apiKey = env.BOWONG_API_KEY ?? env.AI_VIDEO_API_KEY ?? env.API_KEY ?? "";

		if (!apiKey) {
			throw new Error("API key is required. Set BOWONG_API_KEY, AI_VIDEO_API_KEY or API_KEY in shell env.");
		}

		const client = new OpenAI({ baseURL, apiKey });

		const response = await client.images.generate({
			model: "kie/grok-imagine/image-to-image",
			...(params as any),
		} as any);

		return {
			object: "image",
			model: "kie/grok-imagine/image-to-image",
			id: String((response as any).created ?? ""),
			data: ((response as any).data ?? []) as unknown[],
			raw: response,
		};
	},
};
