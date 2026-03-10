import { Type } from "@sinclair/typebox";
import type { Action, Token } from "../../../tokens.js";
import { NOVEL_STORE_SERVICE, addLog, nowIso } from "../store.js";
import {
	ToolResponseSchema,
	compressChapterSummary,
	findChapterById,
	findNovelById,
	generateWithAzure,
	getSessionId,
	response,
} from "./shared.js";

function parseAnalysis(raw: string): { summary: string; issues: string[] } {
	const lines = raw.split(/\r?\n/).map((line) => line.trim());
	let summary = "";
	const issues: string[] = [];
	let inIssues = false;

	for (const line of lines) {
		if (!line) continue;
		if (line.toUpperCase().startsWith("SUMMARY:")) {
			summary = line.slice("SUMMARY:".length).trim();
			inIssues = false;
			continue;
		}
		if (line.toUpperCase().startsWith("ISSUES:")) {
			inIssues = true;
			continue;
		}
		if (inIssues) {
			issues.push(line.replace(/^[-*\d.\s]+/, "").trim());
		}
	}

	return {
		summary,
		issues: Array.from(new Set(issues.filter(Boolean))).slice(0, 12),
	};
}

function getNextChapterContent(chapters: Array<{ id: string; content: string }>, chapterId: string): string {
	const index = chapters.findIndex((chapter) => chapter.id === chapterId);
	if (index < 0 || index + 1 >= chapters.length) return "";
	return chapters[index + 1]!.content;
}

export const NovelChapterQualityPassRequestSchema = Type.Object({
	novelId: Type.String({ minLength: 1 }),
	chapterId: Type.String({ minLength: 1 }),
});

export const NOVEL_CHAPTER_QUALITY_PASS_TOKEN: Token<typeof NovelChapterQualityPassRequestSchema, typeof ToolResponseSchema> = "novel.chapter.quality.pass";

export const novelChapterQualityPassAction: Action<typeof NovelChapterQualityPassRequestSchema, typeof ToolResponseSchema> = {
	type: NOVEL_CHAPTER_QUALITY_PASS_TOKEN,
	description: "Hard quality pass: read at least 10 times and rewrite at least 10 times",
	request: NovelChapterQualityPassRequestSchema,
	response: ToolResponseSchema,
	requiredPermissions: ["loop:request", "bowong:model:invoke"],
	dependencies: [],
	execute: async (params, injector) => {
		const novelStore = injector.get(NOVEL_STORE_SERVICE);
		const data = novelStore.load();
		const sessionId = getSessionId(injector);
		const novel = findNovelById(data.novels, params.novelId);
		if (!novel) return response("Novel not found.");
		const chapter = findChapterById(novel.chapters, params.chapterId);
		if (!chapter) return response("Chapter not found.");

		const reviewNeeded = Math.max(0, 10 - chapter.reviewCount);
		const rewriteNeeded = Math.max(0, 10 - chapter.rewriteCount);
		const nextChapterContent = getNextChapterContent(novel.chapters, chapter.id);
		const issueSet = new Set<string>(chapter.issues ?? []);

		for (let i = 0; i < reviewNeeded; i += 1) {
			const analysis = await generateWithAzure(
				injector,
				"You are a strict fiction editor. Read sentence by sentence and check continuity between current chapter and next chapter. Output plain text with format: SUMMARY: <one-line compressed plot summary> then ISSUES: with bullet lines.",
				[
					`Novel: ${novel.name}`,
					`Chapter Title: ${chapter.title}`,
					"Current Chapter (full):",
					chapter.content,
					nextChapterContent ? "Next Chapter (full):" : "Next Chapter: <none>",
					nextChapterContent || "",
					"Focus checks: continuity breaks, causal jumps, motivation mismatch, pacing issues, repeated exposition, weak transitions.",
				].join("\n\n"),
				900,
			);
			const parsed = parseAnalysis(analysis);
			if (parsed.summary) chapter.summary = parsed.summary;
			for (const issue of parsed.issues) issueSet.add(issue);
			chapter.reviewCount += 1;
			addLog(data, sessionId, "chapterQualityReview", `Review pass ${chapter.reviewCount}/10 for chapter "${chapter.title}" (${chapter.id}).`);
		}

		for (let i = 0; i < rewriteNeeded; i += 1) {
			const rewritten = await generateWithAzure(
				injector,
				"You are a strict fiction reviser. Rewrite the full chapter to fix listed issues, keep core facts, strengthen transition to the next chapter, and keep style consistency.",
				[
					`Novel: ${novel.name}`,
					`Chapter Title: ${chapter.title}`,
					`Known Issues: ${Array.from(issueSet).join(" | ") || "none"}`,
					nextChapterContent ? "Next Chapter Opening Context:" : "Next Chapter Opening Context: <none>",
					nextChapterContent ? nextChapterContent.slice(0, 2200) : "",
					"Current Chapter (rewrite full chapter):",
					chapter.content,
				].join("\n\n"),
				2200,
			);
			if (!rewritten) continue;
			chapter.content = rewritten;
			chapter.summary = compressChapterSummary(chapter.content);
			chapter.rewriteCount += 1;
			chapter.updatedAt = nowIso();
			addLog(data, sessionId, "chapterQualityRewrite", `Rewrite pass ${chapter.rewriteCount}/10 for chapter "${chapter.title}" (${chapter.id}).`);
		}

		chapter.issues = Array.from(issueSet).slice(0, 20);
		novel.updatedAt = nowIso();
		novelStore.save(data);

		return response(
			`Quality pass completed for chapter "${chapter.title}". reviewCount=${chapter.reviewCount}, rewriteCount=${chapter.rewriteCount}, issues=${chapter.issues.length}.`,
		);
	},
};
