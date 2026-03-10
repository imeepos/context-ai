import { Type } from "@sinclair/typebox";
import type { Action, Token } from "../../../tokens.js";
import { NOVEL_STORE_SERVICE, addLog, nowIso } from "../store.js";
import { ToolResponseSchema, findNovelById, getSessionId, response } from "./shared.js";

export const NovelUpdateMetaRequestSchema = Type.Object({
	novelId: Type.String({ minLength: 1 }),
	name: Type.Optional(Type.String()),
	description: Type.Optional(Type.String()),
	summary: Type.Optional(Type.String()),
	outline: Type.Optional(Type.String()),
});

export const NOVEL_UPDATE_META_TOKEN: Token<typeof NovelUpdateMetaRequestSchema, typeof ToolResponseSchema> = "novel.update.meta";

export const novelUpdateMetaAction: Action<typeof NovelUpdateMetaRequestSchema, typeof ToolResponseSchema> = {
	type: NOVEL_UPDATE_META_TOKEN,
	description: "Update novel metadata",
	request: NovelUpdateMetaRequestSchema,
	response: ToolResponseSchema,
	requiredPermissions: ["loop:request"],
	dependencies: [],
	execute: async (params, injector) => {
		const novelStore = injector.get(NOVEL_STORE_SERVICE);
		const data = novelStore.load();
		const sessionId = getSessionId(injector);
		const currentNovel = findNovelById(data.novels, params.novelId);
		if (!currentNovel) return response("Novel not found.");
		if (params.name !== undefined) currentNovel.name = params.name;
		if (params.description !== undefined) currentNovel.description = params.description;
		if (params.summary !== undefined) currentNovel.summary = params.summary;
		if (params.outline !== undefined) currentNovel.outline = params.outline;
		currentNovel.updatedAt = nowIso();
		addLog(data, sessionId, "updateNovelMeta", `Updated metadata for novel "${currentNovel.name}" (${currentNovel.id}).`);
		novelStore.save(data);
		return response(`Updated metadata for novel "${currentNovel.name}".`);
	},
};
