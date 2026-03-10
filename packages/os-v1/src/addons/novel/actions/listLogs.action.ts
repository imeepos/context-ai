import { Type } from "@sinclair/typebox";
import type { Action, Token } from "../../../tokens.js";
import { NOVEL_STORE_SERVICE } from "../store.js";
import { ToolResponseSchema, getSessionId, response } from "./shared.js";

export const NovelListLogsRequestSchema = Type.Object({
	limit: Type.Optional(Type.Number({ minimum: 1, maximum: 200, default: 30 })),
	onlyCurrentSession: Type.Optional(Type.Boolean({ default: true })),
});

export const NOVEL_LIST_LOGS_TOKEN: Token<typeof NovelListLogsRequestSchema, typeof ToolResponseSchema> = "novel.list.logs";

export const novelListLogsAction: Action<typeof NovelListLogsRequestSchema, typeof ToolResponseSchema> = {
	type: NOVEL_LIST_LOGS_TOKEN,
	description: "List novel change logs",
	request: NovelListLogsRequestSchema,
	response: ToolResponseSchema,
	requiredPermissions: ["loop:request"],
	dependencies: [],
	execute: async (params, injector) => {
		const novelStore = injector.get(NOVEL_STORE_SERVICE);
		const data = novelStore.load();
		const sessionId = getSessionId(injector);
		const limit = Math.floor(params.limit ?? 30);
		const onlyCurrentSession = params.onlyCurrentSession ?? true;
		const filtered = onlyCurrentSession ? data.logs.filter((log) => log.sessionId === sessionId) : data.logs;
		const logs = filtered.slice(Math.max(0, filtered.length - limit)).reverse();
		return response(JSON.stringify(logs, null, 2));
	},
};
