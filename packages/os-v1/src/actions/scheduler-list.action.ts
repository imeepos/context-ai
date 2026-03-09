import { Type, type Static } from "@sinclair/typebox";
import type { Action, Token } from "../tokens.js";
import type { Injector } from "@context-ai/core";
import { SchedulerService } from "../core/scheduler.js";

// ============================================================================
// Scheduler List Action - 请求/响应 Schema 定义
// ============================================================================

/**
 * 列出任务请求 Schema
 */
export const SchedulerListRequestSchema = Type.Object({
	/** 占位符字段（空对象） */
	_: Type.Optional(Type.Literal("list", { description: "Placeholder field" })),
});

/** 列出任务请求 TypeScript 类型 */
export type SchedulerListRequest = Static<typeof SchedulerListRequestSchema>;

/**
 * 列出任务响应 Schema
 */
export const SchedulerListResponseSchema = Type.Object({
	/** 活动任务 ID 列表 */
	taskIds: Type.Array(Type.String(), { description: "List of active task IDs" }),
});

/** 列出任务响应 TypeScript 类型 */
export type SchedulerListResponse = Static<typeof SchedulerListResponseSchema>;

// ============================================================================
// Scheduler List Action - Token 定义
// ============================================================================

/**
 * 列出任务令牌
 */
export const SCHEDULER_LIST_TOKEN: Token<typeof SchedulerListRequestSchema, typeof SchedulerListResponseSchema> =
	"scheduler.list";

/**
 * 调度器读权限令牌
 */
export const SCHEDULER_READ_PERMISSION: string = "scheduler:read";

// ============================================================================
// Scheduler List Action - Action 定义
// ============================================================================

/**
 * 列出任务 Action
 *
 * 核心能力：列出所有活动任务的 ID。
 *
 * 设计要点：
 * - 使用 TypeBox 定义 Schema
 * - 权限控制：需要 scheduler:read 权限
 * - 返回所有类型的活动任务
 *
 * 使用方式:
 * const result = await actionExecuter.execute(SCHEDULER_LIST_TOKEN, {});
 * console.log(result.taskIds); // ['task-1', 'task-2', ...]
 */
export const schedulerListAction: Action<typeof SchedulerListRequestSchema, typeof SchedulerListResponseSchema> = {
	type: SCHEDULER_LIST_TOKEN,
	description: "List all active scheduled tasks",
	request: SchedulerListRequestSchema,
	response: SchedulerListResponseSchema,
	requiredPermissions: [SCHEDULER_READ_PERMISSION],
	dependencies: [],
	execute: async (_params: SchedulerListRequest, injector: Injector): Promise<SchedulerListResponse> => {
		const scheduler = injector.get(SchedulerService);
		const taskIds = scheduler.list();
		return { taskIds };
	},
};
