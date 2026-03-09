import { Type, type Static } from "@sinclair/typebox";
import type { Action, Token } from "../tokens.js";
import type { Injector } from "@context-ai/core";
import { SchedulerService } from "../core/scheduler.js";

// ============================================================================
// Scheduler Cancel Action - 请求/响应 Schema 定义
// ============================================================================

/**
 * 取消任务请求 Schema
 */
export const SchedulerCancelRequestSchema = Type.Object({
	/** 要取消的任务 ID */
	id: Type.String({ description: "Task ID to cancel" }),
});

/** 取消任务请求 TypeScript 类型 */
export type SchedulerCancelRequest = Static<typeof SchedulerCancelRequestSchema>;

/**
 * 取消任务响应 Schema
 */
export const SchedulerCancelResponseSchema = Type.Object({
	/** 是否成功取消 */
	cancelled: Type.Boolean({ description: "Whether the task was successfully cancelled" }),
});

/** 取消任务响应 TypeScript 类型 */
export type SchedulerCancelResponse = Static<typeof SchedulerCancelResponseSchema>;

// ============================================================================
// Scheduler Cancel Action - Token 定义
// ============================================================================

/**
 * 取消任务令牌
 */
export const SCHEDULER_CANCEL_TOKEN: Token<typeof SchedulerCancelRequestSchema, typeof SchedulerCancelResponseSchema> =
	"scheduler.cancel";

/**
 * 调度器写权限令牌
 */
export const SCHEDULER_WRITE_PERMISSION: string = "scheduler:write";

// ============================================================================
// Scheduler Cancel Action - Action 定义
// ============================================================================

/**
 * 取消任务 Action
 *
 * 核心能力：取消已调度的任务。
 *
 * 设计要点：
 * - 使用 TypeBox 定义 Schema
 * - 权限控制：需要 scheduler:write 权限
 * - 支持所有任务类型：once、interval、cron
 * - 清理持久化状态
 *
 * 使用方式:
 * const result = await actionExecuter.execute(SCHEDULER_CANCEL_TOKEN, {
 *     id: 'task-1'
 * });
 * console.log(result.cancelled); // true if task existed and was cancelled
 */
export const schedulerCancelAction: Action<typeof SchedulerCancelRequestSchema, typeof SchedulerCancelResponseSchema> =
{
	type: SCHEDULER_CANCEL_TOKEN,
	description: "Cancel a scheduled task",
	request: SchedulerCancelRequestSchema,
	response: SchedulerCancelResponseSchema,
	requiredPermissions: [SCHEDULER_WRITE_PERMISSION],
	dependencies: [],
	execute: async (params: SchedulerCancelRequest, injector: Injector): Promise<SchedulerCancelResponse> => {
		const scheduler = injector.get(SchedulerService);
		const cancelled = scheduler.cancel(params.id);
		return { cancelled };
	},
};
