import { Type, type Static } from "@sinclair/typebox";
import type { Injector } from "@context-ai/core";
import * as jsx from "@context-ai/ctp";
import { Context, Data, Group, Text, Tool } from "@context-ai/ctp";
import type { ComponentFactory } from "../../tokens.js";
import { ACTION_EXECUTER } from "../../tokens.js";
import { LOOP_REQUEST_TOKEN } from "../../actions/loop.action.js";
import {
	NOVEL_CREATE_TOKEN,
	NOVEL_DELETE_TOKEN,
	NOVEL_LIST_LOGS_TOKEN,
	NOVEL_LIST_TOKEN,
} from "./actions/index.js";

export const ListPropsSchema = Type.Object({
	keywords: Type.Optional(Type.String({ description: "Filter novels by name or description." })),
});

export type ListProps = Static<typeof ListPropsSchema>;

type NovelActionTextResult = {
	text: string;
};

function toToolResult(result: NovelActionTextResult) {
	return {
		content: [{ type: "text" as const, text: result.text }],
		details: null,
	};
}

export const ListFactory: ComponentFactory<ListProps> = async (props: ListProps, injector: Injector) => {
	const actionExecuter = injector.get(ACTION_EXECUTER);

	const listResult = await actionExecuter.execute(
		NOVEL_LIST_TOKEN,
		{ keywords: props.keywords },
		injector,
	);

	const tableData = listResult.novels.map((novel) => ({
		id: novel.id,
		name: novel.name,
		description: novel.description,
		chapters: novel.chapters,
		updatedAt: new Date(novel.updatedAt).toLocaleString(),
	}));

	return (
		<Context name="Novel Studio" description="Create and manage novels, chapters, and writing workflow.">
			<Group title="Role Definition">
				<Text>You are a novel writing assistant.</Text>
				<Text>Help users manage novels, inspect details, and continue writing with AI tools.</Text>
				<Text>After every tool call, clearly summarize what changed and what to do next.</Text>
			</Group>

			<Group title="Novel List">
				{tableData.length > 0 ? (
					<Data
						source={tableData}
						format="table"
						fields={["id", "name", "description", "chapters", "updatedAt"]}
						title={`Novels (${tableData.length})`}
					/>
				) : (
					<Text>No novels yet. Use createNovel to start one.</Text>
				)}
			</Group>

			<Tool
				name="createNovel"
				label="Create Novel"
				description="Create a new novel with optional outline, summary, and first chapter."
				parameters={Type.Object({
					name: Type.String({ minLength: 1 }),
					description: Type.Optional(Type.String()),
					summary: Type.Optional(Type.String()),
					outline: Type.Optional(Type.String()),
					firstChapterTitle: Type.Optional(Type.String()),
					firstChapterContent: Type.Optional(Type.String()),
				})}
				execute={async (_toolCallId, params) => {
					return toToolResult(await actionExecuter.execute(NOVEL_CREATE_TOKEN, params, injector));
				}}
			/>

			<Tool
				name="openNovelDetail"
				label="Open Detail"
				description="Open novel detail page to read, continue, rewrite, and run loop writing."
				parameters={Type.Object({
					novelId: Type.String({ minLength: 1 }),
					prompt: Type.Optional(Type.String({ description: "Question to ask on the detail page." })),
				})}
				execute={async (_toolCallId, params) => {
					const response = await actionExecuter.execute(
						LOOP_REQUEST_TOKEN,
						{
							path: `novel://detail/${params.novelId}`,
							prompt: params.prompt ?? "Show me this novel detail and suggest next writing steps.",
						},
						injector,
					);

					return {
						content: [{ type: "text", text: response.success ? response.output : (response.error ?? "Unknown error") }],
						details: response,
					};
				}}
			/>

			<Tool
				name="deleteNovel"
				label="Delete Novel"
				description="Delete a novel by id."
				parameters={Type.Object({
					novelId: Type.String({ minLength: 1 }),
				})}
				execute={async (_toolCallId, params) => {
					return toToolResult(await actionExecuter.execute(NOVEL_DELETE_TOKEN, params, injector));
				}}
			/>

			<Tool
				name="listChangeLogs"
				label="List Logs"
				description="List operation logs in this session store."
				parameters={Type.Object({
					limit: Type.Optional(Type.Number({ minimum: 1, maximum: 200, default: 50 })),
				})}
				execute={async (_toolCallId, params) => {
					return toToolResult(await actionExecuter.execute(
						NOVEL_LIST_LOGS_TOKEN,
						{ limit: params.limit, onlyCurrentSession: false },
						injector,
					));
				}}
			/>
		</Context>
	);
};
