/**
 * Scheduler Service Core Class
 * Main scheduler implementation with task scheduling and failure handling.
 */

import { OSError } from "../kernel/errors.js";
import type { EventBus } from "../kernel/event-bus.js";
import type {
	ScheduledTask,
	TaskHandle,
	SchedulerFailureRecord,
	RetryableTaskDefinition,
	SchedulerPersistedTask,
	SchedulerServiceOptions,
} from "./types.js";
import { exportSchedulerState } from "./persistence.js";
import { restoreSchedulerState, persistSchedulerState, recoverSchedulerState } from "./state.js";

export class SchedulerService {
	private readonly tasks = new Map<string, TaskHandle>();
	private readonly failures: SchedulerFailureRecord[] = [];
	private readonly retryableDefinitions = new Map<string, RetryableTaskDefinition>();
	private readonly persistedTasks = new Map<string, SchedulerPersistedTask>();

	constructor(
		private readonly eventBus?: EventBus,
		private readonly options?: SchedulerServiceOptions,
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
		return exportSchedulerState(this.persistedTasks, this.failures);
	}

	restoreState(snapshot: { tasks?: SchedulerPersistedTask[]; failures?: SchedulerFailureRecord[] }): {
		restoredTasks: number;
		restoredFailures: number;
	} {
		return restoreSchedulerState(
			snapshot,
			new Set(this.tasks.keys()),
			(id, delayMs, topic, payload) => this.scheduleEventOnce(id, delayMs, topic, payload),
			(id, intervalMs, topic, payload, maxRuns) => this.scheduleEventInterval(id, intervalMs, topic, payload, { maxRuns }),
			this.failures,
		);
	}

	persistState(): { persisted: boolean; tasks: number; failures: number } {
		return persistSchedulerState(this.options?.storage, this.persistedTasks, this.failures);
	}

	recoverState(): { recovered: boolean; restoredTasks: number; restoredFailures: number } {
		return recoverSchedulerState(
			this.options,
			new Set(this.tasks.keys()),
			(id, delayMs, topic, payload) => this.scheduleEventOnce(id, delayMs, topic, payload),
			(id, intervalMs, topic, payload, maxRuns) => this.scheduleEventInterval(id, intervalMs, topic, payload, { maxRuns }),
			this.failures,
		);
	}

	private persistIfNeeded(): void {
		if (this.options?.autoPersist) {
			this.persistState();
		}
	}
}
