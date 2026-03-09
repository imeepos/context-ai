/**
 * Scheduler Service Types
 * All interfaces and types for the scheduler service.
 */

export interface ScheduledTask {
	id: string;
	name: string;
}

export interface TaskHandle {
	stop: () => void;
}

export interface SchedulerFailureRecord {
	id: string;
	attempt: number;
	error: string;
	timestamp: string;
}

export interface RetryableTaskDefinition {
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

// Request types for OS services
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

export interface SchedulerServiceOptions {
	storage?: SchedulerStateStorageAdapter;
	autoPersist?: boolean;
}
