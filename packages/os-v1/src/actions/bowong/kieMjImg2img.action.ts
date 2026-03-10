import OpenAI from "openai";
import { Type, type Static } from "@sinclair/typebox";
import type { Injector } from "@context-ai/core";
import type { Action, Token } from "../../tokens.js";
import { ShellSessionStore } from "../../core/shell-session.js";

export const KieMjImg2imgRequestSchema = Type.Object({
  "prompt": Type.String(),
  "extra_body": Type.Union([Type.Object({}, { additionalProperties: true }), Type.Object({}, { additionalProperties: true })])
}, { "additionalProperties": false });

export type KieMjImg2imgRequest = Static<typeof KieMjImg2imgRequestSchema>;

export const KieMjImg2imgResponseSchema = Type.Object({
	object: Type.Literal("image"),
	model: Type.String({ description: "Model name used" }),
	id: Type.String({ description: "Image response identifier" }),
	data: Type.Array(Type.Unknown(), { description: "Raw image data entries" }),
	raw: Type.Unknown({ description: "Provider raw response payload" }),
});

export type KieMjImg2imgResponse = Static<typeof KieMjImg2imgResponseSchema>;

export const KIE_MJ_IMG2IMG_TOKEN: Token<typeof KieMjImg2imgRequestSchema, typeof KieMjImg2imgResponseSchema> = "bowong.model.kie.mj.img2img.run";

export const kieMjImg2imgAction: Action<typeof KieMjImg2imgRequestSchema, typeof KieMjImg2imgResponseSchema> = {
	type: KIE_MJ_IMG2IMG_TOKEN,
	description: "Run Bowong model kie/mj/img2img",
	request: KieMjImg2imgRequestSchema,
	response: KieMjImg2imgResponseSchema,
	requiredPermissions: ["bowong:model:invoke"],
	dependencies: [],
	execute: async (params: KieMjImg2imgRequest, injector: Injector): Promise<KieMjImg2imgResponse> => {
		const shellSessionStore = injector.get(ShellSessionStore);
		const env = shellSessionStore.getEnv();
		const baseURL = env.BOWONG_BASE_URL ?? env.AI_BASE_URL ?? "https://ai.bowong.cc";
		const apiKey = env.BOWONG_API_KEY ?? env.AI_VIDEO_API_KEY ?? env.API_KEY ?? "";

		if (!apiKey) {
			throw new Error("API key is required. Set BOWONG_API_KEY, AI_VIDEO_API_KEY or API_KEY in shell env.");
		}

		const client = new OpenAI({ baseURL, apiKey });

		const response = await client.images.generate({
			model: "kie/mj/img2img",
			...(params as any),
		} as any);

		return {
			object: "image",
			model: "kie/mj/img2img",
			id: String((response as any).created ?? ""),
			data: ((response as any).data ?? []) as unknown[],
			raw: response,
		};
	},
};
