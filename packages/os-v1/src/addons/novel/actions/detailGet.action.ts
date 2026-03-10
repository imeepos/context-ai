import { Type } from "@sinclair/typebox";
import type { Action, Token } from "../../../tokens.js";
import { NOVEL_STORE_SERVICE } from "../store.js";
import { chapterPreview, findNovelById } from "./shared.js";

export const NovelDetailRequestSchema = Type.Object({
	novelId: Type.String({ minLength: 1 }),
});

export const NovelDetailResponseSchema = Type.Object({
	novel: Type.Object({
		id: Type.String(),
		name: Type.String(),
		description: Type.String(),
		summary: Type.String(),
		outline: Type.String(),
		createdAt: Type.String(),
		updatedAt: Type.String(),
		chapters: Type.Array(Type.Object({
			id: Type.String(),
			title: Type.String(),
			preview: Type.String(),
			summary: Type.String(),
			reviewCount: Type.Number(),
			rewriteCount: Type.Number(),
			issuesCount: Type.Number(),
			updatedAt: Type.String(),
		})),
	}),
});

export const NOVEL_DETAIL_GET_TOKEN: Token<typeof NovelDetailRequestSchema, typeof NovelDetailResponseSchema> = "novel.detail.get";

export const novelDetailGetAction: Action<typeof NovelDetailRequestSchema, typeof NovelDetailResponseSchema> = {
	type: NOVEL_DETAIL_GET_TOKEN,
	description: "Get novel detail",
	request: NovelDetailRequestSchema,
	response: NovelDetailResponseSchema,
	requiredPermissions: ["loop:request"],
	dependencies: [],
	execute: async (params, injector) => {
		const novelStore = injector.get(NOVEL_STORE_SERVICE);
		const store = novelStore.load();
		const novel = findNovelById(store.novels, params.novelId);
		if (!novel) {
			throw new Error(`Novel not found: ${params.novelId}`);
		}
		return {
			novel: {
				id: novel.id,
				name: novel.name,
				description: novel.description,
				summary: novel.summary,
				outline: novel.outline,
				createdAt: novel.createdAt,
				updatedAt: novel.updatedAt,
				chapters: novel.chapters.map((chapter) => ({
					id: chapter.id,
					title: chapter.title,
					preview: chapterPreview(chapter.content),
					summary: chapter.summary,
					reviewCount: chapter.reviewCount,
					rewriteCount: chapter.rewriteCount,
					issuesCount: chapter.issues.length,
					updatedAt: chapter.updatedAt,
				})),
			},
		};
	},
};
