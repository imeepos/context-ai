import { Type, type Static } from "@sinclair/typebox";
import type { Action, Token } from "../tokens.js";
import type { Injector } from "@context-ai/core";
import { SchedulerService } from "../core/scheduler.js";

// ============================================================================
// Scheduler State Persist Action - 请求/响应 Schema 定义
// ============================================================================

/**
 * 持久化状态请求 Schema
 */
export const SchedulerStatePersistRequestSchema = Type.Object({
	/** 占位符字段（空对象） */
	_: Type.Optional(Type.Literal("persist", { description: "Placeholder field" })),
});

/** 持久化状态请求 TypeScript 类型 */
export type SchedulerStatePersistRequest = Static<typeof SchedulerStatePersistRequestSchema>;

/**
 * 持久化状态响应 Schema
 */
export const SchedulerStatePersistResponseSchema = Type.Object({
	/** 是否成功持久化 */
	persisted: Type.Boolean({ description: "Whether state was successfully persisted" }),
	/** 持久化的任务数量 */
	tasks: Type.Number({ description: "Number of tasks persisted" }),
	/** 持久化的失败记录数量 */
	failures: Type.Number({ description: "Number of failure records persisted" }),
});

/** 持久化状态响应 TypeScript 类型 */
export type SchedulerStatePersistResponse = Static<typeof SchedulerStatePersistResponseSchema>;

// ============================================================================
// Scheduler State Persist Action - Token 定义
// ============================================================================

/**
 * 持久化状态令牌
 */
export const SCHEDULER_STATE_PERSIST_TOKEN: Token<
	typeof SchedulerStatePersistRequestSchema,
	typeof SchedulerStatePersistResponseSchema
> = "scheduler.state.persist";

/**
 * 调度器写权限令牌
 */
export const SCHEDULER_WRITE_PERMISSION: string = "scheduler:write";

// ============================================================================
// Scheduler State Persist Action - Action 定义
// ============================================================================

/**
 * 持久化状态 Action
 *
 * 核心能力：将当前调度器状态持久化到存储。
 *
 * 设计要点：
 * - 使用 TypeBox 定义 Schema
 * - 权限控制：需要 scheduler:write 权限
 * - 需要配置存储适配器
 * - 保存所有持久化任务和失败记录
 *
 * 使用方式:
 * const result = await actionExecuter.execute(SCHEDULER_STATE_PERSIST_TOKEN, {});
 * if (result.persisted) {
 *     console.log(`Persisted ${result.tasks} tasks and ${result.failures} failures`);
 * }
 */
export const schedulerStatePersistAction: Action<
	typeof SchedulerStatePersistRequestSchema,
	typeof SchedulerStatePersistResponseSchema
> = {
	type: SCHEDULER_STATE_PERSIST_TOKEN,
	description: "Persist the current scheduler state to storage",
	request: SchedulerStatePersistRequestSchema,
	response: SchedulerStatePersistResponseSchema,
	requiredPermissions: [SCHEDULER_WRITE_PERMISSION],
	dependencies: [],
	execute: async (
		_params: SchedulerStatePersistRequest,
		injector: Injector,
	): Promise<SchedulerStatePersistResponse> => {
		const scheduler = injector.get(SchedulerService);
		return scheduler.persistState();
	},
};
