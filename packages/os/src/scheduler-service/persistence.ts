/**
 * Scheduler Persistence Logic
 * Storage adapter and state serialization utilities.
 */

import type {
	SchedulerStateSnapshot,
	SchedulerStateStorageAdapter,
	SchedulerPersistedTask,
	SchedulerFailureRecord,
} from "./types.js";

/**
 * Default storage adapter using a generic store interface.
 */
export class StoreSchedulerStateAdapter implements SchedulerStateStorageAdapter {
	constructor(
		private readonly store: {
			get(key: string): unknown;
			set(key: string, value: unknown): void;
		},
		private readonly key = "scheduler.state",
	) {}

	load(): SchedulerStateSnapshot | undefined {
		const value = this.store.get(this.key);
		if (!value || typeof value !== "object") return undefined;
		const snapshot = value as Partial<SchedulerStateSnapshot>;
		if (!Array.isArray(snapshot.tasks) || !Array.isArray(snapshot.failures)) return undefined;
		return {
			tasks: snapshot.tasks as SchedulerPersistedTask[],
			failures: snapshot.failures as SchedulerFailureRecord[],
		};
	}

	save(snapshot: SchedulerStateSnapshot): void {
		this.store.set(this.key, snapshot);
	}
}

/**
 * Export scheduler state for persistence.
 */
export function exportSchedulerState(
	persistedTasks: Map<string, SchedulerPersistedTask>,
	failures: SchedulerFailureRecord[],
): {
	tasks: SchedulerPersistedTask[];
	failures: SchedulerFailureRecord[];
} {
	return {
		tasks: [...persistedTasks.values()].map((task) => ({ ...task })),
		failures: [...failures],
	};
}
