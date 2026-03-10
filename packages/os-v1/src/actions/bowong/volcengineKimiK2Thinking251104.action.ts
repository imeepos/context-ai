import OpenAI from "openai";
import { Type, type Static } from "@sinclair/typebox";
import type { Injector } from "@context-ai/core";
import type { Action, Token } from "../../tokens.js";
import { ShellSessionStore } from "../../core/shell-session.js";

export const VolcengineKimiK2Thinking251104RequestSchema = Type.Object({
  "messages": Type.Optional(Type.Array(Type.Unknown(), { "minItems": 1 })),
  "stream": Type.Optional(Type.Boolean()),
  "stream_options": Type.Optional(Type.Object({
  "include_usage": Type.Optional(Type.Boolean())
}, { "additionalProperties": false })),
  "temperature": Type.Optional(Type.Number({ "minimum": 0, "maximum": 2 })),
  "top_p": Type.Optional(Type.Number({ "minimum": 0, "maximum": 1 })),
  "max_tokens": Type.Optional(Type.Integer({ "minimum": 1, "maximum": 131072 })),
  "stop": Type.Optional(Type.Array(Type.Unknown(), { "maxItems": 4 })),
  "presence_penalty": Type.Optional(Type.Number({ "minimum": -2, "maximum": 2 })),
  "frequency_penalty": Type.Optional(Type.Number({ "minimum": -2, "maximum": 2 })),
  "tools": Type.Optional(Type.Array(Type.Unknown())),
  "tool_choice": Type.Optional(Type.String()),
  "parallel_tool_calls": Type.Optional(Type.Boolean()),
  "response_format": Type.Optional(Type.Object({}, { additionalProperties: true })),
  "user": Type.Optional(Type.String({ "maxLength": 128 }))
}, { "additionalProperties": false });

export type VolcengineKimiK2Thinking251104Request = Static<typeof VolcengineKimiK2Thinking251104RequestSchema>;

export const VolcengineKimiK2Thinking251104ResponseSchema = Type.Object({
	object: Type.Literal("response"),
	model: Type.String({ description: "Model name used" }),
	id: Type.String({ description: "Response identifier" }),
	output_text: Type.String({ description: "Generated text output" }),
	raw: Type.Unknown({ description: "Provider raw response payload" }),
});

export type VolcengineKimiK2Thinking251104Response = Static<typeof VolcengineKimiK2Thinking251104ResponseSchema>;

export const VOLCENGINE_KIMI_K2_THINKING251104_TOKEN: Token<typeof VolcengineKimiK2Thinking251104RequestSchema, typeof VolcengineKimiK2Thinking251104ResponseSchema> = "bowong.model.volcengine.kimi.k2.thinking.251104.run";

export const volcengineKimiK2Thinking251104Action: Action<typeof VolcengineKimiK2Thinking251104RequestSchema, typeof VolcengineKimiK2Thinking251104ResponseSchema> = {
	type: VOLCENGINE_KIMI_K2_THINKING251104_TOKEN,
	description: "Run Bowong model volcengine/kimi-k2-thinking-251104",
	request: VolcengineKimiK2Thinking251104RequestSchema,
	response: VolcengineKimiK2Thinking251104ResponseSchema,
	requiredPermissions: ["bowong:model:invoke"],
	dependencies: [],
	execute: async (params: VolcengineKimiK2Thinking251104Request, injector: Injector): Promise<VolcengineKimiK2Thinking251104Response> => {
		const shellSessionStore = injector.get(ShellSessionStore);
		const env = shellSessionStore.getEnv();
		const baseURL = env.BOWONG_BASE_URL ?? env.AI_BASE_URL ?? "https://ai.bowong.cc";
		const apiKey = env.BOWONG_API_KEY ?? env.AI_VIDEO_API_KEY ?? env.API_KEY ?? "";

		if (!apiKey) {
			throw new Error("API key is required. Set BOWONG_API_KEY, AI_VIDEO_API_KEY or API_KEY in shell env.");
		}

		const client = new OpenAI({ baseURL, apiKey });

		const response = await client.responses.create({
			model: "volcengine/kimi-k2-thinking-251104",
			...(params as any),
			stream: false,
		} as any);

		return {
			object: "response",
			model: (response as any).model ?? "volcengine/kimi-k2-thinking-251104",
			id: String((response as any).id ?? ""),
			output_text: String((response as any).output_text ?? ""),
			raw: response,
		};
	},
};
