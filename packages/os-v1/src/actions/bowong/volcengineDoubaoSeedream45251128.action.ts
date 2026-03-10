import OpenAI from "openai";
import { Type, type Static } from "@sinclair/typebox";
import type { Injector } from "@context-ai/core";
import type { Action, Token } from "../../tokens.js";
import { ShellSessionStore } from "../../core/shell-session.js";

export const VolcengineDoubaoSeedream45251128RequestSchema = Type.Object({
  "prompt": Type.Optional(Type.String({ "minLength": 1, "maxLength": 2000 })),
  "size": Type.Optional(Type.String({ "pattern": "^(1K|2K|3K|4K|[0-9]{3,5}x[0-9]{3,5})$" })),
  "response_format": Type.Optional(Type.Union([Type.Literal("url"), Type.Literal("b64_json")])),
  "image": Type.Optional(Type.Union([Type.String(), Type.Array(Type.Unknown(), { "minItems": 1, "maxItems": 14 })])),
  "stream": Type.Optional(Type.Boolean()),
  "watermark": Type.Optional(Type.Boolean()),
  "sequential_image_generation": Type.Optional(Type.Union([Type.Literal("disabled"), Type.Literal("auto")])),
  "sequential_image_generation_options": Type.Optional(Type.Object({
  "max_images": Type.Optional(Type.Integer({ "minimum": 1, "maximum": 15 }))
}, { "additionalProperties": false })),
  "extra_body": Type.Optional(Type.Object({
  "image": Type.Optional(Type.Union([Type.String(), Type.Array(Type.Unknown(), { "minItems": 1, "maxItems": 14 })])),
  "stream": Type.Optional(Type.Boolean()),
  "watermark": Type.Optional(Type.Boolean()),
  "sequential_image_generation": Type.Optional(Type.Union([Type.Literal("disabled"), Type.Literal("auto")])),
  "sequential_image_generation_options": Type.Optional(Type.Object({
  "max_images": Type.Optional(Type.Integer({ "minimum": 1, "maximum": 15 }))
}, { "additionalProperties": false })),
  "response_format": Type.Optional(Type.Union([Type.Literal("url"), Type.Literal("b64_json")])),
  "size": Type.Optional(Type.String({ "pattern": "^(1K|2K|3K|4K|[0-9]{3,5}x[0-9]{3,5})$" }))
}, { "additionalProperties": false })),
  "user": Type.Optional(Type.String({ "maxLength": 128 }))
}, { "additionalProperties": false });

export type VolcengineDoubaoSeedream45251128Request = Static<typeof VolcengineDoubaoSeedream45251128RequestSchema>;

export const VolcengineDoubaoSeedream45251128ResponseSchema = Type.Object({
	object: Type.Literal("image"),
	model: Type.String({ description: "Model name used" }),
	id: Type.String({ description: "Image response identifier" }),
	data: Type.Array(Type.Unknown(), { description: "Raw image data entries" }),
	raw: Type.Unknown({ description: "Provider raw response payload" }),
});

export type VolcengineDoubaoSeedream45251128Response = Static<typeof VolcengineDoubaoSeedream45251128ResponseSchema>;

export const VOLCENGINE_DOUBAO_SEEDREAM45251128_TOKEN: Token<typeof VolcengineDoubaoSeedream45251128RequestSchema, typeof VolcengineDoubaoSeedream45251128ResponseSchema> = "bowong.model.volcengine.doubao.seedream.4.5.251128.run";

export const volcengineDoubaoSeedream45251128Action: Action<typeof VolcengineDoubaoSeedream45251128RequestSchema, typeof VolcengineDoubaoSeedream45251128ResponseSchema> = {
	type: VOLCENGINE_DOUBAO_SEEDREAM45251128_TOKEN,
	description: "Run Bowong model volcengine/doubao-seedream-4-5-251128",
	request: VolcengineDoubaoSeedream45251128RequestSchema,
	response: VolcengineDoubaoSeedream45251128ResponseSchema,
	requiredPermissions: ["bowong:model:invoke"],
	dependencies: [],
	execute: async (params: VolcengineDoubaoSeedream45251128Request, injector: Injector): Promise<VolcengineDoubaoSeedream45251128Response> => {
		const shellSessionStore = injector.get(ShellSessionStore);
		const env = shellSessionStore.getEnv();
		const baseURL = env.BOWONG_BASE_URL ?? env.AI_BASE_URL ?? "https://ai.bowong.cc";
		const apiKey = env.BOWONG_API_KEY ?? env.AI_VIDEO_API_KEY ?? env.API_KEY ?? "";

		if (!apiKey) {
			throw new Error("API key is required. Set BOWONG_API_KEY, AI_VIDEO_API_KEY or API_KEY in shell env.");
		}

		const client = new OpenAI({ baseURL, apiKey });

		const response = await client.images.generate({
			model: "volcengine/doubao-seedream-4-5-251128",
			...(params as any),
		} as any);

		return {
			object: "image",
			model: "volcengine/doubao-seedream-4-5-251128",
			id: String((response as any).created ?? ""),
			data: ((response as any).data ?? []) as unknown[],
			raw: response,
		};
	},
};
