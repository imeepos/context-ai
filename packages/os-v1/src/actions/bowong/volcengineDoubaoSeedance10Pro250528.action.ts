import OpenAI from "openai";
import { Type, type Static } from "@sinclair/typebox";
import type { Injector } from "@context-ai/core";
import type { Action, Token } from "../../tokens.js";
import { ShellSessionStore } from "../../core/shell-session.js";

export const VolcengineDoubaoSeedance10Pro250528RequestSchema = Type.Object({
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

export type VolcengineDoubaoSeedance10Pro250528Request = Static<typeof VolcengineDoubaoSeedance10Pro250528RequestSchema>;

export const VolcengineDoubaoSeedance10Pro250528ResponseSchema = Type.Object({
	object: Type.Literal("video"),
	model: Type.String({ description: "Model name used" }),
	id: Type.String({ description: "Video task identifier" }),
	status: Type.String({ description: "Video task status" }),
	url: Type.Optional(Type.String({ description: "Video URL when available" })),
	error: Type.Optional(Type.String({ description: "Error message when failed" })),
	raw: Type.Unknown({ description: "Provider raw response payload" }),
});

export type VolcengineDoubaoSeedance10Pro250528Response = Static<typeof VolcengineDoubaoSeedance10Pro250528ResponseSchema>;

export const VOLCENGINE_DOUBAO_SEEDANCE10_PRO250528_TOKEN: Token<typeof VolcengineDoubaoSeedance10Pro250528RequestSchema, typeof VolcengineDoubaoSeedance10Pro250528ResponseSchema> = "bowong.model.volcengine.doubao.seedance.1.0.pro.250528.run";

export const volcengineDoubaoSeedance10Pro250528Action: Action<typeof VolcengineDoubaoSeedance10Pro250528RequestSchema, typeof VolcengineDoubaoSeedance10Pro250528ResponseSchema> = {
	type: VOLCENGINE_DOUBAO_SEEDANCE10_PRO250528_TOKEN,
	description: "Run Bowong model volcengine/doubao-seedance-1-0-pro-250528",
	request: VolcengineDoubaoSeedance10Pro250528RequestSchema,
	response: VolcengineDoubaoSeedance10Pro250528ResponseSchema,
	requiredPermissions: ["bowong:model:invoke"],
	dependencies: [],
	execute: async (params: VolcengineDoubaoSeedance10Pro250528Request, injector: Injector): Promise<VolcengineDoubaoSeedance10Pro250528Response> => {
		const shellSessionStore = injector.get(ShellSessionStore);
		const env = shellSessionStore.getEnv();
		const baseURL = env.BOWONG_BASE_URL ?? env.AI_BASE_URL ?? "https://ai.bowong.cc";
		const apiKey = env.BOWONG_API_KEY ?? env.AI_VIDEO_API_KEY ?? env.API_KEY ?? "";

		if (!apiKey) {
			throw new Error("API key is required. Set BOWONG_API_KEY, AI_VIDEO_API_KEY or API_KEY in shell env.");
		}

		const client = new OpenAI({ baseURL, apiKey });

		const response = await client.videos.create({
			model: "volcengine/doubao-seedance-1-0-pro-250528",
			...(params as any),
		} as any);

		return {
			object: "video",
			model: (response as any).model ?? "volcengine/doubao-seedance-1-0-pro-250528",
			id: String((response as any).id ?? ""),
			status: String((response as any).status ?? "unknown"),
			url: (response as any).url,
			error: (response as any).error ? String((response as any).error) : undefined,
			raw: response,
		};
	},
};
