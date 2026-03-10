import { Type } from "@sinclair/typebox";
import type { Action, Token } from "../../../tokens.js";
import { NOVEL_STORE_SERVICE, addLog, createId, nowIso, type Novel } from "../store.js";
import { ToolResponseSchema, compressChapterSummary, getSessionId, response } from "./shared.js";

export const NovelCreateRequestSchema = Type.Object({
	name: Type.String({ minLength: 1 }),
	description: Type.Optional(Type.String()),
	summary: Type.Optional(Type.String()),
	outline: Type.Optional(Type.String()),
	firstChapterTitle: Type.Optional(Type.String()),
	firstChapterContent: Type.Optional(Type.String()),
});

export const NOVEL_CREATE_TOKEN: Token<typeof NovelCreateRequestSchema, typeof ToolResponseSchema> = "novel.create";

export const novelCreateAction: Action<typeof NovelCreateRequestSchema, typeof ToolResponseSchema> = {
	type: NOVEL_CREATE_TOKEN,
	description: "Create novel",
	request: NovelCreateRequestSchema,
	response: ToolResponseSchema,
	requiredPermissions: ["loop:request"],
	dependencies: [],
	execute: async (params, injector) => {
		const novelStore = injector.get(NOVEL_STORE_SERVICE);
		const data = novelStore.load();
		const sessionId = getSessionId(injector);
		const timestamp = nowIso();
		const hasFirstChapter = Boolean(params.firstChapterTitle || params.firstChapterContent);

		const novel: Novel = {
			id: createId("novel"),
			name: params.name,
			description: params.description ?? "",
			summary: params.summary ?? "",
			outline: params.outline ?? "",
			chapters: hasFirstChapter
				? [{
					id: createId("chapter"),
					title: params.firstChapterTitle ?? "Chapter 1",
					content: params.firstChapterContent ?? "",
					summary: compressChapterSummary(params.firstChapterContent ?? ""),
					issues: [],
					reviewCount: 0,
					rewriteCount: 0,
					createdAt: timestamp,
					updatedAt: timestamp,
				}]
				: [],
			createdAt: timestamp,
			updatedAt: timestamp,
		};

		data.novels.push(novel);
		addLog(data, sessionId, "createNovel", `Created novel "${novel.name}" (${novel.id}).`);
		novelStore.save(data);
		return response(`Created novel "${novel.name}" with id ${novel.id}.`, novel);
	},
};
