import { Type } from "@sinclair/typebox";
import type { Action, Token } from "../../../tokens.js";
import { NOVEL_STORE_SERVICE, addLog } from "../store.js";
import { ToolResponseSchema, getSessionId, response } from "./shared.js";

export const NovelDeleteRequestSchema = Type.Object({
	novelId: Type.String({ minLength: 1 }),
});

export const NOVEL_DELETE_TOKEN: Token<typeof NovelDeleteRequestSchema, typeof ToolResponseSchema> = "novel.delete";

export const novelDeleteAction: Action<typeof NovelDeleteRequestSchema, typeof ToolResponseSchema> = {
	type: NOVEL_DELETE_TOKEN,
	description: "Delete novel",
	request: NovelDeleteRequestSchema,
	response: ToolResponseSchema,
	requiredPermissions: ["loop:request"],
	dependencies: [],
	execute: async (params, injector) => {
		const novelStore = injector.get(NOVEL_STORE_SERVICE);
		const data = novelStore.load();
		const sessionId = getSessionId(injector);
		const idx = data.novels.findIndex((item) => item.id === params.novelId);
		if (idx < 0) {
			return response(`Novel not found: ${params.novelId}`);
		}
		const removed = data.novels.splice(idx, 1)[0]!;
		addLog(data, sessionId, "deleteNovel", `Deleted novel "${removed.name}" (${removed.id}).`);
		novelStore.save(data);
		return response(`Deleted novel "${removed.name}" (${removed.id}).`, removed);
	},
};
