import { Type, type Static } from "@sinclair/typebox";
import type { Action, Token } from "../tokens.js";
import type { Injector } from "@context-ai/core";
import { SchedulerService } from "../core/scheduler.js";

// ============================================================================
// Scheduler Schedule Once Action - 请求/响应 Schema 定义
// ============================================================================

/**
 * 调度一次性任务请求 Schema
 */
export const SchedulerScheduleOnceRequestSchema = Type.Object({
	/** 任务唯一标识符 */
	id: Type.String({ description: "Unique task identifier" }),
	/** 延迟时间（毫秒） */
	delayMs: Type.Number({ description: "Delay in milliseconds before execution" }),
	/** 事件主题 */
	topic: Type.String({ description: "Event topic to publish when task executes" }),
	/** 事件负载（可选） */
	payload: Type.Optional(Type.Unknown({ description: "Event payload data" })),
});

/** 调度一次性任务请求 TypeScript 类型 */
export type SchedulerScheduleOnceRequest = Static<typeof SchedulerScheduleOnceRequestSchema>;

/**
 * 调度一次性任务响应 Schema
 */
export const SchedulerScheduleOnceResponseSchema = Type.Object({
	/** 是否成功调度 */
	scheduled: Type.Literal(true, { description: "Task successfully scheduled" }),
});

/** 调度一次性任务响应 TypeScript 类型 */
export type SchedulerScheduleOnceResponse = Static<typeof SchedulerScheduleOnceResponseSchema>;

// ============================================================================
// Scheduler Schedule Once Action - Token 定义
// ============================================================================

/**
 * 调度一次性任务令牌
 */
export const SCHEDULER_SCHEDULE_ONCE_TOKEN: Token<
	typeof SchedulerScheduleOnceRequestSchema,
	typeof SchedulerScheduleOnceResponseSchema
> = "scheduler.schedule.once";

/**
 * 调度器写权限令牌
 */
export const SCHEDULER_WRITE_PERMISSION: string = "scheduler:write";

// ============================================================================
// Scheduler Schedule Once Action - Action 定义
// ============================================================================

/**
 * 调度一次性任务 Action
 *
 * 核心能力：在指定延迟后执行一次任务，发布事件到事件总线。
 *
 * 设计要点：
 * - 使用 TypeBox 定义 Schema
 * - 权限控制：需要 scheduler:write 权限
 * - 任务持久化：支持状态恢复
 * - 事件驱动：执行时发布事件
 *
 * 使用方式:
 * const result = await actionExecuter.execute(SCHEDULER_SCHEDULE_ONCE_TOKEN, {
 *     id: 'task-1',
 *     delayMs: 5000,
 *     topic: 'user.notification',
 *     payload: { message: 'Hello' }
 * });
 */
export const schedulerScheduleOnceAction: Action<
	typeof SchedulerScheduleOnceRequestSchema,
	typeof SchedulerScheduleOnceResponseSchema
> = {
	type: SCHEDULER_SCHEDULE_ONCE_TOKEN,
	description: "Schedule a one-time task that executes after a specified delay",
	request: SchedulerScheduleOnceRequestSchema,
	response: SchedulerScheduleOnceResponseSchema,
	requiredPermissions: [SCHEDULER_WRITE_PERMISSION],
	dependencies: [],
	execute: async (params: SchedulerScheduleOnceRequest, injector: Injector): Promise<SchedulerScheduleOnceResponse> => {
		const scheduler = injector.get(SchedulerService);
		scheduler.scheduleEventOnce(params.id, params.delayMs, params.topic, params.payload);
		return { scheduled: true };
	},
};
