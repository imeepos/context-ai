import OpenAI from "openai";
import { Type, type Static } from "@sinclair/typebox";
import type { Injector } from "@context-ai/core";
import type { Action, Token } from "../../tokens.js";
import { ShellSessionStore } from "../../core/shell-session.js";

export const KieFlux2ProTextToImageRequestSchema = Type.Object({
  "prompt": Type.String({ "description": "Text prompt describing the image to generate." }),
  "extra_body": Type.Object({
  "aspect_ratio": Type.String({ "description": "Aspect ratio of the generated image." }),
  "resolution": Type.String({ "description": "Output image resolution." }),
  "callbackUrl": Type.Optional(Type.String({ "description": "Callback URL for receiving asynchronous task result notifications.", "pattern": "^https?://.+" }))
}, { "additionalProperties": false })
}, { "additionalProperties": false });

export type KieFlux2ProTextToImageRequest = Static<typeof KieFlux2ProTextToImageRequestSchema>;

export const KieFlux2ProTextToImageResponseSchema = Type.Object({
	object: Type.Literal("image"),
	model: Type.String({ description: "Model name used" }),
	id: Type.String({ description: "Image response identifier" }),
	data: Type.Array(Type.Unknown(), { description: "Raw image data entries" }),
	raw: Type.Unknown({ description: "Provider raw response payload" }),
});

export type KieFlux2ProTextToImageResponse = Static<typeof KieFlux2ProTextToImageResponseSchema>;

export const KIE_FLUX2_PRO_TEXT_TO_IMAGE_TOKEN: Token<typeof KieFlux2ProTextToImageRequestSchema, typeof KieFlux2ProTextToImageResponseSchema> = "bowong.model.kie.flux.2.pro.text.to.image.run";

export const kieFlux2ProTextToImageAction: Action<typeof KieFlux2ProTextToImageRequestSchema, typeof KieFlux2ProTextToImageResponseSchema> = {
	type: KIE_FLUX2_PRO_TEXT_TO_IMAGE_TOKEN,
	description: "Run Bowong model kie/flux-2/pro-text-to-image",
	request: KieFlux2ProTextToImageRequestSchema,
	response: KieFlux2ProTextToImageResponseSchema,
	requiredPermissions: ["bowong:model:invoke"],
	dependencies: [],
	execute: async (params: KieFlux2ProTextToImageRequest, injector: Injector): Promise<KieFlux2ProTextToImageResponse> => {
		const shellSessionStore = injector.get(ShellSessionStore);
		const env = shellSessionStore.getEnv();
		const baseURL = env.BOWONG_BASE_URL ?? env.AI_BASE_URL ?? "https://ai.bowong.cc";
		const apiKey = env.BOWONG_API_KEY ?? env.AI_VIDEO_API_KEY ?? env.API_KEY ?? "";

		if (!apiKey) {
			throw new Error("API key is required. Set BOWONG_API_KEY, AI_VIDEO_API_KEY or API_KEY in shell env.");
		}

		const client = new OpenAI({ baseURL, apiKey });

		const response = await client.images.generate({
			model: "kie/flux-2/pro-text-to-image",
			...(params as any),
		} as any);

		return {
			object: "image",
			model: "kie/flux-2/pro-text-to-image",
			id: String((response as any).created ?? ""),
			data: ((response as any).data ?? []) as unknown[],
			raw: response,
		};
	},
};
