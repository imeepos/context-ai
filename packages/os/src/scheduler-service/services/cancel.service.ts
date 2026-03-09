/**
 * Cancel Service Factory
 * OS service for canceling scheduled tasks.
 */

import { createOSServiceClass } from "../../os-service-class.js";
import { SCHEDULER_CANCEL } from "../../tokens.js";
import type { OSService } from "../../types/os.js";
import type { CancelTaskRequest } from "../types.js";
import { SchedulerService } from "../scheduler.service.js";

export const SchedulerCancelOSService = createOSServiceClass(SCHEDULER_CANCEL, {
	requiredPermissions: ["scheduler:write"],
	execute: ([scheduler]: [SchedulerService], req) => ({ cancelled: scheduler.cancel(req.id) }),
});

export function createSchedulerCancelService(scheduler: SchedulerService): OSService<CancelTaskRequest, { cancelled: boolean }> {
	return new SchedulerCancelOSService(scheduler);
}
