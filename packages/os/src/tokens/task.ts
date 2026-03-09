import type {
    TaskDecomposeRequest,
    TaskDecomposeResponse,
    TaskLoopRequest,
    TaskLoopResponse,
    TaskSubmitRequest,
    TaskSubmitResponse,
} from "../task-runtime/index.js";
import type {
    CancelTaskRequest,
    ClearSchedulerFailuresRequest,
    ListTasksRequest,
    ReplaySchedulerFailureRequest,
    ScheduleIntervalRequest,
    ScheduleOnceRequest,
    SchedulerFailureRecord,
    SchedulerPersistedTask,
} from "../scheduler-service/index.js";
import type { RedactRequest } from "../security-service/index.js";
import { token } from "./shared.js";

// Security Service Response Types
export interface SecurityRedactResponse {
    output: string;
}

// Scheduler Service Response Types
export interface SchedulerCancelResponse {
    cancelled: boolean;
}

export interface SchedulerListResponse {
    taskIds: string[];
}

export interface SchedulerScheduleResponse {
    scheduled: true;
}

export interface SchedulerStateExportResponse {
    tasks: SchedulerPersistedTask[];
    failures: SchedulerFailureRecord[];
}

export interface SchedulerStateImportRequest {
    tasks?: SchedulerPersistedTask[];
    failures?: SchedulerFailureRecord[];
}

export interface SchedulerStateImportResponse {
    restoredTasks: number;
    restoredFailures: number;
}

export interface SchedulerStatePersistResponse {
    persisted: boolean;
    tasks: number;
    failures: number;
}

export interface SchedulerStateRecoverResponse {
    recovered: boolean;
    restoredTasks: number;
    restoredFailures: number;
}

export interface SchedulerFailuresClearResponse {
    cleared: number;
}

export interface SchedulerFailuresReplayResponse {
    replayed: boolean;
}

// Task Runtime Tokens
export const TASK_SUBMIT = token<
    TaskSubmitRequest,
    TaskSubmitResponse,
    "task.submit"
>("task.submit");

export const TASK_DECOMPOSE = token<
    TaskDecomposeRequest,
    TaskDecomposeResponse,
    "task.decompose"
>("task.decompose");

export const TASK_LOOP = token<
    TaskLoopRequest,
    TaskLoopResponse,
    "task.loop"
>("task.loop");

// Security Tokens
export const SECURITY_REDACT = token<RedactRequest, SecurityRedactResponse, "security.redact">("security.redact");

// Scheduler Tokens
export const SCHEDULER_CANCEL = token<CancelTaskRequest, SchedulerCancelResponse, "scheduler.cancel">("scheduler.cancel");

export const SCHEDULER_LIST = token<ListTasksRequest, SchedulerListResponse, "scheduler.list">("scheduler.list");

export const SCHEDULER_SCHEDULE_ONCE = token<ScheduleOnceRequest, SchedulerScheduleResponse, "scheduler.scheduleOnce">("scheduler.scheduleOnce");

export const SCHEDULER_SCHEDULE_INTERVAL = token<ScheduleIntervalRequest, SchedulerScheduleResponse, "scheduler.scheduleInterval">(
    "scheduler.scheduleInterval",
);

export const SCHEDULER_STATE_EXPORT = token<Record<string, never>, SchedulerStateExportResponse, "scheduler.state.export">(
    "scheduler.state.export",
);

export const SCHEDULER_STATE_IMPORT = token<SchedulerStateImportRequest, SchedulerStateImportResponse, "scheduler.state.import">(
    "scheduler.state.import",
);

export const SCHEDULER_STATE_PERSIST = token<Record<string, never>, SchedulerStatePersistResponse, "scheduler.state.persist">(
    "scheduler.state.persist",
);

export const SCHEDULER_STATE_RECOVER = token<Record<string, never>, SchedulerStateRecoverResponse, "scheduler.state.recover">(
    "scheduler.state.recover",
);

export const SCHEDULER_FAILURES_CLEAR = token<ClearSchedulerFailuresRequest, SchedulerFailuresClearResponse, "scheduler.failures.clear">(
    "scheduler.failures.clear",
);

export const SCHEDULER_FAILURES_REPLAY = token<ReplaySchedulerFailureRequest, SchedulerFailuresReplayResponse, "scheduler.failures.replay">(
    "scheduler.failures.replay",
);
