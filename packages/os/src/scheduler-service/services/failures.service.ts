/**
 * Failures Service Factory
 * OS services for managing scheduler failures.
 */

import { createOSServiceClass } from "../../os-service-class.js";
import { SCHEDULER_FAILURES_CLEAR, SCHEDULER_FAILURES_REPLAY } from "../../tokens.js";
import type { OSService } from "../../types/os.js";
import type { ClearSchedulerFailuresRequest, ReplaySchedulerFailureRequest } from "../types.js";
import { SchedulerService } from "../scheduler.service.js";

export const SchedulerFailuresClearOSService = createOSServiceClass(SCHEDULER_FAILURES_CLEAR, {
	requiredPermissions: ["scheduler:write"],
	execute: ([scheduler]: [SchedulerService], req) => ({
		cleared: scheduler.clearFailures(req.id),
	}),
});

export function createSchedulerFailuresClearService(
	scheduler: SchedulerService,
): OSService<ClearSchedulerFailuresRequest, { cleared: number }> {
	return new SchedulerFailuresClearOSService(scheduler);
}

export const SchedulerFailuresReplayOSService = createOSServiceClass(SCHEDULER_FAILURES_REPLAY, {
	requiredPermissions: ["scheduler:write"],
	execute: ([scheduler]: [SchedulerService], req) => ({
		replayed: scheduler.replayFailure(req.id),
	}),
});

export function createSchedulerFailuresReplayService(
	scheduler: SchedulerService,
): OSService<ReplaySchedulerFailureRequest, { replayed: boolean }> {
	return new SchedulerFailuresReplayOSService(scheduler);
}
