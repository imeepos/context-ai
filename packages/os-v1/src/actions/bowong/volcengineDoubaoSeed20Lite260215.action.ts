import OpenAI from "openai";
import { Type, type Static } from "@sinclair/typebox";
import type { Injector } from "@context-ai/core";
import type { Action, Token } from "../../tokens.js";
import { ShellSessionStore } from "../../core/shell-session.js";

export const VolcengineDoubaoSeed20Lite260215RequestSchema = Type.Object({
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

export type VolcengineDoubaoSeed20Lite260215Request = Static<typeof VolcengineDoubaoSeed20Lite260215RequestSchema>;

export const VolcengineDoubaoSeed20Lite260215ResponseSchema = Type.Object({
	object: Type.Literal("response"),
	model: Type.String({ description: "Model name used" }),
	id: Type.String({ description: "Response identifier" }),
	output_text: Type.String({ description: "Generated text output" }),
	raw: Type.Unknown({ description: "Provider raw response payload" }),
});

export type VolcengineDoubaoSeed20Lite260215Response = Static<typeof VolcengineDoubaoSeed20Lite260215ResponseSchema>;

export const VOLCENGINE_DOUBAO_SEED20_LITE260215_TOKEN: Token<typeof VolcengineDoubaoSeed20Lite260215RequestSchema, typeof VolcengineDoubaoSeed20Lite260215ResponseSchema> = "bowong.model.volcengine.doubao.seed.2.0.lite.260215.run";

export const volcengineDoubaoSeed20Lite260215Action: Action<typeof VolcengineDoubaoSeed20Lite260215RequestSchema, typeof VolcengineDoubaoSeed20Lite260215ResponseSchema> = {
	type: VOLCENGINE_DOUBAO_SEED20_LITE260215_TOKEN,
	description: "Run Bowong model volcengine/doubao-seed-2-0-lite-260215",
	request: VolcengineDoubaoSeed20Lite260215RequestSchema,
	response: VolcengineDoubaoSeed20Lite260215ResponseSchema,
	requiredPermissions: ["bowong:model:invoke"],
	dependencies: [],
	execute: async (params: VolcengineDoubaoSeed20Lite260215Request, injector: Injector): Promise<VolcengineDoubaoSeed20Lite260215Response> => {
		const shellSessionStore = injector.get(ShellSessionStore);
		const env = shellSessionStore.getEnv();
		const baseURL = env.BOWONG_BASE_URL ?? env.AI_BASE_URL ?? "https://ai.bowong.cc";
		const apiKey = env.BOWONG_API_KEY ?? env.AI_VIDEO_API_KEY ?? env.API_KEY ?? "";

		if (!apiKey) {
			throw new Error("API key is required. Set BOWONG_API_KEY, AI_VIDEO_API_KEY or API_KEY in shell env.");
		}

		const client = new OpenAI({ baseURL, apiKey });

		const response = await client.responses.create({
			model: "volcengine/doubao-seed-2-0-lite-260215",
			...(params as any),
			stream: false,
		} as any);

		return {
			object: "response",
			model: (response as any).model ?? "volcengine/doubao-seed-2-0-lite-260215",
			id: String((response as any).id ?? ""),
			output_text: String((response as any).output_text ?? ""),
			raw: response,
		};
	},
};
