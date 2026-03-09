import { Type, type Static } from "@sinclair/typebox";
import type { Action, Token } from "../tokens.js";
import type { Injector } from "@context-ai/core";
import { SchedulerService } from "../core/scheduler.js";

// ============================================================================
// Scheduler Failures Clear Action - 请求/响应 Schema 定义
// ============================================================================

/**
 * 清除失败记录请求 Schema
 */
export const SchedulerFailuresClearRequestSchema = Type.Object({
	/** 要清除的任务 ID（可选，不指定则清除所有） */
	id: Type.Optional(Type.String({ description: "Task ID to clear failures for (clears all if not specified)" })),
});

/** 清除失败记录请求 TypeScript 类型 */
export type SchedulerFailuresClearRequest = Static<typeof SchedulerFailuresClearRequestSchema>;

/**
 * 清除失败记录响应 Schema
 */
export const SchedulerFailuresClearResponseSchema = Type.Object({
	/** 清除的失败记录数量 */
	cleared: Type.Number({ description: "Number of failure records cleared" }),
});

/** 清除失败记录响应 TypeScript 类型 */
export type SchedulerFailuresClearResponse = Static<typeof SchedulerFailuresClearResponseSchema>;

// ============================================================================
// Scheduler Failures Clear Action - Token 定义
// ============================================================================

/**
 * 清除失败记录令牌
 */
export const SCHEDULER_FAILURES_CLEAR_TOKEN: Token<
	typeof SchedulerFailuresClearRequestSchema,
	typeof SchedulerFailuresClearResponseSchema
> = "scheduler.failures.clear";

/**
 * 调度器写权限令牌
 */
export const SCHEDULER_WRITE_PERMISSION: string = "scheduler:write";

// ============================================================================
// Scheduler Failures Clear Action - Action 定义
// ============================================================================

/**
 * 清除失败记录 Action
 *
 * 核心能力：清除任务失败记录。
 *
 * 设计要点：
 * - 使用 TypeBox 定义 Schema
 * - 权限控制：需要 scheduler:write 权限
 * - 支持清除特定任务或所有任务的失败记录
 *
 * 使用方式:
 * // 清除特定任务的失败记录
 * const result = await actionExecuter.execute(SCHEDULER_FAILURES_CLEAR_TOKEN, {
 *     id: 'task-1'
 * });
 *
 * // 清除所有失败记录
 * const result = await actionExecuter.execute(SCHEDULER_FAILURES_CLEAR_TOKEN, {});
 */
export const schedulerFailuresClearAction: Action<
	typeof SchedulerFailuresClearRequestSchema,
	typeof SchedulerFailuresClearResponseSchema
> = {
	type: SCHEDULER_FAILURES_CLEAR_TOKEN,
	description: "Clear failure records for a specific task or all tasks",
	request: SchedulerFailuresClearRequestSchema,
	response: SchedulerFailuresClearResponseSchema,
	requiredPermissions: [SCHEDULER_WRITE_PERMISSION],
	dependencies: [],
	execute: async (
		params: SchedulerFailuresClearRequest,
		injector: Injector,
	): Promise<SchedulerFailuresClearResponse> => {
		const scheduler = injector.get(SchedulerService);
		const cleared = scheduler.clearFailures(params.id);
		return { cleared };
	},
};
