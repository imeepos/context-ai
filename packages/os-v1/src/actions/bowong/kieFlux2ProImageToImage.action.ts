import OpenAI from "openai";
import { Type, type Static } from "@sinclair/typebox";
import type { Injector } from "@context-ai/core";
import type { Action, Token } from "../../tokens.js";
import { ShellSessionStore } from "../../core/shell-session.js";

export const KieFlux2ProImageToImageRequestSchema = Type.Object({
  "extra_body": Type.Object({
  "input_urls": Type.Array(Type.Unknown(), { "description": "Input reference image URLs (up to 8).", "minItems": 1 }),
  "aspect_ratio": Type.String({ "description": "Aspect ratio of the generated image." }),
  "resolution": Type.String({ "description": "Output image resolution." }),
  "callbackUrl": Type.Optional(Type.String({ "description": "Callback URL for receiving asynchronous task result notifications.", "pattern": "^https?://.+" }))
}, { "additionalProperties": false }),
  "prompt": Type.String({ "description": "Text prompt describing the requested edit." })
}, { "additionalProperties": false });

export type KieFlux2ProImageToImageRequest = Static<typeof KieFlux2ProImageToImageRequestSchema>;

export const KieFlux2ProImageToImageResponseSchema = Type.Object({
	object: Type.Literal("image"),
	model: Type.String({ description: "Model name used" }),
	id: Type.String({ description: "Image response identifier" }),
	data: Type.Array(Type.Unknown(), { description: "Raw image data entries" }),
	raw: Type.Unknown({ description: "Provider raw response payload" }),
});

export type KieFlux2ProImageToImageResponse = Static<typeof KieFlux2ProImageToImageResponseSchema>;

export const KIE_FLUX2_PRO_IMAGE_TO_IMAGE_TOKEN: Token<typeof KieFlux2ProImageToImageRequestSchema, typeof KieFlux2ProImageToImageResponseSchema> = "bowong.model.kie.flux.2.pro.image.to.image.run";

export const kieFlux2ProImageToImageAction: Action<typeof KieFlux2ProImageToImageRequestSchema, typeof KieFlux2ProImageToImageResponseSchema> = {
	type: KIE_FLUX2_PRO_IMAGE_TO_IMAGE_TOKEN,
	description: "Run Bowong model kie/flux-2/pro-image-to-image",
	request: KieFlux2ProImageToImageRequestSchema,
	response: KieFlux2ProImageToImageResponseSchema,
	requiredPermissions: ["bowong:model:invoke"],
	dependencies: [],
	execute: async (params: KieFlux2ProImageToImageRequest, injector: Injector): Promise<KieFlux2ProImageToImageResponse> => {
		const shellSessionStore = injector.get(ShellSessionStore);
		const env = shellSessionStore.getEnv();
		const baseURL = env.BOWONG_BASE_URL ?? env.AI_BASE_URL ?? "https://ai.bowong.cc";
		const apiKey = env.BOWONG_API_KEY ?? env.AI_VIDEO_API_KEY ?? env.API_KEY ?? "";

		if (!apiKey) {
			throw new Error("API key is required. Set BOWONG_API_KEY, AI_VIDEO_API_KEY or API_KEY in shell env.");
		}

		const client = new OpenAI({ baseURL, apiKey });

		const response = await client.images.generate({
			model: "kie/flux-2/pro-image-to-image",
			...(params as any),
		} as any);

		return {
			object: "image",
			model: "kie/flux-2/pro-image-to-image",
			id: String((response as any).created ?? ""),
			data: ((response as any).data ?? []) as unknown[],
			raw: response,
		};
	},
};
