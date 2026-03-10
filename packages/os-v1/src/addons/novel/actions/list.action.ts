import { Type, type Static } from "@sinclair/typebox";
import type { Action, Token } from "../../../tokens.js";
import { NOVEL_STORE_SERVICE } from "../store.js";

export const NovelListRequestSchema = Type.Object({
	keywords: Type.Optional(Type.String({ description: "Filter novels by name or description." })),
});

export const NovelListResponseSchema = Type.Object({
	novels: Type.Array(Type.Object({
		id: Type.String(),
		name: Type.String(),
		description: Type.String(),
		summary: Type.String(),
		outline: Type.String(),
		chapters: Type.Number(),
		updatedAt: Type.String(),
	})),
});

export type NovelListRequest = Static<typeof NovelListRequestSchema>;
export type NovelListResponse = Static<typeof NovelListResponseSchema>;

export const NOVEL_LIST_TOKEN: Token<typeof NovelListRequestSchema, typeof NovelListResponseSchema> = "novel.list";

export const novelListAction: Action<typeof NovelListRequestSchema, typeof NovelListResponseSchema> = {
	type: NOVEL_LIST_TOKEN,
	description: "List novels",
	request: NovelListRequestSchema,
	response: NovelListResponseSchema,
	requiredPermissions: ["loop:request"],
	dependencies: [],
	execute: async (params, injector) => {
		const novelStore = injector.get(NOVEL_STORE_SERVICE);
		const store = novelStore.load();
		const filtered = params.keywords
			? store.novels.filter((novel) => novel.name.includes(params.keywords!) || novel.description.includes(params.keywords!))
			: store.novels;
		return {
			novels: filtered.map((novel) => ({
				id: novel.id,
				name: novel.name,
				description: novel.description,
				summary: novel.summary,
				outline: novel.outline,
				chapters: novel.chapters.length,
				updatedAt: novel.updatedAt,
			})),
		};
	},
};
