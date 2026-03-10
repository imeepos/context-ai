import OpenAI from "openai";
import { Type, type Static } from "@sinclair/typebox";
import type { Injector } from "@context-ai/core";
import type { Action, Token } from "../../tokens.js";
import { ShellSessionStore } from "../../core/shell-session.js";

export const KieFlux2FlexTextToImageRequestSchema = Type.Object({
  "prompt": Type.String({ "description": "Text prompt describing the image to generate." }),
  "extra_body": Type.Object({
  "aspect_ratio": Type.String({ "description": "Aspect ratio of the generated image." }),
  "resolution": Type.String({ "description": "Output image resolution." }),
  "callbackUrl": Type.Optional(Type.String({ "description": "Callback URL for receiving asynchronous task result notifications.", "pattern": "^https?://.+" }))
}, { "additionalProperties": false })
}, { "additionalProperties": false });

export type KieFlux2FlexTextToImageRequest = Static<typeof KieFlux2FlexTextToImageRequestSchema>;

export const KieFlux2FlexTextToImageResponseSchema = Type.Object({
	object: Type.Literal("image"),
	model: Type.String({ description: "Model name used" }),
	id: Type.String({ description: "Image response identifier" }),
	data: Type.Array(Type.Unknown(), { description: "Raw image data entries" }),
	raw: Type.Unknown({ description: "Provider raw response payload" }),
});

export type KieFlux2FlexTextToImageResponse = Static<typeof KieFlux2FlexTextToImageResponseSchema>;

export const KIE_FLUX2_FLEX_TEXT_TO_IMAGE_TOKEN: Token<typeof KieFlux2FlexTextToImageRequestSchema, typeof KieFlux2FlexTextToImageResponseSchema> = "bowong.model.kie.flux.2.flex.text.to.image.run";

export const kieFlux2FlexTextToImageAction: Action<typeof KieFlux2FlexTextToImageRequestSchema, typeof KieFlux2FlexTextToImageResponseSchema> = {
	type: KIE_FLUX2_FLEX_TEXT_TO_IMAGE_TOKEN,
	description: "Run Bowong model kie/flux-2/flex-text-to-image",
	request: KieFlux2FlexTextToImageRequestSchema,
	response: KieFlux2FlexTextToImageResponseSchema,
	requiredPermissions: ["bowong:model:invoke"],
	dependencies: [],
	execute: async (params: KieFlux2FlexTextToImageRequest, injector: Injector): Promise<KieFlux2FlexTextToImageResponse> => {
		const shellSessionStore = injector.get(ShellSessionStore);
		const env = shellSessionStore.getEnv();
		const baseURL = env.BOWONG_BASE_URL ?? env.AI_BASE_URL ?? "https://ai.bowong.cc";
		const apiKey = env.BOWONG_API_KEY ?? env.AI_VIDEO_API_KEY ?? env.API_KEY ?? "";

		if (!apiKey) {
			throw new Error("API key is required. Set BOWONG_API_KEY, AI_VIDEO_API_KEY or API_KEY in shell env.");
		}

		const client = new OpenAI({ baseURL, apiKey });

		const response = await client.images.generate({
			model: "kie/flux-2/flex-text-to-image",
			...(params as any),
		} as any);

		return {
			object: "image",
			model: "kie/flux-2/flex-text-to-image",
			id: String((response as any).created ?? ""),
			data: ((response as any).data ?? []) as unknown[],
			raw: response,
		};
	},
};
