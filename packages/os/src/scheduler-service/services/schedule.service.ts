/**
 * Schedule Service Factory
 * OS services for scheduling one-time and interval tasks.
 */

import { createOSServiceClass } from "../../os-service-class.js";
import { SCHEDULER_SCHEDULE_ONCE, SCHEDULER_SCHEDULE_INTERVAL } from "../../tokens.js";
import type { OSService } from "../../types/os.js";
import type { ScheduleOnceRequest, ScheduleIntervalRequest } from "../types.js";
import { SchedulerService } from "../scheduler.service.js";

export const SchedulerScheduleOnceOSService = createOSServiceClass(SCHEDULER_SCHEDULE_ONCE, {
	requiredPermissions: ["scheduler:write"],
	execute: ([scheduler]: [SchedulerService], req) => {
		scheduler.scheduleEventOnce(req.id, req.delayMs, req.topic, req.payload);
		return { scheduled: true as const };
	},
});

export function createSchedulerScheduleOnceService(
	scheduler: SchedulerService,
): OSService<ScheduleOnceRequest, { scheduled: true }> {
	return new SchedulerScheduleOnceOSService(scheduler);
}

export const SchedulerScheduleIntervalOSService = createOSServiceClass(SCHEDULER_SCHEDULE_INTERVAL, {
	requiredPermissions: ["scheduler:write"],
	execute: ([scheduler]: [SchedulerService], req) => {
		scheduler.scheduleEventInterval(req.id, req.intervalMs, req.topic, req.payload, {
			maxRuns: req.maxRuns,
		});
		return { scheduled: true as const };
	},
});

export function createSchedulerScheduleIntervalService(
	scheduler: SchedulerService,
): OSService<ScheduleIntervalRequest, { scheduled: true }> {
	return new SchedulerScheduleIntervalOSService(scheduler);
}
