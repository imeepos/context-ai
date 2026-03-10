import { Type, type Static } from "@sinclair/typebox";
import type { Action, ActionExecuter, Token } from "../tokens.js";
import type { Injector } from "@context-ai/core";
import { SchedulerService } from "../core/scheduler.js";
import { ACTION_EXECUTER } from "../tokens.js";

// ============================================================================
// Scheduler Schedule Interval Action - 请求/响应 Schema 定义
// ============================================================================

/**
 * 调度间隔任务请求 Schema
 */
export const SchedulerScheduleIntervalRequestSchema = Type.Object({
	/** 任务唯一标识符 */
	id: Type.String({ description: "Unique task identifier" }),
	/** 间隔时间（毫秒） */
	intervalMs: Type.Number({ description: "Interval in milliseconds between executions" }),
	/** 要执行的 Action token */
	actionToken: Type.String({ description: "Action token to execute on each interval" }),
	/** Action 请求参数（可选） */
	actionParams: Type.Optional(Type.Unknown({ description: "Parameters to pass to the action" })),
	/** 最大执行次数（可选） */
	maxRuns: Type.Optional(Type.Number({ description: "Maximum number of executions (unlimited if not specified)" })),
});

/** 调度间隔任务请求 TypeScript 类型 */
export type SchedulerScheduleIntervalRequest = Static<typeof SchedulerScheduleIntervalRequestSchema>;

/**
 * 调度间隔任务响应 Schema
 */
export const SchedulerScheduleIntervalResponseSchema = Type.Object({
	/** 是否成功调度 */
	scheduled: Type.Literal(true, { description: "Task successfully scheduled" }),
});

/** 调度间隔任务响应 TypeScript 类型 */
export type SchedulerScheduleIntervalResponse = Static<typeof SchedulerScheduleIntervalResponseSchema>;

// ============================================================================
// Scheduler Schedule Interval Action - Token 定义
// ============================================================================

/**
 * 调度间隔任务令牌
 */
export const SCHEDULER_SCHEDULE_INTERVAL_TOKEN: Token<
	typeof SchedulerScheduleIntervalRequestSchema,
	typeof SchedulerScheduleIntervalResponseSchema
> = "scheduler.schedule.interval";

/**
 * 调度器写权限令牌
 */
export const SCHEDULER_WRITE_PERMISSION: string = "scheduler:write";

// ============================================================================
// Scheduler Schedule Interval Action - Action 定义
// ============================================================================

/**
 * 调度间隔任务 Action
 *
 * 核心能力：按固定间隔重复执行指定的 Action。
 *
 * 设计要点：
 * - 使用 TypeBox 定义 Schema
 * - 权限控制：需要 scheduler:write 权限
 * - 任务持久化：支持状态恢复
 * - 可选限制：支持最大执行次数
 *
 * 使用方式:
 * const result = await actionExecuter.execute(SCHEDULER_SCHEDULE_INTERVAL_TOKEN, {
 *     id: 'hourly-report',
 *     intervalMs: 3600000,  // 1 hour
 *     actionToken: 'loop.request',
 *     actionParams: { path: 'apps://list', prompt: '生成报告' },
 *     maxRuns: 24  // 执行 24 次后停止
 * });
 */
export const schedulerScheduleIntervalAction: Action<
	typeof SchedulerScheduleIntervalRequestSchema,
	typeof SchedulerScheduleIntervalResponseSchema
> = {
	type: SCHEDULER_SCHEDULE_INTERVAL_TOKEN,
	description: "Schedule a recurring task that executes an Action at fixed intervals",
	request: SchedulerScheduleIntervalRequestSchema,
	response: SchedulerScheduleIntervalResponseSchema,
	requiredPermissions: [SCHEDULER_WRITE_PERMISSION],
	dependencies: [],
	execute: async (
		params: SchedulerScheduleIntervalRequest,
		injector: Injector,
	): Promise<SchedulerScheduleIntervalResponse> => {
		const scheduler = injector.get(SchedulerService);
		const actionExecuter = injector.get<ActionExecuter>(ACTION_EXECUTER);
		const options = params.maxRuns !== undefined ? { maxRuns: params.maxRuns } : undefined;
		scheduler.scheduleActionInterval(params.id, params.intervalMs, params.actionToken, params.actionParams, injector, actionExecuter, options);
		return { scheduled: true };
	},
};
