import OpenAI from "openai";
import { Type, type Static } from "@sinclair/typebox";
import type { Injector } from "@context-ai/core";
import type { Action, Token } from "../../tokens.js";
import { ShellSessionStore } from "../../core/shell-session.js";

export const KieMjOmniReferenceRequestSchema = Type.Object({
  "prompt": Type.String(),
  "extra_body": Type.Union([Type.Object({}, { additionalProperties: true }), Type.Object({}, { additionalProperties: true })])
}, { "additionalProperties": false });

export type KieMjOmniReferenceRequest = Static<typeof KieMjOmniReferenceRequestSchema>;

export const KieMjOmniReferenceResponseSchema = Type.Object({
	object: Type.Literal("image"),
	model: Type.String({ description: "Model name used" }),
	id: Type.String({ description: "Image response identifier" }),
	data: Type.Array(Type.Unknown(), { description: "Raw image data entries" }),
	raw: Type.Unknown({ description: "Provider raw response payload" }),
});

export type KieMjOmniReferenceResponse = Static<typeof KieMjOmniReferenceResponseSchema>;

export const KIE_MJ_OMNI_REFERENCE_TOKEN: Token<typeof KieMjOmniReferenceRequestSchema, typeof KieMjOmniReferenceResponseSchema> = "bowong.model.kie.mj.omni.reference.run";

export const kieMjOmniReferenceAction: Action<typeof KieMjOmniReferenceRequestSchema, typeof KieMjOmniReferenceResponseSchema> = {
	type: KIE_MJ_OMNI_REFERENCE_TOKEN,
	description: "Run Bowong model kie/mj/omni-reference",
	request: KieMjOmniReferenceRequestSchema,
	response: KieMjOmniReferenceResponseSchema,
	requiredPermissions: ["bowong:model:invoke"],
	dependencies: [],
	execute: async (params: KieMjOmniReferenceRequest, injector: Injector): Promise<KieMjOmniReferenceResponse> => {
		const shellSessionStore = injector.get(ShellSessionStore);
		const env = shellSessionStore.getEnv();
		const baseURL = env.BOWONG_BASE_URL ?? env.AI_BASE_URL ?? "https://ai.bowong.cc";
		const apiKey = env.BOWONG_API_KEY ?? env.AI_VIDEO_API_KEY ?? env.API_KEY ?? "";

		if (!apiKey) {
			throw new Error("API key is required. Set BOWONG_API_KEY, AI_VIDEO_API_KEY or API_KEY in shell env.");
		}

		const client = new OpenAI({ baseURL, apiKey });

		const response = await client.images.generate({
			model: "kie/mj/omni-reference",
			...(params as any),
		} as any);

		return {
			object: "image",
			model: "kie/mj/omni-reference",
			id: String((response as any).created ?? ""),
			data: ((response as any).data ?? []) as unknown[],
			raw: response,
		};
	},
};
