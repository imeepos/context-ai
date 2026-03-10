import { Type } from "@sinclair/typebox";
import type { Action, Token } from "../../../tokens.js";
import { NOVEL_STORE_SERVICE, addLog } from "../store.js";
import { ToolResponseSchema, buildRecentChaptersContext, findNovelById, getSessionId, response } from "./shared.js";

export const NovelReadRecentChaptersRequestSchema = Type.Object({
	novelId: Type.String({ minLength: 1 }),
	limit: Type.Optional(Type.Number({ minimum: 1, maximum: 20, default: 10 })),
});

export const NOVEL_READ_RECENT_CHAPTERS_TOKEN: Token<typeof NovelReadRecentChaptersRequestSchema, typeof ToolResponseSchema> = "novel.read.recent.chapters";

export const novelReadRecentChaptersAction: Action<typeof NovelReadRecentChaptersRequestSchema, typeof ToolResponseSchema> = {
	type: NOVEL_READ_RECENT_CHAPTERS_TOKEN,
	description: "Read recent chapters",
	request: NovelReadRecentChaptersRequestSchema,
	response: ToolResponseSchema,
	requiredPermissions: ["loop:request"],
	dependencies: [],
	execute: async (params, injector) => {
		const novelStore = injector.get(NOVEL_STORE_SERVICE);
		const data = novelStore.load();
		const sessionId = getSessionId(injector);
		const currentNovel = findNovelById(data.novels, params.novelId);
		if (!currentNovel) return response("Novel not found.");

		const limit = Math.floor(params.limit ?? 10);
		const selected = currentNovel.chapters.slice(Math.max(0, currentNovel.chapters.length - limit));
		if (selected.length === 0) {
			addLog(data, sessionId, "readRecentChapters", `Read recent chapters: novel \"${currentNovel.name}\" has no chapters yet.`);
			novelStore.save(data);
			return response("No chapters yet.");
		}

		const text = buildRecentChaptersContext(currentNovel, limit, 18000);

		addLog(data, sessionId, "readRecentChapters", `Read ${selected.length} recent chapter(s) from novel \"${currentNovel.name}\".`);
		novelStore.save(data);
		return response(text);
	},
};
