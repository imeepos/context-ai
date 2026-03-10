import { Type } from "@sinclair/typebox";
import type { Action, Token } from "../../../tokens.js";
import { NOVEL_STORE_SERVICE, addLog, nowIso } from "../store.js";
import { ToolResponseSchema, compressChapterSummary, findChapterById, findNovelById, generateWithAzure, getLastChapter, getSessionId, response } from "./shared.js";

export const NovelContinueWritingRequestSchema = Type.Object({
	novelId: Type.String({ minLength: 1 }),
	chapterId: Type.Optional(Type.String()),
	instruction: Type.Optional(Type.String({ description: "Writing direction for continuation." })),
	maxOutputTokens: Type.Optional(Type.Number({ minimum: 128, maximum: 8192, default: 1200 })),
});

export const NOVEL_CONTINUE_WRITING_TOKEN: Token<typeof NovelContinueWritingRequestSchema, typeof ToolResponseSchema> = "novel.continue.writing";

export const novelContinueWritingAction: Action<typeof NovelContinueWritingRequestSchema, typeof ToolResponseSchema> = {
	type: NOVEL_CONTINUE_WRITING_TOKEN,
	description: "Continue writing",
	request: NovelContinueWritingRequestSchema,
	response: ToolResponseSchema,
	requiredPermissions: ["loop:request", "bowong:model:invoke"],
	dependencies: [],
	execute: async (params, injector) => {
		const novelStore = injector.get(NOVEL_STORE_SERVICE);
		const data = novelStore.load();
		const sessionId = getSessionId(injector);
		const currentNovel = findNovelById(data.novels, params.novelId);
		if (!currentNovel) return response("Novel not found.");
		const targetChapter = params.chapterId ? findChapterById(currentNovel.chapters, params.chapterId) : getLastChapter(currentNovel);
		if (!targetChapter) return response("No target chapter. Please add a chapter first.");

		const generated = await generateWithAzure(
			injector,
			"You are an autonomous fiction engine. Continue the chapter with coherent plot, consistent tone, and clear pacing. Never ask questions and never request external guidance.",
			[
				`Novel Name: ${currentNovel.name}`,
				`Novel Description: ${currentNovel.description}`,
				`Novel Summary: ${currentNovel.summary}`,
				`Novel Outline: ${currentNovel.outline}`,
				`Current Chapter Title: ${targetChapter.title}`,
				"Current Chapter Content:",
				targetChapter.content,
				`Instruction: ${params.instruction ?? "Produce direct plot advancement immediately. Do not ask anything. Output narrative only."}`,
			].join("\n\n"),
			Math.floor(params.maxOutputTokens ?? 1200),
		);
		if (!generated) return response("Model returned empty output.");

		targetChapter.content = `${targetChapter.content}\n\n${generated}`;
		targetChapter.summary = compressChapterSummary(targetChapter.content);
		targetChapter.issues = [];
		targetChapter.reviewCount = 0;
		targetChapter.rewriteCount = 0;
		const timestamp = nowIso();
		targetChapter.updatedAt = timestamp;
		currentNovel.updatedAt = timestamp;
		addLog(data, sessionId, "continueWriting", `Continued chapter "${targetChapter.title}" (${targetChapter.id}) in novel "${currentNovel.name}".`);
		novelStore.save(data);

		return response(`Continuation completed for "${targetChapter.title}".\n\n${generated}`);
	},
};
