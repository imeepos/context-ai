/**
 * State Service Factory
 * OS services for scheduler state management (export, import, persist, recover).
 */

import { createOSServiceClass } from "../../os-service-class.js";
import {
	SCHEDULER_STATE_EXPORT,
	SCHEDULER_STATE_IMPORT,
	SCHEDULER_STATE_PERSIST,
	SCHEDULER_STATE_RECOVER,
} from "../../tokens.js";
import type { OSService } from "../../types/os.js";
import type { SchedulerPersistedTask, SchedulerFailureRecord } from "../types.js";
import { SchedulerService } from "../scheduler.service.js";

export const SchedulerStateExportOSService = createOSServiceClass(SCHEDULER_STATE_EXPORT, {
	requiredPermissions: ["scheduler:read"],
	execute: ([scheduler]: [SchedulerService]) => scheduler.exportState(),
});

export function createSchedulerStateExportService(
	scheduler: SchedulerService,
): OSService<Record<string, never>, ReturnType<SchedulerService["exportState"]>> {
	return new SchedulerStateExportOSService(scheduler);
}

export const SchedulerStateImportOSService = createOSServiceClass(SCHEDULER_STATE_IMPORT, {
	requiredPermissions: ["scheduler:write"],
	execute: (
		[scheduler]: [SchedulerService],
		req: { tasks?: SchedulerPersistedTask[]; failures?: SchedulerFailureRecord[] },
	) => scheduler.restoreState(req),
});

export function createSchedulerStateImportService(
	scheduler: SchedulerService,
): OSService<
	{ tasks?: SchedulerPersistedTask[]; failures?: SchedulerFailureRecord[] },
	{ restoredTasks: number; restoredFailures: number }
> {
	return new SchedulerStateImportOSService(scheduler);
}

export const SchedulerStatePersistOSService = createOSServiceClass(SCHEDULER_STATE_PERSIST, {
	requiredPermissions: ["scheduler:write"],
	execute: ([scheduler]: [SchedulerService]) => scheduler.persistState(),
});

export function createSchedulerStatePersistService(
	scheduler: SchedulerService,
): OSService<Record<string, never>, { persisted: boolean; tasks: number; failures: number }> {
	return new SchedulerStatePersistOSService(scheduler);
}

export const SchedulerStateRecoverOSService = createOSServiceClass(SCHEDULER_STATE_RECOVER, {
	requiredPermissions: ["scheduler:write"],
	execute: ([scheduler]: [SchedulerService]) => scheduler.recoverState(),
});

export function createSchedulerStateRecoverService(
	scheduler: SchedulerService,
): OSService<Record<string, never>, { recovered: boolean; restoredTasks: number; restoredFailures: number }> {
	return new SchedulerStateRecoverOSService(scheduler);
}
