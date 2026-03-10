import { Type } from "@sinclair/typebox";
import type { Injector } from "@context-ai/core";
import { ACTION_EXECUTER, SHELL_SESSION_FILE } from "../../../tokens.js";
import { AZURE_GPT53_CHAT_TOKEN } from "../../../actions/bowong/azureGpt53Chat.action.js";
import {
	getSessionIdFromPath,
	type Novel,
	type NovelChapter,
} from "../store.js";

export type NovelToolResponse = {
	text: string;
};

export const ToolResponseSchema = Type.Object({
	text: Type.String(),
});

export function response(text: string, _details?: unknown): NovelToolResponse {
	return { text };
}

export function findNovelById(novels: Novel[], novelId: string): Novel | undefined {
	return novels.find((item) => item.id === novelId);
}

export function findChapterById(chapters: NovelChapter[], chapterId: string): NovelChapter | undefined {
	return chapters.find((item) => item.id === chapterId);
}

export function getLastChapter(novel: Novel): NovelChapter | undefined {
	if (novel.chapters.length === 0) return undefined;
	return novel.chapters[novel.chapters.length - 1];
}

export function chapterPreview(content: string): string {
	if (content.length <= 120) return content;
	return `${content.slice(0, 120)}...`;
}

export function compressChapterSummary(content: string, maxLength = 180): string {
	const normalized = content.replace(/\s+/g, " ").trim();
	if (!normalized) return "";
	if (normalized.length <= maxLength) return normalized;
	return `${normalized.slice(0, maxLength)}...`;
}

export function resetChapterQuality(chapter: NovelChapter): void {
	chapter.reviewCount = 0;
	chapter.rewriteCount = 0;
	chapter.issues = [];
	chapter.summary = compressChapterSummary(chapter.content);
}

export function isChapterQualityQualified(chapter: NovelChapter): boolean {
	return chapter.reviewCount >= 10 && chapter.rewriteCount >= 10;
}

export function buildRecentChaptersContext(novel: Novel, limit = 10, maxChars = 12000): string {
	const selected = novel.chapters.slice(Math.max(0, novel.chapters.length - Math.max(1, Math.floor(limit))));
	if (selected.length === 0) return "No chapters yet.";

	const perChapterCap = Math.max(600, Math.floor(maxChars / selected.length));
	const sections = selected.map((chapter, index) => {
		const content = chapter.content.length > perChapterCap
			? `...${chapter.content.slice(chapter.content.length - perChapterCap)}`
			: chapter.content;
		return `## [${index + 1}/${selected.length}] ${chapter.title} (${chapter.id})\n\n${content}`;
	});
	return sections.join("\n\n---\n\n");
}

export type AutonomousIntent = "continue" | "newChapter" | "rewriteLast";

export function decideAutonomousIntent(novel: Novel, round: number): AutonomousIntent {
	if (novel.chapters.length === 0) return "newChapter";
	if (novel.chapters.length < 3) return "continue";
	return round % 3 === 0 ? "newChapter" : "continue";
}

export function autonomySummary(intent: AutonomousIntent, title: string, length: number, round: number): string {
	return `Round ${round}: ${intent} -> ${title}, generated ${length} chars.`;
}

export async function generateWithAzure(
	injector: Injector,
	instructions: string,
	input: string,
	maxOutputTokens: number,
): Promise<string> {
	const actionExecuter = injector.get(ACTION_EXECUTER);
	const result = await actionExecuter.execute(
		AZURE_GPT53_CHAT_TOKEN,
		{
			instructions,
			input,
			max_output_tokens: maxOutputTokens,
		},
		injector,
	);
	return result.output_text.trim();
}

export function getSessionId(injector: Injector): string {
	const sessionFilePath = injector.get(SHELL_SESSION_FILE);
	return getSessionIdFromPath(sessionFilePath);
}
