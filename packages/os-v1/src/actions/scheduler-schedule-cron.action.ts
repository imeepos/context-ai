import { Type, type Static } from "@sinclair/typebox";
import type { Action, Token } from "../tokens.js";
import type { Injector } from "@context-ai/core";
import { SchedulerService } from "../core/scheduler.js";

// ============================================================================
// Scheduler Schedule Cron Action - 请求/响应 Schema 定义
// ============================================================================

/**
 * 调度 Cron 任务请求 Schema
 */
export const SchedulerScheduleCronRequestSchema = Type.Object({
	/** 任务唯一标识符 */
	id: Type.String({ description: "Unique task identifier" }),
	/** Cron 表达式（如 "0 0 * * *" 表示每天午夜） */
	cronExpression: Type.String({
		description: 'Cron expression (e.g., "0 0 * * *" for daily at midnight)',
	}),
	/** 事件主题 */
	topic: Type.String({ description: "Event topic to publish on each execution" }),
	/** 事件负载（可选） */
	payload: Type.Optional(Type.Unknown({ description: "Event payload data" })),
	/** 时区（可选，如 "America/New_York"） */
	timezone: Type.Optional(Type.String({ description: "Timezone for cron execution (e.g., 'America/New_York')" })),
});

/** 调度 Cron 任务请求 TypeScript 类型 */
export type SchedulerScheduleCronRequest = Static<typeof SchedulerScheduleCronRequestSchema>;

/**
 * 调度 Cron 任务响应 Schema
 */
export const SchedulerScheduleCronResponseSchema = Type.Object({
	/** 是否成功调度 */
	scheduled: Type.Literal(true, { description: "Task successfully scheduled" }),
});

/** 调度 Cron 任务响应 TypeScript 类型 */
export type SchedulerScheduleCronResponse = Static<typeof SchedulerScheduleCronResponseSchema>;

// ============================================================================
// Scheduler Schedule Cron Action - Token 定义
// ============================================================================

/**
 * 调度 Cron 任务令牌
 */
export const SCHEDULER_SCHEDULE_CRON_TOKEN: Token<
	typeof SchedulerScheduleCronRequestSchema,
	typeof SchedulerScheduleCronResponseSchema
> = "scheduler.schedule.cron";

/**
 * 调度器写权限令牌
 */
export const SCHEDULER_WRITE_PERMISSION: string = "scheduler:write";

// ============================================================================
// Scheduler Schedule Cron Action - Action 定义
// ============================================================================

/**
 * 调度 Cron 任务 Action
 *
 * 核心能力：基于 Cron 表达式调度任务，支持复杂的时间规则。
 *
 * Cron 表达式格式：
 * - 秒 分 时 日 月 周
 * - 示例：
 *   - "0 0 * * *" - 每天午夜
 *   - "0 *\/15 * * *" - 每 15 分钟
 *   - "0 0 9 * * 1-5" - 工作日上午 9 点
 *
 * 设计要点：
 * - 使用 TypeBox 定义 Schema
 * - 权限控制：需要 scheduler:write 权限
 * - 任务持久化：支持状态恢复
 * - 时区支持：可指定时区
 * - 自动重调度：执行后自动计算并调度下次执行
 *
 * 使用方式:
 * const result = await actionExecuter.execute(SCHEDULER_SCHEDULE_CRON_TOKEN, {
 *     id: 'daily-backup',
 *     cronExpression: '0 0 2 * *',
 *     topic: 'backup.daily',
 *     timezone: 'America/New_York'
 * });
 */
export const schedulerScheduleCronAction: Action<
	typeof SchedulerScheduleCronRequestSchema,
	typeof SchedulerScheduleCronResponseSchema
> = {
	type: SCHEDULER_SCHEDULE_CRON_TOKEN,
	description: "Schedule a cron-based task that executes according to a cron expression",
	request: SchedulerScheduleCronRequestSchema,
	response: SchedulerScheduleCronResponseSchema,
	requiredPermissions: [SCHEDULER_WRITE_PERMISSION],
	dependencies: [],
	execute: async (params: SchedulerScheduleCronRequest, injector: Injector): Promise<SchedulerScheduleCronResponse> => {
		const scheduler = injector.get(SchedulerService);
		scheduler.scheduleEventCron(params.id, params.cronExpression, params.topic, params.payload, params.timezone);
		return { scheduled: true };
	},
};
