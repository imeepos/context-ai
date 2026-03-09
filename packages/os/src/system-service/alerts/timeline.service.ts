import type { NotificationService, NotificationSeverity } from "../types.js";
import type { OSService } from "../../types/os.js";
import * as TOKENS from "../../tokens.js";

export interface SystemAlertsTimelineRequest {
	windowMinutes: number;
	bucketMinutes: number;
	topic?: string;
	severity?: NotificationSeverity;
}

export interface SystemAlertsTimelineResponse {
	windowMinutes: number;
	bucketMinutes: number;
	buckets: Array<{
		start: string;
		end: string;
		total: number;
		bySeverity: Partial<Record<NotificationSeverity, number>>;
	}>;
}

export function createSystemAlertsTimelineService(
	notificationService: NotificationService,
): OSService<SystemAlertsTimelineRequest, SystemAlertsTimelineResponse> {
	return {
		name: TOKENS.SYSTEM_ALERTS_TIMELINE,
		requiredPermissions: ["system:read"],
		execute: async (req) => {
			const windowMinutes = req.windowMinutes > 0 ? req.windowMinutes : 60;
			const bucketMinutes = req.bucketMinutes > 0 ? req.bucketMinutes : 5;
			const windowMs = windowMinutes * 60 * 1000;
			const bucketMs = bucketMinutes * 60 * 1000;
			const nowMs = Date.now();
			const startMs = nowMs - windowMs;
			const bucketCount = Math.max(1, Math.ceil(windowMs / bucketMs));
			const buckets = Array.from({ length: bucketCount }, (_, index) => {
				const start = startMs + index * bucketMs;
				const end = start + bucketMs;
				return {
					start: new Date(start).toISOString(),
					end: new Date(end).toISOString(),
					total: 0,
					bySeverity: {} as Partial<Record<NotificationSeverity, number>>,
				};
			});
			const alerts = notificationService.query({
				topic: req.topic,
				severity: req.severity,
				since: new Date(startMs).toISOString(),
			});
			for (const alert of alerts) {
				const ts = Date.parse(alert.timestamp);
				if (Number.isNaN(ts) || ts < startMs || ts >= startMs + bucketCount * bucketMs) {
					continue;
				}
				const index = Math.floor((ts - startMs) / bucketMs);
				const bucket = buckets[index];
				if (!bucket) continue;
				bucket.total += 1;
				bucket.bySeverity[alert.severity] = (bucket.bySeverity[alert.severity] ?? 0) + 1;
			}
			return {
				windowMinutes,
				bucketMinutes,
				buckets,
			}
		},
	};
}
