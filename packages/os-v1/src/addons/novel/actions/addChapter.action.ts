import { Type } from "@sinclair/typebox";
import type { Action, Token } from "../../../tokens.js";
import { NOVEL_STORE_SERVICE, addLog, createId, nowIso, type NovelChapter } from "../store.js";
import { ToolResponseSchema, compressChapterSummary, findNovelById, getSessionId, isChapterQualityQualified, response } from "./shared.js";

export const NovelAddChapterRequestSchema = Type.Object({
	novelId: Type.String({ minLength: 1 }),
	title: Type.String({ minLength: 1 }),
	content: Type.String(),
});

export const NOVEL_ADD_CHAPTER_TOKEN: Token<typeof NovelAddChapterRequestSchema, typeof ToolResponseSchema> = "novel.add.chapter";

export const novelAddChapterAction: Action<typeof NovelAddChapterRequestSchema, typeof ToolResponseSchema> = {
	type: NOVEL_ADD_CHAPTER_TOKEN,
	description: "Add chapter",
	request: NovelAddChapterRequestSchema,
	response: ToolResponseSchema,
	requiredPermissions: ["loop:request"],
	dependencies: [],
	execute: async (params, injector) => {
		const novelStore = injector.get(NOVEL_STORE_SERVICE);
		const data = novelStore.load();
		const sessionId = getSessionId(injector);
		const currentNovel = findNovelById(data.novels, params.novelId);
		if (!currentNovel) return response("Novel not found.");
		const lastChapter = currentNovel.chapters[currentNovel.chapters.length - 1];
		if (lastChapter && !isChapterQualityQualified(lastChapter)) {
			return response(
				`Blocked: chapter "${lastChapter.title}" is not quality-qualified yet. Required minimum is reviewCount>=10 and rewriteCount>=10. Current: reviewCount=${lastChapter.reviewCount}, rewriteCount=${lastChapter.rewriteCount}.`,
			);
		}
		const timestamp = nowIso();
		const chapter: NovelChapter = {
			id: createId("chapter"),
			title: params.title,
			content: params.content,
			summary: compressChapterSummary(params.content),
			issues: [],
			reviewCount: 0,
			rewriteCount: 0,
			createdAt: timestamp,
			updatedAt: timestamp,
		};
		currentNovel.chapters.push(chapter);
		currentNovel.updatedAt = timestamp;
		addLog(data, sessionId, "addChapter", `Added chapter "${chapter.title}" (${chapter.id}) to novel "${currentNovel.name}".`);
		novelStore.save(data);
		return response(`Added chapter "${chapter.title}" (${chapter.id}).`, chapter);
	},
};
