import { Type } from "@sinclair/typebox";
import type { Action, Token } from "../../../tokens.js";
import { NOVEL_STORE_SERVICE, addLog } from "../store.js";
import { ToolResponseSchema, findChapterById, findNovelById, getLastChapter, getSessionId, response } from "./shared.js";

export const NovelReadChapterRequestSchema = Type.Object({
	novelId: Type.String({ minLength: 1 }),
	chapterId: Type.Optional(Type.String()),
});

export const NOVEL_READ_CHAPTER_TOKEN: Token<typeof NovelReadChapterRequestSchema, typeof ToolResponseSchema> = "novel.read.chapter";

export const novelReadChapterAction: Action<typeof NovelReadChapterRequestSchema, typeof ToolResponseSchema> = {
	type: NOVEL_READ_CHAPTER_TOKEN,
	description: "Read chapter",
	request: NovelReadChapterRequestSchema,
	response: ToolResponseSchema,
	requiredPermissions: ["loop:request"],
	dependencies: [],
	execute: async (params, injector) => {
		const novelStore = injector.get(NOVEL_STORE_SERVICE);
		const data = novelStore.load();
		const sessionId = getSessionId(injector);
		const currentNovel = findNovelById(data.novels, params.novelId);
		if (!currentNovel) return response("Novel not found.");
		const chapter = params.chapterId ? findChapterById(currentNovel.chapters, params.chapterId) : getLastChapter(currentNovel);
		if (!chapter) return response("Chapter not found.");
		addLog(data, sessionId, "readChapter", `Read chapter "${chapter.title}" (${chapter.id}) from novel "${currentNovel.name}".`);
		novelStore.save(data);
		return response(`# ${chapter.title}\n\n${chapter.content}`, chapter);
	},
};
