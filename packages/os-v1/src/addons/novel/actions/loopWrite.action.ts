import { Type } from "@sinclair/typebox";
import type { Action, Token } from "../../../tokens.js";
import { NOVEL_STORE_SERVICE, addLog, createId, nowIso, type NovelChapter } from "../store.js";
import { ToolResponseSchema, buildRecentChaptersContext, compressChapterSummary, findNovelById, generateWithAzure, getLastChapter, getSessionId, isChapterQualityQualified, response } from "./shared.js";

export const NovelLoopWriteRequestSchema = Type.Object({
	novelId: Type.String({ minLength: 1 }),
	rounds: Type.Number({ minimum: 1, maximum: 20, default: 3 }),
	mode: Type.Optional(Type.Union([
		Type.Literal("newChapterEachRound"),
		Type.Literal("continueLastChapter"),
	], { default: "newChapterEachRound" })),
	baseInstruction: Type.Optional(Type.String()),
	chapterTitlePrefix: Type.Optional(Type.String({ default: "Chapter" })),
	maxOutputTokensPerRound: Type.Optional(Type.Number({ minimum: 128, maximum: 4096, default: 1200 })),
});

export const NOVEL_LOOP_WRITE_TOKEN: Token<typeof NovelLoopWriteRequestSchema, typeof ToolResponseSchema> = "novel.loop.write";

export const novelLoopWriteAction: Action<typeof NovelLoopWriteRequestSchema, typeof ToolResponseSchema> = {
	type: NOVEL_LOOP_WRITE_TOKEN,
	description: "Loop write chapters",
	request: NovelLoopWriteRequestSchema,
	response: ToolResponseSchema,
	requiredPermissions: ["loop:request", "bowong:model:invoke"],
	dependencies: [],
	execute: async (params, injector) => {
		const novelStore = injector.get(NOVEL_STORE_SERVICE);
		const data = novelStore.load();
		const sessionId = getSessionId(injector);
		const currentNovel = findNovelById(data.novels, params.novelId);
		if (!currentNovel) return response("Novel not found.");

		const rounds = Math.floor(params.rounds);
		const mode = params.mode ?? "newChapterEachRound";
		const titlePrefix = params.chapterTitlePrefix ?? "Chapter";
		const maxTokens = Math.floor(params.maxOutputTokensPerRound ?? 1200);
		const baseInstruction = params.baseInstruction ?? "Advance plot and character arcs immediately. Do not ask questions. Output narrative content only.";
		const outputs: Array<{ round: number; chapterId: string; title: string; length: number }> = [];

		for (let i = 1; i <= rounds; i += 1) {
			const latest = getLastChapter(currentNovel);
			const context = buildRecentChaptersContext(currentNovel, 10, 12000);
			const generated = await generateWithAzure(
				injector,
				"You are a quality-first autonomous fiction engine. Read provided recent chapters first, decide next move, then write direct narrative output. Never ask questions.",
				[
					`Novel Name: ${currentNovel.name}`,
					`Novel Description: ${currentNovel.description}`,
					`Novel Summary: ${currentNovel.summary}`,
					`Novel Outline: ${currentNovel.outline}`,
					`Round: ${i}/${rounds}`,
					`Mode: ${mode}`,
					`Base Instruction: ${baseInstruction}`,
					latest ? `Latest Chapter Title: ${latest.title}` : "No chapters yet.",
					"Recent 10 Chapters Context (must be read before writing):",
					context,
					"Quality gate: keep continuity consistent, advance conflict, keep pacing stable, no user-facing questions.",
					"Write the next story content now.",
				].join("\n\n"),
				maxTokens,
			);
			if (!generated) continue;
			const timestamp = nowIso();

			if (mode === "continueLastChapter" && latest) {
				latest.content = `${latest.content}\n\n${generated}`;
				latest.summary = compressChapterSummary(latest.content);
				latest.issues = [];
				latest.reviewCount = 0;
				latest.rewriteCount = 0;
				latest.updatedAt = timestamp;
				outputs.push({ round: i, chapterId: latest.id, title: latest.title, length: generated.length });
				addLog(data, sessionId, "loopWriteChapters", `Round ${i}: continued chapter "${latest.title}" (${latest.id}) in novel "${currentNovel.name}".`);
			} else {
				if (latest && !isChapterQualityQualified(latest)) {
					addLog(data, sessionId, "loopWriteChapters", `Round ${i}: blocked new chapter because "${latest.title}" is not quality-qualified yet (reviewCount=${latest.reviewCount}, rewriteCount=${latest.rewriteCount}).`);
					break;
				}
				const chapterIndex = currentNovel.chapters.length + 1;
				const chapter: NovelChapter = {
					id: createId("chapter"),
					title: `${titlePrefix} ${chapterIndex}`,
					content: generated,
					summary: compressChapterSummary(generated),
					issues: [],
					reviewCount: 0,
					rewriteCount: 0,
					createdAt: timestamp,
					updatedAt: timestamp,
				};
				currentNovel.chapters.push(chapter);
				outputs.push({ round: i, chapterId: chapter.id, title: chapter.title, length: generated.length });
				addLog(data, sessionId, "loopWriteChapters", `Round ${i}: created chapter "${chapter.title}" (${chapter.id}) in novel "${currentNovel.name}".`);
			}
			currentNovel.updatedAt = timestamp;
		}

		novelStore.save(data);
		return response(`Loop writing finished. Completed rounds: ${outputs.length}/${rounds}.`);
	},
};
