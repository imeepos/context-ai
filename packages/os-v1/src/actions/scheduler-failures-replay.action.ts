import { Type, type Static } from "@sinclair/typebox";
import type { Action, Token } from "../tokens.js";
import type { Injector } from "@context-ai/core";
import { SchedulerService } from "../core/scheduler.js";

// ============================================================================
// Scheduler Failures Replay Action - 请求/响应 Schema 定义
// ============================================================================

/**
 * 重放失败任务请求 Schema
 */
export const SchedulerFailuresReplayRequestSchema = Type.Object({
	/** 要重放的任务 ID */
	id: Type.String({ description: "Task ID to replay" }),
});

/** 重放失败任务请求 TypeScript 类型 */
export type SchedulerFailuresReplayRequest = Static<typeof SchedulerFailuresReplayRequestSchema>;

/**
 * 重放失败任务响应 Schema
 */
export const SchedulerFailuresReplayResponseSchema = Type.Object({
	/** 是否成功重放 */
	replayed: Type.Boolean({ description: "Whether the task was successfully replayed" }),
});

/** 重放失败任务响应 TypeScript 类型 */
export type SchedulerFailuresReplayResponse = Static<typeof SchedulerFailuresReplayResponseSchema>;

// ============================================================================
// Scheduler Failures Replay Action - Token 定义
// ============================================================================

/**
 * 重放失败任务令牌
 */
export const SCHEDULER_FAILURES_REPLAY_TOKEN: Token<
	typeof SchedulerFailuresReplayRequestSchema,
	typeof SchedulerFailuresReplayResponseSchema
> = "scheduler.failures.replay";

/**
 * 调度器写权限令牌
 */
export const SCHEDULER_WRITE_PERMISSION: string = "scheduler:write";

// ============================================================================
// Scheduler Failures Replay Action - Action 定义
// ============================================================================

/**
 * 重放失败任务 Action
 *
 * 核心能力：重新调度之前失败的可重试任务。
 *
 * 设计要点：
 * - 使用 TypeBox 定义 Schema
 * - 权限控制：需要 scheduler:write 权限
 * - 仅支持可重试任务（scheduleRetryable）
 * - 清除失败记录并重新调度
 *
 * 使用方式:
 * const result = await actionExecuter.execute(SCHEDULER_FAILURES_REPLAY_TOKEN, {
 *     id: 'task-1'
 * });
 * console.log(result.replayed); // true if task was replayed
 */
export const schedulerFailuresReplayAction: Action<
	typeof SchedulerFailuresReplayRequestSchema,
	typeof SchedulerFailuresReplayResponseSchema
> = {
	type: SCHEDULER_FAILURES_REPLAY_TOKEN,
	description: "Replay a failed retryable task",
	request: SchedulerFailuresReplayRequestSchema,
	response: SchedulerFailuresReplayResponseSchema,
	requiredPermissions: [SCHEDULER_WRITE_PERMISSION],
	dependencies: [],
	execute: async (
		params: SchedulerFailuresReplayRequest,
		injector: Injector,
	): Promise<SchedulerFailuresReplayResponse> => {
		const scheduler = injector.get(SchedulerService);
		const replayed = scheduler.replayFailure(params.id);
		return { replayed };
	},
};
