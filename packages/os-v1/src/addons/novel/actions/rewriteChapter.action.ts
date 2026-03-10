import { Type } from "@sinclair/typebox";
import type { Action, Token } from "../../../tokens.js";
import { NOVEL_STORE_SERVICE, addLog, nowIso } from "../store.js";
import { ToolResponseSchema, compressChapterSummary, findChapterById, findNovelById, generateWithAzure, getSessionId, response } from "./shared.js";

export const NovelRewriteChapterRequestSchema = Type.Object({
	novelId: Type.String({ minLength: 1 }),
	chapterId: Type.String({ minLength: 1 }),
	rewriteInstruction: Type.String({ minLength: 1, description: "How to rewrite (style, pacing, voice, etc)." }),
	maxOutputTokens: Type.Optional(Type.Number({ minimum: 128, maximum: 8192, default: 2000 })),
});

export const NOVEL_REWRITE_CHAPTER_TOKEN: Token<typeof NovelRewriteChapterRequestSchema, typeof ToolResponseSchema> = "novel.rewrite.chapter";

export const novelRewriteChapterAction: Action<typeof NovelRewriteChapterRequestSchema, typeof ToolResponseSchema> = {
	type: NOVEL_REWRITE_CHAPTER_TOKEN,
	description: "Rewrite chapter",
	request: NovelRewriteChapterRequestSchema,
	response: ToolResponseSchema,
	requiredPermissions: ["loop:request", "bowong:model:invoke"],
	dependencies: [],
	execute: async (params, injector) => {
		const novelStore = injector.get(NOVEL_STORE_SERVICE);
		const data = novelStore.load();
		const sessionId = getSessionId(injector);
		const currentNovel = findNovelById(data.novels, params.novelId);
		if (!currentNovel) return response("Novel not found.");
		const chapter = findChapterById(currentNovel.chapters, params.chapterId);
		if (!chapter) return response("Chapter not found.");

		const rewritten = await generateWithAzure(
			injector,
			"You are a professional fiction editor. Rewrite the chapter completely while preserving core facts and continuity.",
			[
				`Novel Name: ${currentNovel.name}`,
				`Novel Summary: ${currentNovel.summary}`,
				`Novel Outline: ${currentNovel.outline}`,
				`Chapter Title: ${chapter.title}`,
				`Rewrite Goal: ${params.rewriteInstruction}`,
				"Original Chapter Content:",
				chapter.content,
			].join("\n\n"),
			Math.floor(params.maxOutputTokens ?? 2000),
		);
		if (!rewritten) return response("Model returned empty output.");

		chapter.content = rewritten;
		chapter.summary = compressChapterSummary(chapter.content);
		chapter.rewriteCount += 1;
		const timestamp = nowIso();
		chapter.updatedAt = timestamp;
		currentNovel.updatedAt = timestamp;
		addLog(data, sessionId, "rewriteChapter", `Rewrote chapter "${chapter.title}" (${chapter.id}) in novel "${currentNovel.name}".`);
		novelStore.save(data);

		return response(`Rewrite completed for "${chapter.title}".\n\n${rewritten}`);
	},
};
