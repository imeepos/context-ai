import {
	SchedulerCancelOSService,
	SchedulerFailuresClearOSService,
	SchedulerFailuresReplayOSService,
	SchedulerListOSService,
	SchedulerScheduleIntervalOSService,
	SchedulerScheduleOnceOSService,
	SchedulerStateExportOSService,
	SchedulerStateImportOSService,
	SchedulerStatePersistOSService,
	SchedulerStateRecoverOSService,
} from "../../scheduler-service/index.js";
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
} from "../../tokens.js";
import { OS_SCHEDULER } from "../tokens.js";
import { defineInjectableOSService } from "./definition.js";

export const PLATFORM_SCHEDULER_SERVICE_DEFINITIONS = [
	defineInjectableOSService(SCHEDULER_SCHEDULE_ONCE, SchedulerScheduleOnceOSService, [OS_SCHEDULER] as const),
	defineInjectableOSService(
		SCHEDULER_SCHEDULE_INTERVAL,
		SchedulerScheduleIntervalOSService,
		[OS_SCHEDULER] as const,
	),
	defineInjectableOSService(SCHEDULER_CANCEL, SchedulerCancelOSService, [OS_SCHEDULER] as const),
	defineInjectableOSService(SCHEDULER_LIST, SchedulerListOSService, [OS_SCHEDULER] as const),
	defineInjectableOSService(
		SCHEDULER_FAILURES_CLEAR,
		SchedulerFailuresClearOSService,
		[OS_SCHEDULER] as const,
	),
	defineInjectableOSService(
		SCHEDULER_FAILURES_REPLAY,
		SchedulerFailuresReplayOSService,
		[OS_SCHEDULER] as const,
	),
	defineInjectableOSService(SCHEDULER_STATE_EXPORT, SchedulerStateExportOSService, [OS_SCHEDULER] as const),
	defineInjectableOSService(SCHEDULER_STATE_IMPORT, SchedulerStateImportOSService, [OS_SCHEDULER] as const),
	defineInjectableOSService(SCHEDULER_STATE_PERSIST, SchedulerStatePersistOSService, [OS_SCHEDULER] as const),
	defineInjectableOSService(SCHEDULER_STATE_RECOVER, SchedulerStateRecoverOSService, [OS_SCHEDULER] as const),
] as const;
