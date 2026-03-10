/**
 * Scheduler Service
 * 核心调度器服务 - 支持 Action 任务调度（一次性、间隔、Cron）
 */

import { Injectable, Optional, Injector } from "@context-ai/core";
import cronParser from "cron-parser";
import type {
	TaskHandle,
	SchedulerFailureRecord,
	RetryableTaskDefinition,
	SchedulerPersistedTask,
	SchedulerServiceOptions,
	EventBus,
} from "./scheduler-types.js";
import { exportSchedulerState } from "./scheduler-persistence.js";
import { restoreSchedulerState, persistSchedulerState, recoverSchedulerState } from "./scheduler-state.js";
import { EVENT_BUS, SCHEDULER_OPTIONS } from "../tokens.js";
import type { ActionExecuter, Token } from "../tokens.js";
import type { Static, TSchema } from "@mariozechner/pi-ai";

/**
 * 调度器服务
 *
 * 核心功能：
 * - 一次性 Action 任务调度（scheduleActionOnce）
 * - 间隔 Action 任务调度（scheduleActionInterval）
 * - Cron Action 任务调度（scheduleActionCron）
 * - 可重试任务调度（scheduleRetryable）
 * - 任务取消（cancel）
 * - 失败追踪和重放（failures, replay）
 * - 状态持久化和恢复（persist, recover）
 */
@Injectable()
export class SchedulerService {
	private readonly tasks = new Map<string, TaskHandle>();
	private readonly failures: SchedulerFailureRecord[] = [];
	private readonly retryableDefinitions = new Map<string, RetryableTaskDefinition>();
	private readonly persistedTasks = new Map<string, SchedulerPersistedTask>();

	/** 存储每个任务对应的 injector */
	private readonly taskInjectors = new Map<string, Injector>();

	/** 存储每个任务对应的 actionExecuter */
	private readonly taskExecuters = new Map<string, ActionExecuter>();

	constructor(
		@Optional(EVENT_BUS) private readonly eventBus?: EventBus,
		@Optional(SCHEDULER_OPTIONS) private readonly options?: SchedulerServiceOptions,
	) { }

	/**
	 * 调度间隔任务（内部方法）
	 */
	private scheduleInterval(id: string, intervalMs: number, fn: () => void, options?: { maxRuns?: number }): void {
		if (this.tasks.has(id)) {
			throw new Error(`Task already exists: ${id}`);
		}

		let runs = 0;
		const timer = setInterval(() => {
			runs += 1;
			fn();
			if (options?.maxRuns && runs >= options.maxRuns) {
				this.cancel(id);
			}
		}, intervalMs);

		this.tasks.set(id, { stop: () => clearInterval(timer) });
	}

	/**
	 * 调度一次性任务（内部方法）
	 */
	private scheduleOnce(id: string, delayMs: number, fn: () => void): void {
		if (this.tasks.has(id)) {
			throw new Error(`Task already exists: ${id}`);
		}

		const timer = setTimeout(() => {
			fn();
			this.tasks.delete(id);
			this.persistedTasks.delete(id);
			this.persistIfNeeded();
		}, delayMs);

		this.tasks.set(id, { stop: () => clearTimeout(timer) });
	}

	// ============================================================================
	// Action 执行方法
	// ============================================================================

	/**
	 * 执行 Action
	 *
	 * @param actionToken - 要执行的 Action token
	 * @param actionParams - Action 请求参数
	 * @param taskId - 任务 ID（用于日志和事件）
	 */
	private async executeAction<TRequest extends TSchema, TResponse extends TSchema>(
		actionToken: Token<TRequest, TResponse>,
		actionParams: Static<TRequest>,
		taskId: string
	): Promise<void> {
		const injector = this.taskInjectors.get(taskId);
		const actionExecuter = this.taskExecuters.get(taskId);

		if (!actionExecuter || !injector) {
			console.warn(`[Scheduler] ActionExecuter or Injector not available for task: ${taskId}`);
			return;
		}

		try {
			const result = await actionExecuter.execute(
				actionToken,
				actionParams,
				injector,
			);
			this.eventBus?.publish("scheduler.action.succeeded", {
				taskId,
				actionToken,
				result,
			});
		} catch (error) {
			this.eventBus?.publish("scheduler.action.failed", {
				taskId,
				actionToken,
				error: error instanceof Error ? error.message : String(error),
			});
		}
	}

	/**
	 * 调度一次性 Action 任务
	 *
	 * @param id 任务 ID
	 * @param delayMs 延迟时间（毫秒）
	 * @param actionToken 要执行的 Action token
	 * @param actionParams Action 请求参数
	 * @param injector DI 注入器（用于执行 Action）
	 * @param actionExecuter Action 执行器
	 */
	scheduleOnceAction(
		id: string,
		delayMs: number,
		actionToken: string,
		actionParams: unknown,
		injector: Injector,
		actionExecuter: ActionExecuter,
	): void {
		// 存储 injector 和 actionExecuter 供后续执行使用
		this.taskInjectors.set(id, injector);
		this.taskExecuters.set(id, actionExecuter);

		const runAt = Date.now() + delayMs;
		this.persistedTasks.set(id, {
			id,
			type: "once",
			actionToken,
			actionParams,
			runAt: new Date(runAt).toISOString(),
		});
		this.persistIfNeeded();

		this.scheduleOnce(id, delayMs, () => {
			void this.executeAction(actionToken, actionParams, id);
			this.persistedTasks.delete(id);
			this.taskInjectors.delete(id);
			this.taskExecuters.delete(id);
			this.persistIfNeeded();
		});
	}

	/**
	 * 调度间隔 Action 任务
	 *
	 * @param id 任务 ID
	 * @param intervalMs 间隔时间（毫秒）
	 * @param actionToken 要执行的 Action token
	 * @param actionParams Action 请求参数
	 * @param injector DI 注入器（用于执行 Action）
	 * @param actionExecuter Action 执行器
	 * @param options 可选配置
	 */
	scheduleIntervalAction(
		id: string,
		intervalMs: number,
		actionToken: string,
		actionParams: unknown,
		injector: Injector,
		actionExecuter: ActionExecuter,
		options?: { maxRuns?: number },
	): void {
		// 存储 injector 和 actionExecuter 供后续执行使用
		this.taskInjectors.set(id, injector);
		this.taskExecuters.set(id, actionExecuter);

		let runs = 0;
		this.persistedTasks.set(id, {
			id,
			type: "interval",
			actionToken,
			actionParams,
			intervalMs,
			maxRuns: options?.maxRuns,
			runs: 0,
		});
		this.persistIfNeeded();

		this.scheduleInterval(
			id,
			intervalMs,
			() => {
				runs += 1;
				void this.executeAction(actionToken, actionParams, id);
				const entry = this.persistedTasks.get(id);
				if (entry) {
					entry.runs = runs;
					this.persistedTasks.set(id, entry);
					this.persistIfNeeded();
				}
			},
			options,
		);
	}

	/**
	 * 调度 Cron Action 任务
	 *
	 * @param id 任务 ID
	 * @param cronExpression Cron 表达式（如 "0 0 * * *" 表示每天午夜）
	 * @param actionToken 要执行的 Action token
	 * @param actionParams Action 请求参数
	 * @param injector DI 注入器（用于执行 Action）
	 * @param actionExecuter Action 执行器
	 * @param timezone 时区（可选，默认使用系统时区）
	 */
	scheduleCronAction(
		id: string,
		cronExpression: string,
		actionToken: string,
		actionParams: unknown,
		injector: Injector,
		actionExecuter: ActionExecuter,
		timezone?: string,
	): void {
		if (this.tasks.has(id)) {
			throw new Error(`Task already exists: ${id}`);
		}

		// 存储 injector 和 actionExecuter 供后续执行使用
		this.taskInjectors.set(id, injector);
		this.taskExecuters.set(id, actionExecuter);

		// 验证 cron 表达式并计算下次执行时间
		let nextRun: Date;
		try {
			const interval = cronParser.parseExpression(cronExpression, {
				tz: timezone || this.options?.defaultTimezone || undefined,
			});
			nextRun = interval.next().toDate();
		} catch (error) {
			throw new Error(`Invalid cron expression: ${cronExpression}`);
		}

		const nextRunAt = nextRun.toISOString();

		// 持久化 cron 任务
		this.persistedTasks.set(id, {
			id,
			type: "cron",
			actionToken,
			actionParams,
			cronExpression,
			timezone: timezone || this.options?.defaultTimezone,
			nextRunAt,
		});
		this.persistIfNeeded();

		// 自调度函数：执行任务并调度下一次
		const scheduleSelf = (): void => {
			// 执行 Action
			void this.executeAction(actionToken, actionParams, id);

			// 更新上次执行时间
			const now = new Date().toISOString();
			const task = this.persistedTasks.get(id);
			if (task) {
				task.lastRunAt = now;
			}

			// 计算并调度下次执行
			try {
				const nextInterval = cronParser.parseExpression(cronExpression, {
					currentDate: new Date(),
					tz: timezone || this.options?.defaultTimezone || undefined,
				});
				const nextExecution = nextInterval.next().toDate();
				const delayMs = nextExecution.getTime() - Date.now();

				// 更新下次执行时间
				if (task) {
					task.nextRunAt = nextExecution.toISOString();
					this.persistedTasks.set(id, task);
					this.persistIfNeeded();
				}

				// 调度下次执行
				const timer = setTimeout(scheduleSelf, delayMs);
				this.tasks.set(id, { stop: () => clearTimeout(timer) });
			} catch (error) {
				// Cron 表达式解析失败，停止任务
				this.tasks.delete(id);
				this.persistedTasks.delete(id);
				this.persistIfNeeded();
			}
		};

		// 调度首次执行
		const initialDelayMs = nextRun.getTime() - Date.now();
		const timer = setTimeout(scheduleSelf, initialDelayMs);
		this.tasks.set(id, { stop: () => clearTimeout(timer) });
	}

	/**
	 * 取消任务
	 */
	cancel(id: string): boolean {
		const task = this.tasks.get(id);
		if (!task) return false;

		task.stop();
		this.tasks.delete(id);
		this.persistedTasks.delete(id);
		this.taskInjectors.delete(id);
		this.taskExecuters.delete(id);
		this.persistIfNeeded();
		return true;
	}

	/**
	 * 列出所有活动任务 ID
	 */
	list(): string[] {
		return [...this.tasks.keys()];
	}

	/**
	 * 列出失败记录
	 */
	listFailures(limit?: number): SchedulerFailureRecord[] {
		if (!limit || limit <= 0) {
			return [...this.failures];
		}
		return this.failures.slice(-limit);
	}

	/**
	 * 清除失败记录
	 */
	clearFailures(id?: string): number {
		if (!id) {
			const count = this.failures.length;
			this.failures.length = 0;
			this.persistIfNeeded();
			return count;
		}

		const before = this.failures.length;
		const retained = this.failures.filter((item) => item.id !== id);
		this.failures.length = 0;
		this.failures.push(...retained);
		this.persistIfNeeded();
		return before - retained.length;
	}

	/**
	 * 重放失败的任务
	 */
	replayFailure(id: string): boolean {
		const hasFailure = this.failures.some((item) => item.id === id);
		if (!hasFailure) return false;

		const definition = this.retryableDefinitions.get(id);
		if (!definition) return false;
		if (this.tasks.has(id)) return false;

		this.clearFailures(id);
		this.scheduleRetryable(id, definition.task, definition.options);
		this.eventBus?.publish("scheduler.task.replayed", { id });
		this.persistIfNeeded();
		return true;
	}

	/**
	 * 调度可重试任务
	 */
	scheduleRetryable(
		id: string,
		task: () => Promise<void>,
		options: {
			maxRetries: number;
			backoffMs: number;
		},
	): void {
		if (this.tasks.has(id)) {
			throw new Error(`Task already exists: ${id}`);
		}

		this.retryableDefinitions.set(id, { task, options });

		let cancelled = false;
		const run = async (attempt: number): Promise<void> => {
			if (cancelled) return;

			try {
				await task();
				this.tasks.delete(id);
				this.clearFailures(id);
				this.eventBus?.publish("scheduler.task.succeeded", { id, attempt });
			} catch (error) {
				if (attempt >= options.maxRetries) {
					this.tasks.delete(id);
					const failureRecord: SchedulerFailureRecord = {
						id,
						attempt,
						error: error instanceof Error ? error.message : String(error),
						timestamp: new Date().toISOString(),
					};
					this.failures.push(failureRecord);
					this.eventBus?.publish("scheduler.task.failed", {
						id,
						attempt,
						error: failureRecord.error,
					});
					this.persistIfNeeded();
					return;
				}

				this.eventBus?.publish("scheduler.task.retried", { id, attempt });
				const timer = setTimeout(() => {
					void run(attempt + 1);
				}, options.backoffMs * (attempt + 1));
				this.tasks.set(id, { stop: () => clearTimeout(timer) });
				this.persistIfNeeded();
			}
		};

		const firstTimer = setTimeout(() => {
			void run(0);
		}, 0);
		this.tasks.set(id, {
			stop: () => {
				cancelled = true;
				clearTimeout(firstTimer);
			},
		});
		this.persistIfNeeded();
	}

	/**
	 * 导出调度器状态
	 */
	exportState(): {
		tasks: SchedulerPersistedTask[];
		failures: SchedulerFailureRecord[];
	} {
		return exportSchedulerState(this.persistedTasks, this.failures);
	}

	/**
	 * 恢复调度器状态
	 */
	restoreState(
		snapshot: { tasks?: SchedulerPersistedTask[]; failures?: SchedulerFailureRecord[] },
		injector: Injector,
		actionExecuter: ActionExecuter,
	): {
		restoredTasks: number;
		restoredFailures: number;
	} {
		return restoreSchedulerState(
			snapshot,
			new Set(this.tasks.keys()),
			this.failures,
			(id, delayMs, actionToken, actionParams) =>
				this.scheduleOnceAction(id, delayMs, actionToken, actionParams, injector, actionExecuter),
			(id, intervalMs, actionToken, actionParams, maxRuns) =>
				this.scheduleIntervalAction(id, intervalMs, actionToken, actionParams, injector, actionExecuter, { maxRuns }),
			(id, cronExpression, actionToken, actionParams, timezone) =>
				this.scheduleCronAction(id, cronExpression, actionToken, actionParams, injector, actionExecuter, timezone),
		);
	}

	/**
	 * 持久化状态到存储
	 */
	persistState(): { persisted: boolean; tasks: number; failures: number } {
		return persistSchedulerState(this.options?.storage, this.persistedTasks, this.failures);
	}

	/**
	 * 从存储恢复状态
	 */
	recoverState(
		injector: Injector,
		actionExecuter: ActionExecuter,
	): { recovered: boolean; restoredTasks: number; restoredFailures: number } {
		return recoverSchedulerState(
			this.options,
			new Set(this.tasks.keys()),
			this.failures,
			(id, delayMs, actionToken, actionParams) =>
				this.scheduleOnceAction(id, delayMs, actionToken, actionParams, injector, actionExecuter),
			(id, intervalMs, actionToken, actionParams, maxRuns) =>
				this.scheduleIntervalAction(id, intervalMs, actionToken, actionParams, injector, actionExecuter, { maxRuns }),
			(id, cronExpression, actionToken, actionParams, timezone) =>
				this.scheduleCronAction(id, cronExpression, actionToken, actionParams, injector, actionExecuter, timezone),
		);
	}

	/**
	 * 如果启用自动持久化，则持久化状态
	 */
	private persistIfNeeded(): void {
		if (this.options?.autoPersist) {
			this.persistState();
		}
	}
}
