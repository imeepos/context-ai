import OpenAI from "openai";
import { Type, type Static } from "@sinclair/typebox";
import type { Injector } from "@context-ai/core";
import type { Action, Token } from "../../tokens.js";
import { ShellSessionStore } from "../../core/shell-session.js";

export const KieKling30VideoRequestSchema = Type.Object({
  "prompt": Type.Optional(Type.String({ "description": "Text prompt for single-shot generation." })),
  "extra_body": Type.Object({
  "image_urls": Type.Optional(Type.Array(Type.String({ "pattern": "^https?://.+" }), { "description": "KIE input.image_urls. Reference image URLs, supports first-frame and end-frame images.", "minItems": 1, "maxItems": 2 })),
  "sound": Type.Optional(Type.Boolean({ "description": "Whether to generate audio." })),
  "duration": Type.Optional(Type.Union([Type.Integer({ "minimum": 3, "maximum": 15 }), Type.String({ "pattern": "^([3-9]|1[0-5])$" })], { "description": "KIE input.duration. Video duration in seconds, range 3-15." })),
  "aspect_ratio": Type.Optional(Type.Union([Type.Literal("16:9"), Type.Literal("9:16"), Type.Literal("1:1")], { "description": "KIE input.aspect_ratio. Output aspect ratio." })),
  "mode": Type.Union([Type.Literal("std"), Type.Literal("pro")], { "description": "KIE input.mode. Kling 3.0 generation mode." }),
  "multi_shots": Type.Optional(Type.Boolean({ "description": "KIE input.multi_shots. Enable multi-shots mode." })),
  "multi_prompt": Type.Optional(Type.Array(Type.Object({
  "prompt": Type.String(),
  "duration": Type.Union([Type.Integer({ "minimum": 3, "maximum": 15 }), Type.String({ "pattern": "^([3-9]|1[0-5])$" })])
}, { "additionalProperties": false }), { "description": "KIE input.multi_prompt. Timeline segments for multi-shots mode.", "minItems": 2 })),
  "kling_elements": Type.Optional(Type.Array(Type.Object({
  "name": Type.String(),
  "description": Type.Optional(Type.String()),
  "element_input_urls": Type.Optional(Type.Array(Type.String({ "pattern": "^https?://.+" }))),
  "element_input_video_urls": Type.Optional(Type.Array(Type.String({ "pattern": "^https?://.+" })))
}, { "additionalProperties": false }), { "description": "KIE input.kling_elements. Element-level control objects for Kling 3.0." })),
  "callbackUrl": Type.Optional(Type.String({ "description": "Callback URL for receiving asynchronous task result notifications.", "pattern": "^https?://.+" }))
}, { "additionalProperties": false })
}, { "additionalProperties": false });

export type KieKling30VideoRequest = Static<typeof KieKling30VideoRequestSchema>;

export const KieKling30VideoResponseSchema = Type.Object({
	object: Type.Literal("video"),
	model: Type.String({ description: "Model name used" }),
	id: Type.String({ description: "Video task identifier" }),
	status: Type.String({ description: "Video task status" }),
	url: Type.Optional(Type.String({ description: "Video URL when available" })),
	error: Type.Optional(Type.String({ description: "Error message when failed" })),
	raw: Type.Unknown({ description: "Provider raw response payload" }),
});

export type KieKling30VideoResponse = Static<typeof KieKling30VideoResponseSchema>;

export const KIE_KLING30_VIDEO_TOKEN: Token<typeof KieKling30VideoRequestSchema, typeof KieKling30VideoResponseSchema> = "bowong.model.kie.kling.3.0.video.run";

export const kieKling30VideoAction: Action<typeof KieKling30VideoRequestSchema, typeof KieKling30VideoResponseSchema> = {
	type: KIE_KLING30_VIDEO_TOKEN,
	description: "Run Bowong model kie/kling-3.0/video",
	request: KieKling30VideoRequestSchema,
	response: KieKling30VideoResponseSchema,
	requiredPermissions: ["bowong:model:invoke"],
	dependencies: [],
	execute: async (params: KieKling30VideoRequest, injector: Injector): Promise<KieKling30VideoResponse> => {
		const shellSessionStore = injector.get(ShellSessionStore);
		const env = shellSessionStore.getEnv();
		const baseURL = env.BOWONG_BASE_URL ?? env.AI_BASE_URL ?? "https://ai.bowong.cc";
		const apiKey = env.BOWONG_API_KEY ?? env.AI_VIDEO_API_KEY ?? env.API_KEY ?? "";

		if (!apiKey) {
			throw new Error("API key is required. Set BOWONG_API_KEY, AI_VIDEO_API_KEY or API_KEY in shell env.");
		}

		const client = new OpenAI({ baseURL, apiKey });

		const response = await client.videos.create({
			model: "kie/kling-3.0/video",
			...(params as any),
		} as any);

		return {
			object: "video",
			model: (response as any).model ?? "kie/kling-3.0/video",
			id: String((response as any).id ?? ""),
			status: String((response as any).status ?? "unknown"),
			url: (response as any).url,
			error: (response as any).error ? String((response as any).error) : undefined,
			raw: response,
		};
	},
};
