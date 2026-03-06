import { OSError } from "../kernel/errors.js";
import {
	SCHEDULER_CANCEL,
	SCHEDULER_FAILURES_CLEAR,
	SCHEDULER_FAILURES_REPLAY,
	SCHEDULER_LIST,
	SCHEDULER_SCHEDULE_INTERVAL,
	SCHEDULER_SCHEDULE_ONCE,
	SCHEDULER_STATE_EXPORT,
	SCHEDULER_STATE_IMPORT,
	SCHEDULER_STATE_PERSIST,
	SCHEDULER_STATE_RECOVER,
} from "../tokens.js";
import type { OSService } from "../types/os.js";
import type { EventBus } from "../kernel/event-bus.js";

export interface ScheduledTask {
	id: string;
	name: string;
}

interface TaskHandle {
	stop: () => void;
}

export interface SchedulerFailureRecord {
	id: string;
	attempt: number;
	error: string;
	timestamp: string;
}

interface RetryableTaskDefinition {
	task: () => Promise<void>;
	options: {
		maxRetries: number;
		backoffMs: number;
	};
}

export interface SchedulerPersistedTask {
	id: string;
	type: "once" | "interval";
	topic: string;
	payload?: unknown;
	runAt?: string;
	intervalMs?: number;
	maxRuns?: number;
	runs?: number;
}

export interface SchedulerStateSnapshot {
	tasks: SchedulerPersistedTask[];
	failures: SchedulerFailureRecord[];
}

export interface SchedulerStateStorageAdapter {
	load(): SchedulerStateSnapshot | undefined;
	save(snapshot: SchedulerStateSnapshot): void;
}

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

export class SchedulerService {
	private readonly tasks = new Map<string, TaskHandle>();
	private readonly failures: SchedulerFailureRecord[] = [];
	private readonly retryableDefinitions = new Map<string, RetryableTaskDefinition>();
	private readonly persistedTasks = new Map<string, SchedulerPersistedTask>();
	constructor(
		private readonly eventBus?: EventBus,
		private readonly options?: {
			storage?: SchedulerStateStorageAdapter;
			autoPersist?: boolean;
		},
	) {}

	publishEvent(topic: string, payload?: unknown): void {
		this.eventBus?.publish(topic, payload ?? null);
	}

	scheduleInterval(id: string, intervalMs: number, fn: () => void, options?: { maxRuns?: number }): ScheduledTask {
		if (this.tasks.has(id)) throw new OSError("E_VALIDATION_FAILED", `Task already exists: ${id}`);
		let runs = 0;
		const timer = setInterval(fn, intervalMs);
		if (options?.maxRuns && options.maxRuns > 0) {
			const wrapped = () => {
				runs += 1;
				fn();
				if (runs >= options.maxRuns!) {
					this.cancel(id);
				}
			};
			clearInterval(timer);
			const controlled = setInterval(wrapped, intervalMs);
			this.tasks.set(id, { stop: () => clearInterval(controlled) });
			return { id, name: "interval" };
		}
		this.tasks.set(id, { stop: () => clearInterval(timer) });
		this.persistIfNeeded();
		return { id, name: "interval" };
	}

	scheduleOnce(id: string, delayMs: number, fn: () => void): ScheduledTask {
		if (this.tasks.has(id)) throw new OSError("E_VALIDATION_FAILED", `Task already exists: ${id}`);
		const timer = setTimeout(() => {
			fn();
			this.tasks.delete(id);
		}, delayMs);
		this.tasks.set(id, { stop: () => clearTimeout(timer) });
		this.persistIfNeeded();
		return { id, name: "timeout" };
	}

	scheduleEventOnce(id: string, delayMs: number, topic: string, payload?: unknown): ScheduledTask {
		const runAt = Date.now() + delayMs;
		this.persistedTasks.set(id, {
			id,
			type: "once",
			topic,
			payload,
			runAt: new Date(runAt).toISOString(),
		});
		this.persistIfNeeded();
		return this.scheduleOnce(id, delayMs, () => {
			this.publishEvent(topic, payload);
			this.persistedTasks.delete(id);
			this.persistIfNeeded();
		});
	}

	scheduleEventInterval(
		id: string,
		intervalMs: number,
		topic: string,
		payload?: unknown,
		options?: { maxRuns?: number },
	): ScheduledTask {
		let runs = 0;
		this.persistedTasks.set(id, {
			id,
			type: "interval",
			topic,
			payload,
			intervalMs,
			maxRuns: options?.maxRuns,
			runs: 0,
		});
		this.persistIfNeeded();
		return this.scheduleInterval(
			id,
			intervalMs,
			() => {
				runs += 1;
				this.publishEvent(topic, payload);
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

	cancel(id: string): boolean {
		const task = this.tasks.get(id);
		if (!task) return false;
		task.stop();
		this.tasks.delete(id);
		this.persistedTasks.delete(id);
		this.persistIfNeeded();
		return true;
	}

	list(): string[] {
		return [...this.tasks.keys()];
	}

	listFailures(limit?: number): SchedulerFailureRecord[] {
		if (!limit || limit <= 0) {
			return [...this.failures];
		}
		return this.failures.slice(-limit);
	}

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

	scheduleRetryable(
		id: string,
		task: () => Promise<void>,
		options: {
			maxRetries: number;
			backoffMs: number;
		},
	): ScheduledTask {
		if (this.tasks.has(id)) throw new OSError("E_VALIDATION_FAILED", `Task already exists: ${id}`);
		this.retryableDefinitions.set(id, { task, options });

		let cancelled = false;
		const run = async (attempt: number): Promise<void> => {
			if (cancelled) return;
			try {
				await task();
				this.tasks.delete(id);
				this.clearFailures(id);
				this.eventBus?.publish("scheduler.task.succeeded", {
					id,
					attempt,
				});
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
					return;
				}
				this.eventBus?.publish("scheduler.task.retried", {
					id,
					attempt,
				});
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
		return { id, name: "retryable" };
	}

	exportState(): {
		tasks: SchedulerPersistedTask[];
		failures: SchedulerFailureRecord[];
	} {
		return {
			tasks: [...this.persistedTasks.values()].map((task) => ({ ...task })),
			failures: this.listFailures(),
		};
	}

	restoreState(snapshot: { tasks?: SchedulerPersistedTask[]; failures?: SchedulerFailureRecord[] }): {
		restoredTasks: number;
		restoredFailures: number;
	} {
		let restoredTasks = 0;
		if (snapshot.tasks) {
			for (const task of snapshot.tasks) {
				if (this.tasks.has(task.id)) continue;
				if (task.type === "once") {
					const runAtMs = task.runAt ? Date.parse(task.runAt) : Date.now();
					const delayMs = Math.max(0, runAtMs - Date.now());
					this.scheduleEventOnce(task.id, delayMs, task.topic, task.payload);
					restoredTasks += 1;
					continue;
				}
				if (task.type === "interval" && task.intervalMs && task.intervalMs > 0) {
					this.scheduleEventInterval(task.id, task.intervalMs, task.topic, task.payload, {
						maxRuns: task.maxRuns,
					});
					restoredTasks += 1;
				}
			}
		}

		let restoredFailures = 0;
		if (snapshot.failures && snapshot.failures.length > 0) {
			this.failures.push(...snapshot.failures);
			restoredFailures = snapshot.failures.length;
		}
		return { restoredTasks, restoredFailures };
	}

	persistState(): { persisted: boolean; tasks: number; failures: number } {
		if (!this.options?.storage) {
			return { persisted: false, tasks: this.persistedTasks.size, failures: this.failures.length };
		}
		const snapshot = this.exportState();
		this.options.storage.save(snapshot);
		return { persisted: true, tasks: snapshot.tasks.length, failures: snapshot.failures.length };
	}

	recoverState(): { recovered: boolean; restoredTasks: number; restoredFailures: number } {
		if (!this.options?.storage) {
			return { recovered: false, restoredTasks: 0, restoredFailures: 0 };
		}
		const snapshot = this.options.storage.load();
		if (!snapshot) {
			return { recovered: true, restoredTasks: 0, restoredFailures: 0 };
		}
		const restored = this.restoreState(snapshot);
		return {
			recovered: true,
			restoredTasks: restored.restoredTasks,
			restoredFailures: restored.restoredFailures,
		};
	}

	private persistIfNeeded(): void {
		if (this.options?.autoPersist) {
			this.persistState();
		}
	}
}

export interface CancelTaskRequest {
	id: string;
}

export interface ListTasksRequest {
	readonly _: "list";
}

export interface ScheduleOnceRequest {
	id: string;
	delayMs: number;
	topic: string;
	payload?: unknown;
}

export interface ScheduleIntervalRequest {
	id: string;
	intervalMs: number;
	topic: string;
	payload?: unknown;
	maxRuns?: number;
}

export interface ClearSchedulerFailuresRequest {
	id?: string;
}

export interface ReplaySchedulerFailureRequest {
	id: string;
}

export function createSchedulerCancelService(scheduler: SchedulerService): OSService<CancelTaskRequest, { cancelled: boolean }> {
	return {
		name: SCHEDULER_CANCEL,
		requiredPermissions: ["scheduler:write"],
		execute: async (req) => ({ cancelled: scheduler.cancel(req.id) }),
	};
}

export function createSchedulerListService(
	scheduler: SchedulerService,
): OSService<ListTasksRequest, { taskIds: string[] }> {
	return {
		name: SCHEDULER_LIST,
		requiredPermissions: ["scheduler:read"],
		execute: async () => ({ taskIds: scheduler.list() }),
	};
}

export function createSchedulerScheduleOnceService(
	scheduler: SchedulerService,
): OSService<ScheduleOnceRequest, { scheduled: true }> {
	return {
		name: SCHEDULER_SCHEDULE_ONCE,
		requiredPermissions: ["scheduler:write"],
		execute: async (req) => {
			scheduler.scheduleEventOnce(req.id, req.delayMs, req.topic, req.payload);
			return { scheduled: true };
		},
	};
}

export function createSchedulerScheduleIntervalService(
	scheduler: SchedulerService,
): OSService<ScheduleIntervalRequest, { scheduled: true }> {
	return {
		name: SCHEDULER_SCHEDULE_INTERVAL,
		requiredPermissions: ["scheduler:write"],
		execute: async (req) => {
			scheduler.scheduleEventInterval(req.id, req.intervalMs, req.topic, req.payload, {
				maxRuns: req.maxRuns,
			});
			return { scheduled: true };
		},
	};
}

export function createSchedulerStateExportService(
	scheduler: SchedulerService,
): OSService<Record<string, never>, ReturnType<SchedulerService["exportState"]>> {
	return {
		name: SCHEDULER_STATE_EXPORT,
		requiredPermissions: ["scheduler:read"],
		execute: async () => scheduler.exportState(),
	};
}

export function createSchedulerStateImportService(
	scheduler: SchedulerService,
): OSService<
	{
		tasks?: SchedulerPersistedTask[];
		failures?: SchedulerFailureRecord[];
	},
	{
		restoredTasks: number;
		restoredFailures: number;
	}
> {
	return {
		name: SCHEDULER_STATE_IMPORT,
		requiredPermissions: ["scheduler:write"],
		execute: async (req) => scheduler.restoreState(req),
	};
}

export function createSchedulerStatePersistService(
	scheduler: SchedulerService,
): OSService<Record<string, never>, { persisted: boolean; tasks: number; failures: number }> {
	return {
		name: SCHEDULER_STATE_PERSIST,
		requiredPermissions: ["scheduler:write"],
		execute: async () => scheduler.persistState(),
	};
}

export function createSchedulerStateRecoverService(
	scheduler: SchedulerService,
): OSService<Record<string, never>, { recovered: boolean; restoredTasks: number; restoredFailures: number }> {
	return {
		name: SCHEDULER_STATE_RECOVER,
		requiredPermissions: ["scheduler:write"],
		execute: async () => scheduler.recoverState(),
	};
}

export function createSchedulerFailuresClearService(
	scheduler: SchedulerService,
): OSService<ClearSchedulerFailuresRequest, { cleared: number }> {
	return {
		name: SCHEDULER_FAILURES_CLEAR,
		requiredPermissions: ["scheduler:write"],
		execute: async (req) => ({
			cleared: scheduler.clearFailures(req.id),
		}),
	};
}

export function createSchedulerFailuresReplayService(
	scheduler: SchedulerService,
): OSService<ReplaySchedulerFailureRequest, { replayed: boolean }> {
	return {
		name: SCHEDULER_FAILURES_REPLAY,
		requiredPermissions: ["scheduler:write"],
		execute: async (req) => ({
			replayed: scheduler.replayFailure(req.id),
		}),
	};
}
