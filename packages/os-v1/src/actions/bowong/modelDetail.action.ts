import { Type, type Static } from "@sinclair/typebox";
import type { Injector } from "@context-ai/core";
import { ACTIONS, type Action, type Token } from "../../tokens.js";
import { buildBowongModelCatalog, findBowongModelByName } from "./model-catalog.js";

export const BowongModelDetailRequestSchema = Type.Object({
	modelName: Type.String({ minLength: 1, description: "模型名称或模型 ID" }),
}, { additionalProperties: false });

export type BowongModelDetailRequest = Static<typeof BowongModelDetailRequestSchema>;

export const BowongModelDetailResponseSchema = Type.Object({
	found: Type.Boolean(),
	name: Type.Optional(Type.String()),
	id: Type.Optional(Type.String()),
	token: Type.Optional(Type.String()),
	description: Type.Optional(Type.String()),
	capabilities: Type.Optional(Type.Array(Type.String())),
	scenarios: Type.Optional(Type.Array(Type.String())),
	strengths: Type.Optional(Type.Array(Type.String())),
	requestSchema: Type.Optional(Type.Unknown()),
	responseSchema: Type.Optional(Type.Unknown()),
	error: Type.Optional(Type.String()),
});

export type BowongModelDetailResponse = Static<typeof BowongModelDetailResponseSchema>;

export const BOWONG_MODEL_DETAIL_TOKEN: Token<typeof BowongModelDetailRequestSchema, typeof BowongModelDetailResponseSchema> =
	"bowong.model.detail";

export const bowongModelDetailAction: Action<typeof BowongModelDetailRequestSchema, typeof BowongModelDetailResponseSchema> = {
	type: BOWONG_MODEL_DETAIL_TOKEN,
	description: "Get Bowong model tool detail by model name or id",
	request: BowongModelDetailRequestSchema,
	response: BowongModelDetailResponseSchema,
	requiredPermissions: ["bowong:model:query"],
	dependencies: [],
	execute: async (params: BowongModelDetailRequest, injector: Injector): Promise<BowongModelDetailResponse> => {
		const actions = injector.get<Action<any, any>[]>(ACTIONS, []);
		const catalog = buildBowongModelCatalog(actions);
		const model = findBowongModelByName(catalog, params.modelName);

		if (!model) {
			return {
				found: false,
				error: `Model not found: ${params.modelName}`,
			};
		}

		return {
			found: true,
			name: model.name,
			id: model.id,
			token: model.token,
			description: model.description,
			capabilities: model.capabilities,
			scenarios: model.scenarios,
			strengths: model.strengths,
			requestSchema: model.requestSchema,
			responseSchema: model.responseSchema,
		};
	},
};
