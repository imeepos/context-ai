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

export class SchedulerService {
	private readonly tasks = new Map<string, TaskHandle>();
	private readonly failures: SchedulerFailureRecord[] = [];
	private readonly retryableDefinitions = new Map<string, RetryableTaskDefinition>();
	constructor(private readonly eventBus?: EventBus) {}

	publishEvent(topic: string, payload?: unknown): void {
		this.eventBus?.publish(topic, payload ?? null);
	}

	scheduleInterval(id: string, intervalMs: number, fn: () => void, options?: { maxRuns?: number }): ScheduledTask {
		if (this.tasks.has(id)) throw new Error(`Task already exists: ${id}`);
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
		return { id, name: "interval" };
	}

	scheduleOnce(id: string, delayMs: number, fn: () => void): ScheduledTask {
		if (this.tasks.has(id)) throw new Error(`Task already exists: ${id}`);
		const timer = setTimeout(() => {
			fn();
			this.tasks.delete(id);
		}, delayMs);
		this.tasks.set(id, { stop: () => clearTimeout(timer) });
		return { id, name: "timeout" };
	}

	cancel(id: string): boolean {
		const task = this.tasks.get(id);
		if (!task) return false;
		task.stop();
		this.tasks.delete(id);
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
			return count;
		}
		const before = this.failures.length;
		const retained = this.failures.filter((item) => item.id !== id);
		this.failures.length = 0;
		this.failures.push(...retained);
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
		if (this.tasks.has(id)) throw new Error(`Task already exists: ${id}`);
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
		return { id, name: "retryable" };
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
		name: "scheduler.cancel",
		requiredPermissions: ["scheduler:write"],
		execute: async (req) => ({ cancelled: scheduler.cancel(req.id) }),
	};
}

export function createSchedulerListService(
	scheduler: SchedulerService,
): OSService<ListTasksRequest, { taskIds: string[] }> {
	return {
		name: "scheduler.list",
		requiredPermissions: ["scheduler:read"],
		execute: async () => ({ taskIds: scheduler.list() }),
	};
}

export function createSchedulerScheduleOnceService(
	scheduler: SchedulerService,
): OSService<ScheduleOnceRequest, { scheduled: true }> {
	return {
		name: "scheduler.scheduleOnce",
		requiredPermissions: ["scheduler:write"],
		execute: async (req) => {
			scheduler.scheduleOnce(req.id, req.delayMs, () => {
				scheduler.publishEvent(req.topic, req.payload);
			});
			return { scheduled: true };
		},
	};
}

export function createSchedulerScheduleIntervalService(
	scheduler: SchedulerService,
): OSService<ScheduleIntervalRequest, { scheduled: true }> {
	return {
		name: "scheduler.scheduleInterval",
		requiredPermissions: ["scheduler:write"],
		execute: async (req) => {
			scheduler.scheduleInterval(
				req.id,
				req.intervalMs,
				() => {
					scheduler.publishEvent(req.topic, req.payload);
				},
				{ maxRuns: req.maxRuns },
			);
			return { scheduled: true };
		},
	};
}

export function createSchedulerFailuresClearService(
	scheduler: SchedulerService,
): OSService<ClearSchedulerFailuresRequest, { cleared: number }> {
	return {
		name: "scheduler.failures.clear",
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
		name: "scheduler.failures.replay",
		requiredPermissions: ["scheduler:write"],
		execute: async (req) => ({
			replayed: scheduler.replayFailure(req.id),
		}),
	};
}
