import { Type, type Static } from "@sinclair/typebox";
import type { Injector } from "@context-ai/core";
import * as jsx from "@context-ai/ctp";
import { Context, Data, Group, Text, Tool } from "@context-ai/ctp";
import type { ComponentFactory } from "../../tokens.js";
import { ACTION_EXECUTER } from "../../tokens.js";
import {
	NOVEL_ADD_CHAPTER_TOKEN,
	NOVEL_AUTO_PROGRESS_TOKEN,
	NOVEL_CHAPTER_QUALITY_PASS_TOKEN,
	NOVEL_CONTINUE_WRITING_TOKEN,
	NOVEL_DETAIL_GET_TOKEN,
	NOVEL_LIST_LOGS_TOKEN,
	NOVEL_LOOP_WRITE_TOKEN,
	NOVEL_READ_CHAPTER_TOKEN,
	NOVEL_READ_RECENT_CHAPTERS_TOKEN,
	NOVEL_REWRITE_CHAPTER_TOKEN,
	NOVEL_UPDATE_META_TOKEN,
} from "./actions/index.js";

export const DetailPropsSchema = Type.Object({
	novelId: Type.String({ description: "Novel id" }),
});

export type DetailProps = Static<typeof DetailPropsSchema>;

type NovelActionTextResult = {
	text: string;
};

function toToolResult(result: NovelActionTextResult) {
	return {
		content: [{ type: "text" as const, text: result.text }],
		details: null,
	};
}

export const DetailFactory: ComponentFactory<DetailProps> = async (props: DetailProps, injector: Injector) => {
	const actionExecuter = injector.get(ACTION_EXECUTER);

	const detail = await actionExecuter.execute(
		NOVEL_DETAIL_GET_TOKEN,
		{ novelId: props.novelId },
		injector,
	).catch(() => null);
	if (!detail) {
		return (
			<Context name="Novel Detail" description="View novel details">
				<Group title="Error">
					<Text>Novel not found: {props.novelId}</Text>
				</Group>
			</Context>
		);
	}

	const novel = detail.novel;

	const chapterTable = novel.chapters.map((chapter) => ({
		id: chapter.id,
		title: chapter.title,
		preview: chapter.preview,
		summary: chapter.summary || "(empty)",
		reviewCount: chapter.reviewCount,
		rewriteCount: chapter.rewriteCount,
		issuesCount: chapter.issuesCount,
		qualityReady: chapter.reviewCount >= 10 && chapter.rewriteCount >= 10 ? "YES" : "NO",
		updatedAt: new Date(chapter.updatedAt).toLocaleString(),
	}));

	return (
		<Context name="Novel Detail" description="Read and evolve novel outline, summary, and chapters.">
			<Group title="Role Definition">
				<Text>You are a quality-first autonomous novelist, not a Q&amp;A assistant.</Text>
				<Text>Priority order is: continuity consistency first, narrative quality second, writing speed third.</Text>
				<Text>Never ask the user what to do next. Decide, execute tools, and complete concrete writing work.</Text>
				<Text>Every cycle must produce manuscript change: continuation, rewrite, or a new chapter.</Text>
			</Group>

			<Group title="Mandatory Workflow">
				<Text>Step 1 (required): call readRecentChapters with limit=10 at the start of every cycle. If total chapters are fewer than 10, read all available chapters.</Text>
				<Text>Hard Rule: for each chapter, complete at least 10 review passes and 10 rewrite passes before treating it as quality-ready.</Text>
				<Text>Hard Rule: if latest chapter is not quality-ready, do not create a new chapter.</Text>
				<Text>Step 2 (required): after reading, output a concise 3-point plan: target plot thread, selected tool, and expected manuscript change.</Text>
				<Text>Step 3 (required): execute writing tool immediately. Do not stop at advice or planning text.</Text>
				<Text>Step 4 (required): run quality gate check; if failed, execute rewriteChapter before ending the cycle.</Text>
				<Text>If Step 1 is skipped, do not call continueWriting, addChapter, rewriteChapter, loopWriteChapters, or autoProgress.</Text>
			</Group>

			<Group title="Continuity Contract">
				<Text>Keep character goals, relationships, abilities, timeline, and setting consistent with recent chapters.</Text>
				<Text>Do not introduce major new facts without in-scene setup and causal transition.</Text>
				<Text>If continuity conflict is detected, prioritize rewriteChapter to repair first, then continue plot advancement.</Text>
			</Group>

			<Group title="Quality Gate">
				<Text>Before finishing each cycle, verify all items: meaningful plot advancement, clear motivation, conflict progression, dialogue information gain, stable pacing, and non-question ending.</Text>
				<Text>If any item fails, run rewriteChapter immediately and output the corrected result in the same cycle.</Text>
			</Group>

			<Group title="Tool Selection Policy">
				<Text>Use readRecentChapters for context intake. Use readChapter for targeted inspection.</Text>
				<Text>Use continueWriting for same-scene advancement. Use addChapter only at explicit chapter boundaries.</Text>
				<Text>Use qualityPass on each chapter to enforce minimum 10 review passes and 10 rewrite passes, and record discovered issues.</Text>
				<Text>Use rewriteChapter for continuity fixes, pacing repair, and style unification.</Text>
				<Text>Use updateNovelMeta whenever generated content changes long-term summary or outline facts.</Text>
				<Text>After at most 2 consecutive continueWriting actions, run at least 1 rewriteChapter.</Text>
			</Group>

			<Group title="Novel Meta">
				<Text>ID: {novel.id}</Text>
				<Text>Name: {novel.name}</Text>
				<Text>Description: {novel.description}</Text>
				<Text>Summary: {novel.summary || "(empty)"}</Text>
				<Text>Outline: {novel.outline || "(empty)"}</Text>
				<Text>Chapters: {novel.chapters.length}</Text>
			</Group>

			<Group title="Chapter List">
				{chapterTable.length > 0 ? (
					<Data
						source={chapterTable}
						format="table"
						fields={["id", "title", "summary", "reviewCount", "rewriteCount", "issuesCount", "qualityReady", "updatedAt"]}
						title="Chapters"
					/>
				) : (
					<Text>No chapters yet. Use addChapter or loopWriteChapters to create content.</Text>
				)}
			</Group>

			<Tool
				name="readRecentChapters"
				label="Read Recent 10"
				description="Read recent chapters for continuity analysis. Call at the start of each writing cycle."
				parameters={Type.Object({
					limit: Type.Optional(Type.Number({ minimum: 1, maximum: 20, default: 10 })),
				})}
				execute={async (_toolCallId, params) => {
					return toToolResult(await actionExecuter.execute(
						NOVEL_READ_RECENT_CHAPTERS_TOKEN,
						{ novelId: props.novelId, limit: params.limit ?? 10 },
						injector,
					));
				}}
			/>

			<Tool
				name="qualityPass"
				label="10x Review + 10x Rewrite"
				description="Hard quality pass: read sentence-by-sentence and rewrite until chapter reaches minimum reviewCount>=10 and rewriteCount>=10."
				parameters={Type.Object({
					chapterId: Type.String({ minLength: 1 }),
				})}
				execute={async (_toolCallId, params) => {
					return toToolResult(await actionExecuter.execute(
						NOVEL_CHAPTER_QUALITY_PASS_TOKEN,
						{ novelId: props.novelId, chapterId: params.chapterId },
						injector,
					));
				}}
			/>

			<Tool
				name="readChapter"
				label="Read Chapter"
				description="Read a chapter by chapterId. If omitted, reads the latest chapter."
				parameters={Type.Object({
					chapterId: Type.Optional(Type.String()),
				})}
				execute={async (_toolCallId, params) => {
					return toToolResult(await actionExecuter.execute(
						NOVEL_READ_CHAPTER_TOKEN,
						{ novelId: props.novelId, chapterId: params.chapterId },
						injector,
					));
				}}
			/>

			<Tool
				name="addChapter"
				label="Add Chapter"
				description="Add a chapter manually."
				parameters={Type.Object({
					title: Type.String({ minLength: 1 }),
					content: Type.String(),
				})}
				execute={async (_toolCallId, params) => {
					return toToolResult(await actionExecuter.execute(
						NOVEL_ADD_CHAPTER_TOKEN,
						{ novelId: props.novelId, ...params },
						injector,
					));
				}}
			/>

			<Tool
				name="continueWriting"
				label="Continue"
				description="Continue writing from a chapter using azure/gpt-5.3-chat."
				parameters={Type.Object({
					chapterId: Type.Optional(Type.String()),
					instruction: Type.Optional(Type.String({ description: "Writing direction for continuation." })),
					maxOutputTokens: Type.Optional(Type.Number({ minimum: 128, maximum: 8192, default: 1200 })),
				})}
				execute={async (_toolCallId, params) => {
					return toToolResult(await actionExecuter.execute(
						NOVEL_CONTINUE_WRITING_TOKEN,
						{ novelId: props.novelId, ...params },
						injector,
					));
				}}
			/>

			<Tool
				name="rewriteChapter"
				label="Rewrite"
				description="Rewrite a chapter with specified goals using azure/gpt-5.3-chat."
				parameters={Type.Object({
					chapterId: Type.String({ minLength: 1 }),
					rewriteInstruction: Type.String({ minLength: 1, description: "How to rewrite (style, pacing, voice, etc)." }),
					maxOutputTokens: Type.Optional(Type.Number({ minimum: 128, maximum: 8192, default: 2000 })),
				})}
				execute={async (_toolCallId, params) => {
					return toToolResult(await actionExecuter.execute(
						NOVEL_REWRITE_CHAPTER_TOKEN,
						{ novelId: props.novelId, ...params },
						injector,
					));
				}}
			/>

			<Tool
				name="loopWriteChapters"
				label="Loop Write"
				description="Run multi-round chapter generation in a loop."
				parameters={Type.Object({
					rounds: Type.Number({ minimum: 1, maximum: 20, default: 3 }),
					mode: Type.Optional(Type.Union([
						Type.Literal("newChapterEachRound"),
						Type.Literal("continueLastChapter"),
					], { default: "newChapterEachRound" })),
					baseInstruction: Type.Optional(Type.String()),
					chapterTitlePrefix: Type.Optional(Type.String({ default: "Chapter" })),
					maxOutputTokensPerRound: Type.Optional(Type.Number({ minimum: 128, maximum: 4096, default: 1200 })),
				})}
				execute={async (_toolCallId, params) => {
					return toToolResult(await actionExecuter.execute(
						NOVEL_LOOP_WRITE_TOKEN,
						{ novelId: props.novelId, ...params },
						injector,
					));
				}}
			/>

			<Tool
				name="autoProgress"
				label="Auto Progress"
				description="Autonomously push novel progress without asking for user direction."
				parameters={Type.Object({
					targetWords: Type.Optional(Type.Number({ minimum: 300, maximum: 3000, default: 800 })),
					rounds: Type.Optional(Type.Number({ minimum: 1, maximum: 5, default: 1 })),
					mode: Type.Optional(Type.Union([
						Type.Literal("auto"),
						Type.Literal("continue"),
						Type.Literal("newChapter"),
						Type.Literal("rewriteLast"),
					], { default: "auto" })),
				})}
				execute={async (_toolCallId, params) => {
					return toToolResult(await actionExecuter.execute(
						NOVEL_AUTO_PROGRESS_TOKEN,
						{ novelId: props.novelId, ...params },
						injector,
					));
				}}
			/>

			<Tool
				name="updateNovelMeta"
				label="Update Meta"
				description="Update novel name, description, summary, and outline."
				parameters={Type.Object({
					name: Type.Optional(Type.String()),
					description: Type.Optional(Type.String()),
					summary: Type.Optional(Type.String()),
					outline: Type.Optional(Type.String()),
				})}
				execute={async (_toolCallId, params) => {
					return toToolResult(await actionExecuter.execute(
						NOVEL_UPDATE_META_TOKEN,
						{ novelId: props.novelId, ...params },
						injector,
					));
				}}
			/>

			<Tool
				name="listChangeLogs"
				label="Logs"
				description="List operation logs, including sessionId/name/description/tiem."
				parameters={Type.Object({
					limit: Type.Optional(Type.Number({ minimum: 1, maximum: 200, default: 30 })),
					onlyCurrentSession: Type.Optional(Type.Boolean({ default: true })),
				})}
				execute={async (_toolCallId, params) => {
					return toToolResult(await actionExecuter.execute(NOVEL_LIST_LOGS_TOKEN, params, injector));
				}}
			/>
		</Context>
	);
};
