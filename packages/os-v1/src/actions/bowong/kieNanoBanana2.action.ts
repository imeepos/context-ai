import OpenAI from "openai";
import { Type, type Static } from "@sinclair/typebox";
import type { Injector } from "@context-ai/core";
import type { Action, Token } from "../../tokens.js";
import { ShellSessionStore } from "../../core/shell-session.js";

export const KieNanoBanana2RequestSchema = Type.Object({
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

export type KieNanoBanana2Request = Static<typeof KieNanoBanana2RequestSchema>;

export const KieNanoBanana2ResponseSchema = Type.Object({
	object: Type.Literal("image"),
	model: Type.String({ description: "Model name used" }),
	id: Type.String({ description: "Image response identifier" }),
	data: Type.Array(Type.Unknown(), { description: "Raw image data entries" }),
	raw: Type.Unknown({ description: "Provider raw response payload" }),
});

export type KieNanoBanana2Response = Static<typeof KieNanoBanana2ResponseSchema>;

export const KIE_NANO_BANANA2_TOKEN: Token<typeof KieNanoBanana2RequestSchema, typeof KieNanoBanana2ResponseSchema> = "bowong.model.kie.nano.banana.2.run";

export const kieNanoBanana2Action: Action<typeof KieNanoBanana2RequestSchema, typeof KieNanoBanana2ResponseSchema> = {
	type: KIE_NANO_BANANA2_TOKEN,
	description: "Run Bowong model kie/nano-banana-2",
	request: KieNanoBanana2RequestSchema,
	response: KieNanoBanana2ResponseSchema,
	requiredPermissions: ["bowong:model:invoke"],
	dependencies: [],
	execute: async (params: KieNanoBanana2Request, injector: Injector): Promise<KieNanoBanana2Response> => {
		const shellSessionStore = injector.get(ShellSessionStore);
		const env = shellSessionStore.getEnv();
		const baseURL = env.BOWONG_BASE_URL ?? env.AI_BASE_URL ?? "https://ai.bowong.cc";
		const apiKey = env.BOWONG_API_KEY ?? env.AI_VIDEO_API_KEY ?? env.API_KEY ?? "";

		if (!apiKey) {
			throw new Error("API key is required. Set BOWONG_API_KEY, AI_VIDEO_API_KEY or API_KEY in shell env.");
		}

		const client = new OpenAI({ baseURL, apiKey });

		const response = await client.images.generate({
			model: "kie/nano-banana-2",
			...(params as any),
		} as any);

		return {
			object: "image",
			model: "kie/nano-banana-2",
			id: String((response as any).created ?? ""),
			data: ((response as any).data ?? []) as unknown[],
			raw: response,
		};
	},
};
