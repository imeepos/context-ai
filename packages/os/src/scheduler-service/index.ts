/**
 * Scheduler Service Module
 * Public API for scheduler service and related OS services.
 */

// Core types
export type {
	ScheduledTask,
	TaskHandle,
	SchedulerFailureRecord,
	RetryableTaskDefinition,
	SchedulerPersistedTask,
	SchedulerStateSnapshot,
	SchedulerStateStorageAdapter,
	CancelTaskRequest,
	ListTasksRequest,
	ScheduleOnceRequest,
	ScheduleIntervalRequest,
	ClearSchedulerFailuresRequest,
	ReplaySchedulerFailureRequest,
	SchedulerServiceOptions,
} from "./types.js";

// Core service class
export { SchedulerService } from "./scheduler.service.js";

// Persistence utilities
export { StoreSchedulerStateAdapter, exportSchedulerState } from "./persistence.js";

// State management utilities
export type { RestoreResult, PersistResult, RecoverResult } from "./state.js";
export { restoreSchedulerState, persistSchedulerState, recoverSchedulerState } from "./state.js";

// OS Service factories
export {
	// Schedule services
	SchedulerScheduleOnceOSService,
	createSchedulerScheduleOnceService,
	SchedulerScheduleIntervalOSService,
	createSchedulerScheduleIntervalService,
	// Cancel service
	SchedulerCancelOSService,
	createSchedulerCancelService,
	// List service
	SchedulerListOSService,
	createSchedulerListService,
	// Failures services
	SchedulerFailuresClearOSService,
	createSchedulerFailuresClearService,
	SchedulerFailuresReplayOSService,
	createSchedulerFailuresReplayService,
	// State services
	SchedulerStateExportOSService,
	createSchedulerStateExportService,
	SchedulerStateImportOSService,
	createSchedulerStateImportService,
	SchedulerStatePersistOSService,
	createSchedulerStatePersistService,
	SchedulerStateRecoverOSService,
	createSchedulerStateRecoverService,
} from "./services/index.js";
