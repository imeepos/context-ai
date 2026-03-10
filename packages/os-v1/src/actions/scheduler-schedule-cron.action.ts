import { Type, type Static } from "@sinclair/typebox";
import type { Action, ActionExecuter, Token } from "../tokens.js";
import type { Injector } from "@context-ai/core";
import { SchedulerService } from "../core/scheduler.js";
import { ACTION_EXECUTER } from "../tokens.js";

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
	/** 要执行的 Action token */
	actionToken: Type.String({ description: "Action token to execute when cron schedule triggers" }),
	/** Action 请求参数（可选） */
	actionParams: Type.Optional(Type.Unknown({ description: "Parameters to pass to the action" })),
	/** 时区（可选，如 "Asia/Shanghai"） */
	timezone: Type.Optional(Type.String({ description: "Timezone for cron execution (e.g., 'Asia/Shanghai')" })),
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
 * 核心能力：基于 Cron 表达式定时执行指定的 Action。
 *
 * Cron 表达式格式：
 * - 分 时 日 月 周
 * - 示例：
 *   - "0 0 * * *" - 每天午夜
 *   - "0 9 * * 1-5" - 工作日上午 9 点
 *   - "0 * * * *" - 每小时整点
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
 *     id: 'hourly-report',
 *     cronExpression: '0 * * * *',  // 每小时整点
 *     actionToken: 'loop.request',
 *     actionParams: { path: 'apps://list', prompt: '生成报告' },
 *     timezone: 'Asia/Shanghai'
 * });
 */
export const schedulerScheduleCronAction: Action<
	typeof SchedulerScheduleCronRequestSchema,
	typeof SchedulerScheduleCronResponseSchema
> = {
	type: SCHEDULER_SCHEDULE_CRON_TOKEN,
	description: "Schedule a cron-based task that executes an Action according to a cron expression",
	request: SchedulerScheduleCronRequestSchema,
	response: SchedulerScheduleCronResponseSchema,
	requiredPermissions: [SCHEDULER_WRITE_PERMISSION],
	dependencies: [],
	execute: async (params: SchedulerScheduleCronRequest, injector: Injector): Promise<SchedulerScheduleCronResponse> => {
		const scheduler = injector.get(SchedulerService);
		const actionExecuter = injector.get<ActionExecuter>(ACTION_EXECUTER);
		scheduler.scheduleActionCron(params.id, params.cronExpression, params.actionToken, params.actionParams, injector, actionExecuter, params.timezone);
		return { scheduled: true };
	},
};
