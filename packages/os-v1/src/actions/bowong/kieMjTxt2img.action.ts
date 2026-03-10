import OpenAI from "openai";
import { Type, type Static } from "@sinclair/typebox";
import type { Injector } from "@context-ai/core";
import type { Action, Token } from "../../tokens.js";
import { ShellSessionStore } from "../../core/shell-session.js";

export const KieMjTxt2imgRequestSchema = Type.Object({
  "prompt": Type.String(),
  "extra_body": Type.Optional(Type.Object({
  "speed": Type.Optional(Type.Union([Type.Literal("relaxed"), Type.Literal("fast"), Type.Literal("turbo")])),
  "aspectRatio": Type.Optional(Type.String()),
  "version": Type.Optional(Type.String()),
  "variety": Type.Optional(Type.Number()),
  "stylization": Type.Optional(Type.Number()),
  "weirdness": Type.Optional(Type.Number()),
  "ow": Type.Optional(Type.Boolean()),
  "waterMark": Type.Optional(Type.String()),
  "enableTranslation": Type.Optional(Type.Boolean()),
  "callbackUrl": Type.Optional(Type.String({ "description": "Callback URL for receiving asynchronous task result notifications.", "pattern": "^https?://.+" }))
}, { "additionalProperties": false }))
}, { "additionalProperties": false });

export type KieMjTxt2imgRequest = Static<typeof KieMjTxt2imgRequestSchema>;

export const KieMjTxt2imgResponseSchema = Type.Object({
	object: Type.Literal("image"),
	model: Type.String({ description: "Model name used" }),
	id: Type.String({ description: "Image response identifier" }),
	data: Type.Array(Type.Unknown(), { description: "Raw image data entries" }),
	raw: Type.Unknown({ description: "Provider raw response payload" }),
});

export type KieMjTxt2imgResponse = Static<typeof KieMjTxt2imgResponseSchema>;

export const KIE_MJ_TXT2IMG_TOKEN: Token<typeof KieMjTxt2imgRequestSchema, typeof KieMjTxt2imgResponseSchema> = "bowong.model.kie.mj.txt2img.run";

export const kieMjTxt2imgAction: Action<typeof KieMjTxt2imgRequestSchema, typeof KieMjTxt2imgResponseSchema> = {
	type: KIE_MJ_TXT2IMG_TOKEN,
	description: "Run Bowong model kie/mj/txt2img",
	request: KieMjTxt2imgRequestSchema,
	response: KieMjTxt2imgResponseSchema,
	requiredPermissions: ["bowong:model:invoke"],
	dependencies: [],
	execute: async (params: KieMjTxt2imgRequest, injector: Injector): Promise<KieMjTxt2imgResponse> => {
		const shellSessionStore = injector.get(ShellSessionStore);
		const env = shellSessionStore.getEnv();
		const baseURL = env.BOWONG_BASE_URL ?? env.AI_BASE_URL ?? "https://ai.bowong.cc";
		const apiKey = env.BOWONG_API_KEY ?? env.AI_VIDEO_API_KEY ?? env.API_KEY ?? "";

		if (!apiKey) {
			throw new Error("API key is required. Set BOWONG_API_KEY, AI_VIDEO_API_KEY or API_KEY in shell env.");
		}

		const client = new OpenAI({ baseURL, apiKey });

		const response = await client.images.generate({
			model: "kie/mj/txt2img",
			...(params as any),
		} as any);

		return {
			object: "image",
			model: "kie/mj/txt2img",
			id: String((response as any).created ?? ""),
			data: ((response as any).data ?? []) as unknown[],
			raw: response,
		};
	},
};
