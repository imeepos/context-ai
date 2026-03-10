import OpenAI from "openai";
import { Type, type Static } from "@sinclair/typebox";
import type { Injector } from "@context-ai/core";
import type { Action, Token } from "../../tokens.js";
import { ShellSessionStore } from "../../core/shell-session.js";

export const KieMjVideoRequestSchema = Type.Object({
  "prompt": Type.Optional(Type.String()),
  "extra_body": Type.Union([Type.Object({}, { additionalProperties: true }), Type.Object({}, { additionalProperties: true })])
}, { "additionalProperties": false });

export type KieMjVideoRequest = Static<typeof KieMjVideoRequestSchema>;

export const KieMjVideoResponseSchema = Type.Object({
	object: Type.Literal("video"),
	model: Type.String({ description: "Model name used" }),
	id: Type.String({ description: "Video task identifier" }),
	status: Type.String({ description: "Video task status" }),
	url: Type.Optional(Type.String({ description: "Video URL when available" })),
	error: Type.Optional(Type.String({ description: "Error message when failed" })),
	raw: Type.Unknown({ description: "Provider raw response payload" }),
});

export type KieMjVideoResponse = Static<typeof KieMjVideoResponseSchema>;

export const KIE_MJ_VIDEO_TOKEN: Token<typeof KieMjVideoRequestSchema, typeof KieMjVideoResponseSchema> = "bowong.model.kie.mj.video.run";

export const kieMjVideoAction: Action<typeof KieMjVideoRequestSchema, typeof KieMjVideoResponseSchema> = {
	type: KIE_MJ_VIDEO_TOKEN,
	description: "Run Bowong model kie/mj/video",
	request: KieMjVideoRequestSchema,
	response: KieMjVideoResponseSchema,
	requiredPermissions: ["bowong:model:invoke"],
	dependencies: [],
	execute: async (params: KieMjVideoRequest, injector: Injector): Promise<KieMjVideoResponse> => {
		const shellSessionStore = injector.get(ShellSessionStore);
		const env = shellSessionStore.getEnv();
		const baseURL = env.BOWONG_BASE_URL ?? env.AI_BASE_URL ?? "https://ai.bowong.cc";
		const apiKey = env.BOWONG_API_KEY ?? env.AI_VIDEO_API_KEY ?? env.API_KEY ?? "";

		if (!apiKey) {
			throw new Error("API key is required. Set BOWONG_API_KEY, AI_VIDEO_API_KEY or API_KEY in shell env.");
		}

		const client = new OpenAI({ baseURL, apiKey });

		const response = await client.videos.create({
			model: "kie/mj/video",
			...(params as any),
		} as any);

		return {
			object: "video",
			model: (response as any).model ?? "kie/mj/video",
			id: String((response as any).id ?? ""),
			status: String((response as any).status ?? "unknown"),
			url: (response as any).url,
			error: (response as any).error ? String((response as any).error) : undefined,
			raw: response,
		};
	},
};
