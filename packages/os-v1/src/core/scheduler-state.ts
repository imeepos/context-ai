/**
 * Scheduler State Management
 * 调度器状态管理 - 恢复、持久化、导入导出
 */

import type {
	SchedulerPersistedTask,
	SchedulerFailureRecord,
	SchedulerStateStorageAdapter,
	SchedulerServiceOptions,
} from "./scheduler-types.js";
import { exportSchedulerState } from "./scheduler-persistence.js";

/**
 * 恢复结果
 */
export interface RestoreResult {
	/** 恢复的任务数量 */
	restoredTasks: number;
	/** 恢复的失败记录数量 */
	restoredFailures: number;
}

/**
 * 持久化结果
 */
export interface PersistResult {
	/** 是否成功持久化 */
	persisted: boolean;
	/** 持久化的任务数量 */
	tasks: number;
	/** 持久化的失败记录数量 */
	failures: number;
}

/**
 * 恢复结果
 */
export interface RecoverResult {
	/** 是否成功恢复 */
	recovered: boolean;
	/** 恢复的任务数量 */
	restoredTasks: number;
	/** 恢复的失败记录数量 */
	restoredFailures: number;
}

/**
 * 从快照恢复调度器状态
 */
export function restoreSchedulerState(
	snapshot: { tasks?: SchedulerPersistedTask[]; failures?: SchedulerFailureRecord[] },
	existingTaskIds: Set<string>,
	scheduleEventOnce: (id: string, delayMs: number, topic: string, payload: unknown) => void,
	scheduleEventInterval: (id: string, intervalMs: number, topic: string, payload: unknown, maxRuns?: number) => void,
	scheduleEventCron: (id: string, cronExpression: string, topic: string, payload: unknown, timezone?: string) => void,
	failures: SchedulerFailureRecord[],
): RestoreResult {
	let restoredTasks = 0;

	if (snapshot.tasks) {
		for (const task of snapshot.tasks) {
			if (existingTaskIds.has(task.id)) continue;

			if (task.type === "once") {
				const runAtMs = task.runAt ? Date.parse(task.runAt) : Date.now();
				const delayMs = Math.max(0, runAtMs - Date.now());
				scheduleEventOnce(task.id, delayMs, task.topic, task.payload);
				restoredTasks += 1;
				continue;
			}

			if (task.type === "interval" && task.intervalMs && task.intervalMs > 0) {
				scheduleEventInterval(task.id, task.intervalMs, task.topic, task.payload, task.maxRuns);
				restoredTasks += 1;
				continue;
			}

			if (task.type === "cron" && task.cronExpression) {
				scheduleEventCron(task.id, task.cronExpression, task.topic, task.payload, task.timezone);
				restoredTasks += 1;
			}
		}
	}

	let restoredFailures = 0;
	if (snapshot.failures && snapshot.failures.length > 0) {
		failures.push(...snapshot.failures);
		restoredFailures = snapshot.failures.length;
	}

	return { restoredTasks, restoredFailures };
}

/**
 * 持久化调度器状态到存储
 */
export function persistSchedulerState(
	storage: SchedulerStateStorageAdapter | undefined,
	persistedTasks: Map<string, SchedulerPersistedTask>,
	failures: SchedulerFailureRecord[],
): PersistResult {
	if (!storage) {
		return { persisted: false, tasks: persistedTasks.size, failures: failures.length };
	}

	const snapshot = exportSchedulerState(persistedTasks, failures);
	storage.save(snapshot);
	return { persisted: true, tasks: snapshot.tasks.length, failures: snapshot.failures.length };
}

/**
 * 从存储恢复调度器状态
 */
export function recoverSchedulerState(
	options: SchedulerServiceOptions | undefined,
	existingTaskIds: Set<string>,
	scheduleEventOnce: (id: string, delayMs: number, topic: string, payload: unknown) => void,
	scheduleEventInterval: (id: string, intervalMs: number, topic: string, payload: unknown, maxRuns?: number) => void,
	scheduleEventCron: (id: string, cronExpression: string, topic: string, payload: unknown, timezone?: string) => void,
	failures: SchedulerFailureRecord[],
): RecoverResult {
	if (!options?.storage) {
		return { recovered: false, restoredTasks: 0, restoredFailures: 0 };
	}

	const snapshot = options.storage.load();
	if (!snapshot) {
		return { recovered: true, restoredTasks: 0, restoredFailures: 0 };
	}

	const restored = restoreSchedulerState(
		snapshot,
		existingTaskIds,
		scheduleEventOnce,
		scheduleEventInterval,
		scheduleEventCron,
		failures,
	);

	return {
		recovered: true,
		restoredTasks: restored.restoredTasks,
		restoredFailures: restored.restoredFailures,
	};
}
