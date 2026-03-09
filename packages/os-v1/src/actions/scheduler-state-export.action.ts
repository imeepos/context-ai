import { Type, type Static } from "@sinclair/typebox";
import type { Action, Token } from "../tokens.js";
import type { Injector } from "@context-ai/core";
import { SchedulerService } from "../core/scheduler.js";

// ============================================================================
// Scheduler State Export Action - 请求/响应 Schema 定义
// ============================================================================

/**
 * 导出状态请求 Schema
 */
export const SchedulerStateExportRequestSchema = Type.Object({
	/** 占位符字段（空对象） */
	_: Type.Optional(Type.Literal("export", { description: "Placeholder field" })),
});

/** 导出状态请求 TypeScript 类型 */
export type SchedulerStateExportRequest = Static<typeof SchedulerStateExportRequestSchema>;

/**
 * 持久化任务 Schema
 */
export const SchedulerPersistedTaskSchema = Type.Object({
	id: Type.String({ description: "Task ID" }),
	type: Type.Union([Type.Literal("once"), Type.Literal("interval"), Type.Literal("cron")], {
		description: "Task type",
	}),
	topic: Type.String({ description: "Event topic" }),
	payload: Type.Optional(Type.Unknown({ description: "Event payload" })),
	runAt: Type.Optional(Type.String({ description: "Execution time (ISO 8601) for 'once' type" })),
	intervalMs: Type.Optional(Type.Number({ description: "Interval in milliseconds for 'interval' type" })),
	maxRuns: Type.Optional(Type.Number({ description: "Maximum runs for 'interval' type" })),
	runs: Type.Optional(Type.Number({ description: "Current run count for 'interval' type" })),
	cronExpression: Type.Optional(Type.String({ description: "Cron expression for 'cron' type" })),
	timezone: Type.Optional(Type.String({ description: "Timezone for 'cron' type" })),
	lastRunAt: Type.Optional(Type.String({ description: "Last execution time (ISO 8601) for 'cron' type" })),
	nextRunAt: Type.Optional(Type.String({ description: "Next execution time (ISO 8601) for 'cron' type" })),
});

/**
 * 失败记录 Schema
 */
export const SchedulerFailureRecordSchema = Type.Object({
	id: Type.String({ description: "Task ID" }),
	attempt: Type.Number({ description: "Retry attempt number" }),
	error: Type.String({ description: "Error message" }),
	timestamp: Type.String({ description: "Failure timestamp (ISO 8601)" }),
});

/**
 * 导出状态响应 Schema
 */
export const SchedulerStateExportResponseSchema = Type.Object({
	/** 持久化任务列表 */
	tasks: Type.Array(SchedulerPersistedTaskSchema, { description: "List of persisted tasks" }),
	/** 失败记录列表 */
	failures: Type.Array(SchedulerFailureRecordSchema, { description: "List of failure records" }),
});

/** 导出状态响应 TypeScript 类型 */
export type SchedulerStateExportResponse = Static<typeof SchedulerStateExportResponseSchema>;

// ============================================================================
// Scheduler State Export Action - Token 定义
// ============================================================================

/**
 * 导出状态令牌
 */
export const SCHEDULER_STATE_EXPORT_TOKEN: Token<
	typeof SchedulerStateExportRequestSchema,
	typeof SchedulerStateExportResponseSchema
> = "scheduler.state.export";

/**
 * 调度器读权限令牌
 */
export const SCHEDULER_READ_PERMISSION: string = "scheduler:read";

// ============================================================================
// Scheduler State Export Action - Action 定义
// ============================================================================

/**
 * 导出状态 Action
 *
 * 核心能力：导出调度器的完整状态（任务和失败记录）。
 *
 * 设计要点：
 * - 使用 TypeBox 定义 Schema
 * - 权限控制：需要 scheduler:read 权限
 * - 导出所有持久化任务和失败记录
 * - 可用于备份或迁移
 *
 * 使用方式:
 * const result = await actionExecuter.execute(SCHEDULER_STATE_EXPORT_TOKEN, {});
 * console.log(result.tasks); // 所有持久化任务
 * console.log(result.failures); // 所有失败记录
 */
export const schedulerStateExportAction: Action<
	typeof SchedulerStateExportRequestSchema,
	typeof SchedulerStateExportResponseSchema
> = {
	type: SCHEDULER_STATE_EXPORT_TOKEN,
	description: "Export the complete scheduler state (tasks and failures)",
	request: SchedulerStateExportRequestSchema,
	response: SchedulerStateExportResponseSchema,
	requiredPermissions: [SCHEDULER_READ_PERMISSION],
	dependencies: [],
	execute: async (
		_params: SchedulerStateExportRequest,
		injector: Injector,
	): Promise<SchedulerStateExportResponse> => {
		const scheduler = injector.get(SchedulerService);
		return scheduler.exportState();
	},
};
