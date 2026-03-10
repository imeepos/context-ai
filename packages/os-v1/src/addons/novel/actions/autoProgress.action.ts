import { Type } from "@sinclair/typebox";
import type { Action, Token } from "../../../tokens.js";
import { NOVEL_STORE_SERVICE, addLog, createId, nowIso, type NovelChapter } from "../store.js";
import {
	ToolResponseSchema,
	autonomySummary,
	buildRecentChaptersContext,
	compressChapterSummary,
	decideAutonomousIntent,
	findNovelById,
	generateWithAzure,
	getLastChapter,
	getSessionId,
	isChapterQualityQualified,
	type AutonomousIntent,
	response,
} from "./shared.js";

export const NovelAutoProgressRequestSchema = Type.Object({
	novelId: Type.String({ minLength: 1 }),
	targetWords: Type.Optional(Type.Number({ minimum: 300, maximum: 3000, default: 800 })),
	rounds: Type.Optional(Type.Number({ minimum: 1, maximum: 5, default: 1 })),
	mode: Type.Optional(Type.Union([
		Type.Literal("auto"),
		Type.Literal("continue"),
		Type.Literal("newChapter"),
		Type.Literal("rewriteLast"),
	], { default: "auto" })),
});

export const NOVEL_AUTO_PROGRESS_TOKEN: Token<typeof NovelAutoProgressRequestSchema, typeof ToolResponseSchema> = "novel.auto.progress";

export const novelAutoProgressAction: Action<typeof NovelAutoProgressRequestSchema, typeof ToolResponseSchema> = {
	type: NOVEL_AUTO_PROGRESS_TOKEN,
	description: "Autonomous novel progress",
	request: NovelAutoProgressRequestSchema,
	response: ToolResponseSchema,
	requiredPermissions: ["loop:request", "bowong:model:invoke"],
	dependencies: [],
	execute: async (params, injector) => {
		const novelStore = injector.get(NOVEL_STORE_SERVICE);
		const data = novelStore.load();
		const sessionId = getSessionId(injector);
		const currentNovel = findNovelById(data.novels, params.novelId);
		if (!currentNovel) return response("Novel not found.");

		const rounds = Math.floor(params.rounds ?? 1);
		const targetWords = Math.floor(params.targetWords ?? 800);
		const mode = params.mode ?? "auto";
		const progress: string[] = [];

		for (let i = 1; i <= rounds; i += 1) {
			const intent: AutonomousIntent = mode === "auto" ? decideAutonomousIntent(currentNovel, i) : (mode as AutonomousIntent);
			const latest = getLastChapter(currentNovel);
			const timestamp = nowIso();
			const recentContext = buildRecentChaptersContext(currentNovel, 10, 12000);

			if (intent === "rewriteLast" && latest) {
				const rewritten = await generateWithAzure(
					injector,
					"You are a quality-first autonomous fiction engine. Read recent chapters first, then rewrite for continuity and pacing. Never ask questions.",
					[
						`Novel Name: ${currentNovel.name}`,
						`Novel Summary: ${currentNovel.summary}`,
						`Novel Outline: ${currentNovel.outline}`,
						`Target Chapter Title: ${latest.title}`,
						`Goal Length: around ${targetWords} chars`,
						"Recent 10 Chapters Context:",
						recentContext,
						"Produce direct narrative output only.",
						latest.content,
					].join("\n\n"),
					Math.min(4096, Math.max(512, targetWords * 2)),
				);
				if (rewritten) {
					latest.content = rewritten;
					latest.summary = compressChapterSummary(latest.content);
					latest.rewriteCount += 1;
					latest.updatedAt = timestamp;
					currentNovel.updatedAt = timestamp;
					progress.push(autonomySummary("rewriteLast", latest.title, rewritten.length, i));
					addLog(data, sessionId, "autoProgress", `Round ${i}: rewrote "${latest.title}" (${latest.id}).`);
				}
				continue;
			}

			if (intent === "continue" && latest) {
				const generated = await generateWithAzure(
					injector,
					"You are a quality-first autonomous fiction engine. Read recent chapters first, then continue with coherent plot advancement. Never ask questions.",
					[
						`Novel Name: ${currentNovel.name}`,
						`Novel Summary: ${currentNovel.summary}`,
						`Novel Outline: ${currentNovel.outline}`,
						`Current Chapter: ${latest.title}`,
						`Goal Length: around ${targetWords} chars`,
						"Recent 10 Chapters Context:",
						recentContext,
						"Output narrative only with decisive progression.",
						latest.content.slice(-2000),
					].join("\n\n"),
					Math.min(4096, Math.max(512, targetWords * 2)),
				);
				if (generated) {
					latest.content = `${latest.content}\n\n${generated}`;
					latest.summary = compressChapterSummary(latest.content);
					latest.issues = [];
					latest.reviewCount = 0;
					latest.rewriteCount = 0;
					latest.updatedAt = timestamp;
					currentNovel.updatedAt = timestamp;
					progress.push(autonomySummary("continue", latest.title, generated.length, i));
					addLog(data, sessionId, "autoProgress", `Round ${i}: continued "${latest.title}" (${latest.id}).`);
				}
				continue;
			}

			const chapterIndex = currentNovel.chapters.length + 1;
			if (latest && !isChapterQualityQualified(latest)) {
				addLog(data, sessionId, "autoProgress", `Round ${i}: blocked new chapter because "${latest.title}" is not quality-qualified yet (reviewCount=${latest.reviewCount}, rewriteCount=${latest.rewriteCount}).`);
				continue;
			}
			const chapterTitle = `Chapter ${chapterIndex}`;
			const generated = await generateWithAzure(
				injector,
				"You are a quality-first autonomous fiction engine. Read recent chapters first, then write a new chapter that remains continuous. Never ask questions.",
				[
					`Novel Name: ${currentNovel.name}`,
					`Novel Summary: ${currentNovel.summary}`,
					`Novel Outline: ${currentNovel.outline}`,
					`New Chapter Title: ${chapterTitle}`,
					`Goal Length: around ${targetWords} chars`,
					"Recent 10 Chapters Context:",
					recentContext,
					"Output narrative only with concrete conflict progression.",
					latest ? `Previous Chapter Tail:\n${latest.content.slice(-1800)}` : "No previous chapter.",
				].join("\n\n"),
				Math.min(4096, Math.max(512, targetWords * 2)),
			);
			if (!generated) continue;
			const chapter: NovelChapter = {
				id: createId("chapter"),
				title: chapterTitle,
				content: generated,
				summary: compressChapterSummary(generated),
				issues: [],
				reviewCount: 0,
				rewriteCount: 0,
				createdAt: timestamp,
				updatedAt: timestamp,
			};
			currentNovel.chapters.push(chapter);
			currentNovel.updatedAt = timestamp;
			progress.push(autonomySummary("newChapter", chapter.title, generated.length, i));
			addLog(data, sessionId, "autoProgress", `Round ${i}: created "${chapter.title}" (${chapter.id}).`);
		}

		novelStore.save(data);
		return response(
			progress.length > 0
				? `Autonomous progress completed.\n${progress.join("\n")}`
				: "Autonomous progress completed with no generated output.",
		);
	},
};
