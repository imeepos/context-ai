import OpenAI from "openai";
import { Type, type Static } from "@sinclair/typebox";
import type { Injector } from "@context-ai/core";
import type { Action, Token } from "../../tokens.js";
import { ShellSessionStore } from "../../core/shell-session.js";

export const VolcengineDeepseekV32251201RequestSchema = Type.Object({
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
  "user": Type.Optional(Type.String({ "maxLength": 128 }))
}, { "additionalProperties": false });

export type VolcengineDeepseekV32251201Request = Static<typeof VolcengineDeepseekV32251201RequestSchema>;

export const VolcengineDeepseekV32251201ResponseSchema = Type.Object({
	object: Type.Literal("response"),
	model: Type.String({ description: "Model name used" }),
	id: Type.String({ description: "Response identifier" }),
	output_text: Type.String({ description: "Generated text output" }),
	raw: Type.Unknown({ description: "Provider raw response payload" }),
});

export type VolcengineDeepseekV32251201Response = Static<typeof VolcengineDeepseekV32251201ResponseSchema>;

export const VOLCENGINE_DEEPSEEK_V32251201_TOKEN: Token<typeof VolcengineDeepseekV32251201RequestSchema, typeof VolcengineDeepseekV32251201ResponseSchema> = "bowong.model.volcengine.deepseek.v3.2.251201.run";

export const volcengineDeepseekV32251201Action: Action<typeof VolcengineDeepseekV32251201RequestSchema, typeof VolcengineDeepseekV32251201ResponseSchema> = {
	type: VOLCENGINE_DEEPSEEK_V32251201_TOKEN,
	description: "Run Bowong model volcengine/deepseek-v3-2-251201",
	request: VolcengineDeepseekV32251201RequestSchema,
	response: VolcengineDeepseekV32251201ResponseSchema,
	requiredPermissions: ["bowong:model:invoke"],
	dependencies: [],
	execute: async (params: VolcengineDeepseekV32251201Request, injector: Injector): Promise<VolcengineDeepseekV32251201Response> => {
		const shellSessionStore = injector.get(ShellSessionStore);
		const env = shellSessionStore.getEnv();
		const baseURL = env.BOWONG_BASE_URL ?? env.AI_BASE_URL ?? "https://ai.bowong.cc";
		const apiKey = env.BOWONG_API_KEY ?? env.AI_VIDEO_API_KEY ?? env.API_KEY ?? "";

		if (!apiKey) {
			throw new Error("API key is required. Set BOWONG_API_KEY, AI_VIDEO_API_KEY or API_KEY in shell env.");
		}

		const client = new OpenAI({ baseURL, apiKey });

		const response = await client.responses.create({
			model: "volcengine/deepseek-v3-2-251201",
			...(params as any),
			stream: false,
		} as any);

		return {
			object: "response",
			model: (response as any).model ?? "volcengine/deepseek-v3-2-251201",
			id: String((response as any).id ?? ""),
			output_text: String((response as any).output_text ?? ""),
			raw: response,
		};
	},
};
