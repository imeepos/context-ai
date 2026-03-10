import OpenAI from "openai";
import { Type, type Static } from "@sinclair/typebox";
import type { Injector } from "@context-ai/core";
import type { Action, Token } from "../../tokens.js";
import { ShellSessionStore } from "../../core/shell-session.js";

export const AzureGpt53ChatRequestSchema = Type.Object({
	"input": Type.Optional(Type.Union([Type.String({ "minLength": 1 }), Type.Array(Type.Unknown(), { "minItems": 1 })], { "description": "OpenAI Responses API input." })),
	"instructions": Type.Optional(Type.String({ "description": "OpenAI Responses API instructions." })),
	"messages": Type.Optional(Type.Array(Type.Unknown(), { "description": "OpenAI Chat Completions messages.", "minItems": 1 })),
	"stream": Type.Optional(Type.Boolean({ "description": "OpenAI stream flag." })),
	"stream_options": Type.Optional(Type.Object({
		"include_usage": Type.Optional(Type.Boolean({ "description": "OpenAI stream_options.include_usage." }))
	}, { "additionalProperties": false })),
	"temperature": Type.Optional(Type.Number({ "description": "OpenAI sampling controls.", "minimum": 0, "maximum": 2 })),
	"top_p": Type.Optional(Type.Number({ "description": "OpenAI nucleus sampling.", "minimum": 0, "maximum": 1 })),
	"max_tokens": Type.Optional(Type.Integer({ "description": "OpenAI token limit.", "minimum": 1, "maximum": 32768 })),
	"max_completion_tokens": Type.Optional(Type.Integer({ "description": "OpenAI max_completion_tokens.", "minimum": 1, "maximum": 32768 })),
	"max_output_tokens": Type.Optional(Type.Integer({ "description": "OpenAI Responses max_output_tokens.", "minimum": 1, "maximum": 32768 })),
	"stop": Type.Optional(Type.Array(Type.Unknown(), { "description": "OpenAI stop sequences.", "maxItems": 4 })),
	"presence_penalty": Type.Optional(Type.Number({ "description": "OpenAI presence_penalty.", "minimum": -2, "maximum": 2 })),
	"frequency_penalty": Type.Optional(Type.Number({ "description": "OpenAI frequency_penalty.", "minimum": -2, "maximum": 2 })),
	"tools": Type.Optional(Type.Array(Type.Unknown(), { "description": "OpenAI tools/function calling." })),
	"tool_choice": Type.Optional(Type.String({ "description": "OpenAI tool_choice." })),
	"parallel_tool_calls": Type.Optional(Type.Boolean({ "description": "OpenAI parallel tool calls toggle." })),
	"response_format": Type.Optional(Type.Object({}, { additionalProperties: true })),
	"text": Type.Optional(Type.Object({
		"format": Type.Optional(Type.Object({}, { additionalProperties: true })),
		"$schema": Type.Optional(Type.Object({}, { additionalProperties: true }))
	})),
	"reasoning": Type.Optional(Type.Object({}, { additionalProperties: true })),
	"user": Type.Optional(Type.String({ "description": "OpenAI end-user identifier.", "maxLength": 128 }))
}, { "additionalProperties": false });

export type AzureGpt53ChatRequest = Static<typeof AzureGpt53ChatRequestSchema>;

export const AzureGpt53ChatResponseSchema = Type.Object({
	object: Type.Literal("response"),
	model: Type.String({ description: "Model name used" }),
	id: Type.String({ description: "Response identifier" }),
	output_text: Type.String({ description: "Generated text output" }),
	raw: Type.Unknown({ description: "Provider raw response payload" }),
});

export type AzureGpt53ChatResponse = Static<typeof AzureGpt53ChatResponseSchema>;

export const AZURE_GPT53_CHAT_TOKEN: Token<typeof AzureGpt53ChatRequestSchema, typeof AzureGpt53ChatResponseSchema> = "bowong.model.azure.gpt.5.3.chat.run";

export const azureGpt53ChatAction: Action<typeof AzureGpt53ChatRequestSchema, typeof AzureGpt53ChatResponseSchema> = {
	type: AZURE_GPT53_CHAT_TOKEN,
	description: "Run Bowong model azure/gpt-5.3-chat",
	request: AzureGpt53ChatRequestSchema,
	response: AzureGpt53ChatResponseSchema,
	requiredPermissions: ["bowong:model:invoke"],
	dependencies: [],
	execute: async (params: AzureGpt53ChatRequest, injector: Injector): Promise<AzureGpt53ChatResponse> => {
		const shellSessionStore = injector.get(ShellSessionStore);
		const env = shellSessionStore.getEnv();
		const baseURL = env.BOWONG_BASE_URL ?? env.AI_BASE_URL ?? "https://ai.bowong.cc";
		const apiKey = env.BOWONG_API_KEY ?? env.AI_VIDEO_API_KEY ?? env.API_KEY ?? "";

		if (!apiKey) {
			throw new Error("API key is required. Set BOWONG_API_KEY, AI_VIDEO_API_KEY or API_KEY in shell env. env is: " + JSON.stringify(env) + ` session file is: ${shellSessionStore.sessionFile}`);
		}

		const client = new OpenAI({ baseURL, apiKey });

		const response = await client.responses.create({
			model: "azure/gpt-5.3-chat",
			...(params as any),
			stream: false,
		} as any);

		return {
			object: "response",
			model: (response as any).model ?? "azure/gpt-5.3-chat",
			id: String((response as any).id ?? ""),
			output_text: String((response as any).output_text ?? ""),
			raw: response,
		};
	},
};
