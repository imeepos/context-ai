import OpenAI from "openai";
import { Type, type Static } from "@sinclair/typebox";
import type { Injector } from "@context-ai/core";
import type { Action, Token } from "../../tokens.js";
import { ShellSessionStore } from "../../core/shell-session.js";

export const VolcengineDoubaoSeedance15Pro251215RequestSchema = Type.Object({
  "prompt": Type.Optional(Type.String({ "minLength": 1, "maxLength": 2000 })),
  "negative_prompt": Type.Optional(Type.Unknown()),
  "duration": Type.Optional(Type.Integer({ "minimum": 2, "maximum": 12 })),
  "resolution": Type.Optional(Type.Union([Type.Literal("480p"), Type.Literal("720p"), Type.Literal("1080p")])),
  "aspect_ratio": Type.Optional(Type.String()),
  "fps": Type.Optional(Type.Integer({ "minimum": 1, "maximum": 60 })),
  "seed": Type.Optional(Type.Integer({ "minimum": 0 })),
  "image": Type.Optional(Type.Unknown()),
  "image_url": Type.Optional(Type.Unknown()),
  "first_frame": Type.Optional(Type.String()),
  "last_frame": Type.Optional(Type.String()),
  "response_format": Type.Optional(Type.String()),
  "watermark": Type.Optional(Type.Boolean()),
  "user": Type.Optional(Type.String({ "maxLength": 128 }))
}, { "additionalProperties": false });

export type VolcengineDoubaoSeedance15Pro251215Request = Static<typeof VolcengineDoubaoSeedance15Pro251215RequestSchema>;

export const VolcengineDoubaoSeedance15Pro251215ResponseSchema = Type.Object({
	object: Type.Literal("video"),
	model: Type.String({ description: "Model name used" }),
	id: Type.String({ description: "Video task identifier" }),
	status: Type.String({ description: "Video task status" }),
	url: Type.Optional(Type.String({ description: "Video URL when available" })),
	error: Type.Optional(Type.String({ description: "Error message when failed" })),
	raw: Type.Unknown({ description: "Provider raw response payload" }),
});

export type VolcengineDoubaoSeedance15Pro251215Response = Static<typeof VolcengineDoubaoSeedance15Pro251215ResponseSchema>;

export const VOLCENGINE_DOUBAO_SEEDANCE15_PRO251215_TOKEN: Token<typeof VolcengineDoubaoSeedance15Pro251215RequestSchema, typeof VolcengineDoubaoSeedance15Pro251215ResponseSchema> = "bowong.model.volcengine.doubao.seedance.1.5.pro.251215.run";

export const volcengineDoubaoSeedance15Pro251215Action: Action<typeof VolcengineDoubaoSeedance15Pro251215RequestSchema, typeof VolcengineDoubaoSeedance15Pro251215ResponseSchema> = {
	type: VOLCENGINE_DOUBAO_SEEDANCE15_PRO251215_TOKEN,
	description: "Run Bowong model volcengine/doubao-seedance-1-5-pro-251215",
	request: VolcengineDoubaoSeedance15Pro251215RequestSchema,
	response: VolcengineDoubaoSeedance15Pro251215ResponseSchema,
	requiredPermissions: ["bowong:model:invoke"],
	dependencies: [],
	execute: async (params: VolcengineDoubaoSeedance15Pro251215Request, injector: Injector): Promise<VolcengineDoubaoSeedance15Pro251215Response> => {
		const shellSessionStore = injector.get(ShellSessionStore);
		const env = shellSessionStore.getEnv();
		const baseURL = env.BOWONG_BASE_URL ?? env.AI_BASE_URL ?? "https://ai.bowong.cc";
		const apiKey = env.BOWONG_API_KEY ?? env.AI_VIDEO_API_KEY ?? env.API_KEY ?? "";

		if (!apiKey) {
			throw new Error("API key is required. Set BOWONG_API_KEY, AI_VIDEO_API_KEY or API_KEY in shell env.");
		}

		const client = new OpenAI({ baseURL, apiKey });

		const response = await client.videos.create({
			model: "volcengine/doubao-seedance-1-5-pro-251215",
			...(params as any),
		} as any);

		return {
			object: "video",
			model: (response as any).model ?? "volcengine/doubao-seedance-1-5-pro-251215",
			id: String((response as any).id ?? ""),
			status: String((response as any).status ?? "unknown"),
			url: (response as any).url,
			error: (response as any).error ? String((response as any).error) : undefined,
			raw: response,
		};
	},
};
