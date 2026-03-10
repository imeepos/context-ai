import { Type, type Static } from "@sinclair/typebox";
import type { Injector } from "@context-ai/core";
import { ACTIONS, type Action, type Token } from "../../tokens.js";
import { buildBowongModelCatalog, type BowongModelCapability } from "./model-catalog.js";

export const BowongModelListRequestSchema = Type.Object({
	keywords: Type.Optional(Type.String({ description: "关键词，按名称或模型 ID 过滤" })),
	capability: Type.Optional(Type.Union([
		Type.Literal("text"),
		Type.Literal("image"),
		Type.Literal("video"),
	], { description: "按能力过滤" })),
	limit: Type.Optional(Type.Integer({ minimum: 1, maximum: 200, description: "限制返回数量" })),
}, { additionalProperties: false });

export type BowongModelListRequest = Static<typeof BowongModelListRequestSchema>;

export const BowongModelListResponseSchema = Type.Object({
	total: Type.Integer({ description: "过滤后模型总数" }),
	data: Type.Array(Type.Object({
		name: Type.String(),
		id: Type.String(),
		token: Type.String(),
		description: Type.String(),
		capabilities: Type.Array(Type.String()),
		scenarios: Type.Array(Type.String()),
		strengths: Type.Array(Type.String()),
	}), { description: "模型列表" }),
});

export type BowongModelListResponse = Static<typeof BowongModelListResponseSchema>;

export const BOWONG_MODEL_LIST_TOKEN: Token<typeof BowongModelListRequestSchema, typeof BowongModelListResponseSchema> =
	"bowong.model.list";

export const bowongModelListAction: Action<typeof BowongModelListRequestSchema, typeof BowongModelListResponseSchema> = {
	type: BOWONG_MODEL_LIST_TOKEN,
	description: "List all Bowong models with id/name/capability/scenario/strength metadata",
	request: BowongModelListRequestSchema,
	response: BowongModelListResponseSchema,
	requiredPermissions: ["bowong:model:query"],
	dependencies: [],
	execute: async (params: BowongModelListRequest, injector: Injector): Promise<BowongModelListResponse> => {
		const actions = injector.get<Action<any, any>[]>(ACTIONS, []);
		const catalog = buildBowongModelCatalog(actions);
		const keyword = params.keywords?.toLowerCase().trim();
		const capability = params.capability as BowongModelCapability | undefined;

		const filtered = catalog.filter((item) => {
			if (capability && !item.capabilities.includes(capability)) {
				return false;
			}
			if (!keyword) {
				return true;
			}
			return (
				item.id.toLowerCase().includes(keyword) ||
				item.name.toLowerCase().includes(keyword) ||
				item.description.toLowerCase().includes(keyword)
			);
		});

		const limit = params.limit ?? filtered.length;
		const data = filtered.slice(0, limit).map((item) => ({
			name: item.name,
			id: item.id,
			token: item.token,
			description: item.description,
			capabilities: item.capabilities,
			scenarios: item.scenarios,
			strengths: item.strengths,
		}));

		return { total: filtered.length, data };
	},
};
