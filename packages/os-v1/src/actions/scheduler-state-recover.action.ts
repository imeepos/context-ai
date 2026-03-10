import { Type, type Static } from "@sinclair/typebox";
import type { Action, Token } from "../tokens.js";
import type { Injector } from "@context-ai/core";
import { SchedulerService } from "../core/scheduler.js";
import { ACTION_EXECUTER } from "../tokens.js";

// ============================================================================
// Scheduler State Recover Action - 请求/响应 Schema 定义
// ============================================================================

/**
 * 恢复状态请求 Schema
 */
export const SchedulerStateRecoverRequestSchema = Type.Object({
	/** 占位符字段（空对象） */
	_: Type.Optional(Type.Literal("recover", { description: "Placeholder field" })),
});

/** 恢复状态请求 TypeScript 类型 */
export type SchedulerStateRecoverRequest = Static<typeof SchedulerStateRecoverRequestSchema>;

/**
 * 恢复状态响应 Schema
 */
export const SchedulerStateRecoverResponseSchema = Type.Object({
	/** 是否成功恢复 */
	recovered: Type.Boolean({ description: "Whether state was successfully recovered" }),
	/** 恢复的任务数量 */
	restoredTasks: Type.Number({ description: "Number of tasks restored" }),
	/** 恢复的失败记录数量 */
	restoredFailures: Type.Number({ description: "Number of failure records restored" }),
});

/** 恢复状态响应 TypeScript 类型 */
export type SchedulerStateRecoverResponse = Static<typeof SchedulerStateRecoverResponseSchema>;

// ============================================================================
// Scheduler State Recover Action - Token 定义
// ============================================================================

/**
 * 恢复状态令牌
 */
export const SCHEDULER_STATE_RECOVER_TOKEN: Token<
	typeof SchedulerStateRecoverRequestSchema,
	typeof SchedulerStateRecoverResponseSchema
> = "scheduler.state.recover";

/**
 * 调度器写权限令牌
 */
export const SCHEDULER_WRITE_PERMISSION: string = "scheduler:write";

// ============================================================================
// Scheduler State Recover Action - Action 定义
// ============================================================================

/**
 * 恢复状态 Action
 *
 * 核心能力：从存储恢复调度器状态，重新调度任务。
 *
 * 设计要点：
 * - 使用 TypeBox 定义 Schema
 * - 权限控制：需要 scheduler:write 权限
 * - 需要配置存储适配器
 * - 自动重新调度所有任务
 * - 恢复失败记录
 * - 通常在服务启动时调用
 *
 * 使用方式:
 * const result = await actionExecuter.execute(SCHEDULER_STATE_RECOVER_TOKEN, {});
 * if (result.recovered) {
 *     console.log(`Recovered ${result.restoredTasks} tasks`);
 * }
 */
export const schedulerStateRecoverAction: Action<
	typeof SchedulerStateRecoverRequestSchema,
	typeof SchedulerStateRecoverResponseSchema
> = {
	type: SCHEDULER_STATE_RECOVER_TOKEN,
	description: "Recover scheduler state from storage and reschedule tasks",
	request: SchedulerStateRecoverRequestSchema,
	response: SchedulerStateRecoverResponseSchema,
	requiredPermissions: [SCHEDULER_WRITE_PERMISSION],
	dependencies: [],
	execute: async (
		_params: SchedulerStateRecoverRequest,
		injector: Injector,
	): Promise<SchedulerStateRecoverResponse> => {
		const actionExecuter = injector.get(ACTION_EXECUTER);
		const scheduler = injector.get(SchedulerService);
		return scheduler.recoverState(injector, actionExecuter);
	},
};
