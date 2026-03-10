import OpenAI from "openai";
import { Type, type Static } from "@sinclair/typebox";
import type { Injector } from "@context-ai/core";
import type { Action, Token } from "../../tokens.js";
import { ShellSessionStore } from "../../core/shell-session.js";

export const KieKling26MotionControlRequestSchema = Type.Object({
  "prompt": Type.Optional(Type.String({ "description": "Optional prompt describing expected motion result." })),
  "extra_body": Type.Object({
  "input_urls": Type.Array(Type.Unknown(), { "description": "KIE input.input_urls. Source image URL for the subject.", "maxItems": 1 }),
  "video_urls": Type.Array(Type.Unknown(), { "description": "KIE input.video_urls. Motion reference video URL.", "maxItems": 1 }),
  "mode": Type.String({ "description": "KIE input.mode. Output resolution mode." }),
  "character_orientation": Type.String({ "description": "KIE input.character_orientation. Character orientation mode (image or video)." }),
  "callbackUrl": Type.Optional(Type.String({ "description": "Callback URL for receiving asynchronous task result notifications.", "pattern": "^https?://.+" }))
}, { "additionalProperties": false })
}, { "additionalProperties": false });

export type KieKling26MotionControlRequest = Static<typeof KieKling26MotionControlRequestSchema>;

export const KieKling26MotionControlResponseSchema = Type.Object({
	object: Type.Literal("video"),
	model: Type.String({ description: "Model name used" }),
	id: Type.String({ description: "Video task identifier" }),
	status: Type.String({ description: "Video task status" }),
	url: Type.Optional(Type.String({ description: "Video URL when available" })),
	error: Type.Optional(Type.String({ description: "Error message when failed" })),
	raw: Type.Unknown({ description: "Provider raw response payload" }),
});

export type KieKling26MotionControlResponse = Static<typeof KieKling26MotionControlResponseSchema>;

export const KIE_KLING26_MOTION_CONTROL_TOKEN: Token<typeof KieKling26MotionControlRequestSchema, typeof KieKling26MotionControlResponseSchema> = "bowong.model.kie.kling.2.6.motion.control.run";

export const kieKling26MotionControlAction: Action<typeof KieKling26MotionControlRequestSchema, typeof KieKling26MotionControlResponseSchema> = {
	type: KIE_KLING26_MOTION_CONTROL_TOKEN,
	description: "Run Bowong model kie/kling-2.6/motion-control",
	request: KieKling26MotionControlRequestSchema,
	response: KieKling26MotionControlResponseSchema,
	requiredPermissions: ["bowong:model:invoke"],
	dependencies: [],
	execute: async (params: KieKling26MotionControlRequest, injector: Injector): Promise<KieKling26MotionControlResponse> => {
		const shellSessionStore = injector.get(ShellSessionStore);
		const env = shellSessionStore.getEnv();
		const baseURL = env.BOWONG_BASE_URL ?? env.AI_BASE_URL ?? "https://ai.bowong.cc";
		const apiKey = env.BOWONG_API_KEY ?? env.AI_VIDEO_API_KEY ?? env.API_KEY ?? "";

		if (!apiKey) {
			throw new Error("API key is required. Set BOWONG_API_KEY, AI_VIDEO_API_KEY or API_KEY in shell env.");
		}

		const client = new OpenAI({ baseURL, apiKey });

		const response = await client.videos.create({
			model: "kie/kling-2.6/motion-control",
			...(params as any),
		} as any);

		return {
			object: "video",
			model: (response as any).model ?? "kie/kling-2.6/motion-control",
			id: String((response as any).id ?? ""),
			status: String((response as any).status ?? "unknown"),
			url: (response as any).url,
			error: (response as any).error ? String((response as any).error) : undefined,
			raw: response,
		};
	},
};
