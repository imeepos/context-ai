/**
 * List Service Factory
 * OS service for listing scheduled tasks.
 */

import { createOSServiceClass } from "../../os-service-class.js";
import { SCHEDULER_LIST } from "../../tokens.js";
import type { OSService } from "../../types/os.js";
import type { ListTasksRequest } from "../types.js";
import { SchedulerService } from "../scheduler.service.js";

export const SchedulerListOSService = createOSServiceClass(SCHEDULER_LIST, {
	requiredPermissions: ["scheduler:read"],
	execute: ([scheduler]: [SchedulerService]) => ({ taskIds: scheduler.list() }),
});

export function createSchedulerListService(
	scheduler: SchedulerService,
): OSService<ListTasksRequest, { taskIds: string[] }> {
	return new SchedulerListOSService(scheduler);
}
