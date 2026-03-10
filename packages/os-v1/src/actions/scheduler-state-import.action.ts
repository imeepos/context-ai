import { Type, type Static } from "@sinclair/typebox";
import { ACTION_EXECUTER, type Action, type ActionExecuter, type Token } from "../tokens.js";
import type { Injector } from "@context-ai/core";
import { SchedulerService } from "../core/scheduler.js";
import {
	SchedulerPersistedTaskSchema,
	SchedulerFailureRecordSchema,
} from "./scheduler-state-export.action.js";

// ============================================================================
// Scheduler State Import Action - 请求/响应 Schema 定义
// ============================================================================

/**
 * 导入状态请求 Schema
 */
export const SchedulerStateImportRequestSchema = Type.Object({
	/** 要导入的任务列表（可选） */
	tasks: Type.Optional(Type.Array(SchedulerPersistedTaskSchema, { description: "Tasks to import" })),
	/** 要导入的失败记录列表（可选） */
	failures: Type.Optional(Type.Array(SchedulerFailureRecordSchema, { description: "Failure records to import" })),
});

/** 导入状态请求 TypeScript 类型 */
export type SchedulerStateImportRequest = Static<typeof SchedulerStateImportRequestSchema>;

/**
 * 导入状态响应 Schema
 */
export const SchedulerStateImportResponseSchema = Type.Object({
	/** 恢复的任务数量 */
	restoredTasks: Type.Number({ description: "Number of tasks restored" }),
	/** 恢复的失败记录数量 */
	restoredFailures: Type.Number({ description: "Number of failure records restored" }),
});

/** 导入状态响应 TypeScript 类型 */
export type SchedulerStateImportResponse = Static<typeof SchedulerStateImportResponseSchema>;

// ============================================================================
// Scheduler State Import Action - Token 定义
// ============================================================================

/**
 * 导入状态令牌
 */
export const SCHEDULER_STATE_IMPORT_TOKEN: Token<
	typeof SchedulerStateImportRequestSchema,
	typeof SchedulerStateImportResponseSchema
> = "scheduler.state.import";

/**
 * 调度器写权限令牌
 */
export const SCHEDULER_WRITE_PERMISSION: string = "scheduler:write";

// ============================================================================
// Scheduler State Import Action - Action 定义
// ============================================================================

/**
 * 导入状态 Action
 *
 * 核心能力：从快照导入调度器状态，恢复任务和失败记录。
 *
 * 设计要点：
 * - 使用 TypeBox 定义 Schema
 * - 权限控制：需要 scheduler:write 权限
 * - 支持部分导入（仅任务或仅失败记录）
 * - 自动重新调度任务
 * - 跳过已存在的任务
 *
 * 使用方式:
 * const result = await actionExecuter.execute(SCHEDULER_STATE_IMPORT_TOKEN, {
 *     tasks: [...],
 *     failures: [...]
 * });
 * console.log(`Restored ${result.restoredTasks} tasks`);
 */
export const schedulerStateImportAction: Action<
	typeof SchedulerStateImportRequestSchema,
	typeof SchedulerStateImportResponseSchema
> = {
	type: SCHEDULER_STATE_IMPORT_TOKEN,
	description: "Import scheduler state from a snapshot",
	request: SchedulerStateImportRequestSchema,
	response: SchedulerStateImportResponseSchema,
	requiredPermissions: [SCHEDULER_WRITE_PERMISSION],
	dependencies: [],
	execute: async (
		params: SchedulerStateImportRequest,
		injector: Injector,
	): Promise<SchedulerStateImportResponse> => {
		const actionExecuter: ActionExecuter = injector.get(ACTION_EXECUTER);
		const scheduler = injector.get(SchedulerService);
		return scheduler.restoreState(params, injector, actionExecuter);
	},
};
