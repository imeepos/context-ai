import OpenAI from "openai";
import { Type, type Static } from "@sinclair/typebox";
import type { Injector } from "@context-ai/core";
import type { Action, Token } from "../../tokens.js";
import { ShellSessionStore } from "../../core/shell-session.js";

export const KieGoogleNanoBanana2RequestSchema = Type.Object({
  "prompt": Type.String({ "description": "Text prompt describing the image to generate." }),
  "extra_body": Type.Optional(Type.Object({
  "image_input": Type.Optional(Type.Array(Type.Unknown(), { "description": "Optional reference image URLs (up to 14)." })),
  "google_search": Type.Optional(Type.Boolean({ "description": "Enable Google Search grounding." })),
  "aspect_ratio": Type.Optional(Type.String({ "description": "Aspect ratio of the generated image." })),
  "resolution": Type.Optional(Type.String({ "description": "Resolution of the generated image." })),
  "output_format": Type.Optional(Type.String({ "description": "Output image format." })),
  "callbackUrl": Type.Optional(Type.String({ "description": "Callback URL for receiving asynchronous task result notifications.", "pattern": "^https?://.+" }))
}, { "additionalProperties": false }))
}, { "additionalProperties": false });

export type KieGoogleNanoBanana2Request = Static<typeof KieGoogleNanoBanana2RequestSchema>;

export const KieGoogleNanoBanana2ResponseSchema = Type.Object({
	object: Type.Literal("image"),
	model: Type.String({ description: "Model name used" }),
	id: Type.String({ description: "Image response identifier" }),
	data: Type.Array(Type.Unknown(), { description: "Raw image data entries" }),
	raw: Type.Unknown({ description: "Provider raw response payload" }),
});

export type KieGoogleNanoBanana2Response = Static<typeof KieGoogleNanoBanana2ResponseSchema>;

export const KIE_GOOGLE_NANO_BANANA2_TOKEN: Token<typeof KieGoogleNanoBanana2RequestSchema, typeof KieGoogleNanoBanana2ResponseSchema> = "bowong.model.kie.google.nano.banana.2.run";

export const kieGoogleNanoBanana2Action: Action<typeof KieGoogleNanoBanana2RequestSchema, typeof KieGoogleNanoBanana2ResponseSchema> = {
	type: KIE_GOOGLE_NANO_BANANA2_TOKEN,
	description: "Run Bowong model kie/google-nano-banana-2",
	request: KieGoogleNanoBanana2RequestSchema,
	response: KieGoogleNanoBanana2ResponseSchema,
	requiredPermissions: ["bowong:model:invoke"],
	dependencies: [],
	execute: async (params: KieGoogleNanoBanana2Request, injector: Injector): Promise<KieGoogleNanoBanana2Response> => {
		const shellSessionStore = injector.get(ShellSessionStore);
		const env = shellSessionStore.getEnv();
		const baseURL = env.BOWONG_BASE_URL ?? env.AI_BASE_URL ?? "https://ai.bowong.cc";
		const apiKey = env.BOWONG_API_KEY ?? env.AI_VIDEO_API_KEY ?? env.API_KEY ?? "";

		if (!apiKey) {
			throw new Error("API key is required. Set BOWONG_API_KEY, AI_VIDEO_API_KEY or API_KEY in shell env.");
		}

		const client = new OpenAI({ baseURL, apiKey });

		const response = await client.images.generate({
			model: "kie/google-nano-banana-2",
			...(params as any),
		} as any);

		return {
			object: "image",
			model: "kie/google-nano-banana-2",
			id: String((response as any).created ?? ""),
			data: ((response as any).data ?? []) as unknown[],
			raw: response,
		};
	},
};
