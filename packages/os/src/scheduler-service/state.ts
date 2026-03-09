/**
 * Scheduler State Management
 * Functions for restoring and managing scheduler state.
 */

import type {
	SchedulerPersistedTask,
	SchedulerFailureRecord,
	SchedulerStateStorageAdapter,
	SchedulerServiceOptions,
} from "./types.js";
import { exportSchedulerState } from "./persistence.js";

export interface RestoreResult {
	restoredTasks: number;
	restoredFailures: number;
}

export interface PersistResult {
	persisted: boolean;
	tasks: number;
	failures: number;
}

export interface RecoverResult {
	recovered: boolean;
	restoredTasks: number;
	restoredFailures: number;
}

/**
 * Restore scheduler state from a snapshot.
 * Returns callbacks that the scheduler can use to schedule tasks.
 */
export function restoreSchedulerState(
	snapshot: { tasks?: SchedulerPersistedTask[]; failures?: SchedulerFailureRecord[] },
	existingTaskIds: Set<string>,
	scheduleEventOnce: (id: string, delayMs: number, topic: string, payload: unknown) => void,
	scheduleEventInterval: (id: string, intervalMs: number, topic: string, payload: unknown, maxRuns?: number) => void,
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
 * Persist scheduler state to storage.
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
 * Recover scheduler state from storage.
 */
export function recoverSchedulerState(
	options: SchedulerServiceOptions | undefined,
	existingTaskIds: Set<string>,
	scheduleEventOnce: (id: string, delayMs: number, topic: string, payload: unknown) => void,
	scheduleEventInterval: (id: string, intervalMs: number, topic: string, payload: unknown, maxRuns?: number) => void,
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
		failures,
	);

	return {
		recovered: true,
		restoredTasks: restored.restoredTasks,
		restoredFailures: restored.restoredFailures,
	};
}
