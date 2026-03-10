import OpenAI from "openai";
import { Type, type Static } from "@sinclair/typebox";
import type { Injector } from "@context-ai/core";
import type { Action, Token } from "../../tokens.js";
import { ShellSessionStore } from "../../core/shell-session.js";

export const KieMjStyleReferenceRequestSchema = Type.Object({
  "prompt": Type.String(),
  "extra_body": Type.Union([Type.Object({}, { additionalProperties: true }), Type.Object({}, { additionalProperties: true })])
}, { "additionalProperties": false });

export type KieMjStyleReferenceRequest = Static<typeof KieMjStyleReferenceRequestSchema>;

export const KieMjStyleReferenceResponseSchema = Type.Object({
	object: Type.Literal("image"),
	model: Type.String({ description: "Model name used" }),
	id: Type.String({ description: "Image response identifier" }),
	data: Type.Array(Type.Unknown(), { description: "Raw image data entries" }),
	raw: Type.Unknown({ description: "Provider raw response payload" }),
});

export type KieMjStyleReferenceResponse = Static<typeof KieMjStyleReferenceResponseSchema>;

export const KIE_MJ_STYLE_REFERENCE_TOKEN: Token<typeof KieMjStyleReferenceRequestSchema, typeof KieMjStyleReferenceResponseSchema> = "bowong.model.kie.mj.style.reference.run";

export const kieMjStyleReferenceAction: Action<typeof KieMjStyleReferenceRequestSchema, typeof KieMjStyleReferenceResponseSchema> = {
	type: KIE_MJ_STYLE_REFERENCE_TOKEN,
	description: "Run Bowong model kie/mj/style-reference",
	request: KieMjStyleReferenceRequestSchema,
	response: KieMjStyleReferenceResponseSchema,
	requiredPermissions: ["bowong:model:invoke"],
	dependencies: [],
	execute: async (params: KieMjStyleReferenceRequest, injector: Injector): Promise<KieMjStyleReferenceResponse> => {
		const shellSessionStore = injector.get(ShellSessionStore);
		const env = shellSessionStore.getEnv();
		const baseURL = env.BOWONG_BASE_URL ?? env.AI_BASE_URL ?? "https://ai.bowong.cc";
		const apiKey = env.BOWONG_API_KEY ?? env.AI_VIDEO_API_KEY ?? env.API_KEY ?? "";

		if (!apiKey) {
			throw new Error("API key is required. Set BOWONG_API_KEY, AI_VIDEO_API_KEY or API_KEY in shell env.");
		}

		const client = new OpenAI({ baseURL, apiKey });

		const response = await client.images.generate({
			model: "kie/mj/style-reference",
			...(params as any),
		} as any);

		return {
			object: "image",
			model: "kie/mj/style-reference",
			id: String((response as any).created ?? ""),
			data: ((response as any).data ?? []) as unknown[],
			raw: response,
		};
	},
};
