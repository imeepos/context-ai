import type { NotificationService, NotificationSeverity } from "../types.js";
import type { OSService } from "../../types/os.js";
import * as TOKENS from "../../tokens.js";
import type {
	SystemAlertsBacklogRequest,
	SystemAlertsBacklogResponse,
} from "./types.js";

export function createSystemAlertsBacklogService(
	notificationService: NotificationService,
): OSService<SystemAlertsBacklogRequest, SystemAlertsBacklogResponse> {
	return {
		name: TOKENS.SYSTEM_ALERTS_BACKLOG,
		requiredPermissions: ["system:read"],
		execute: async (req) => {
			const overdueThresholdMs = req.overdueThresholdMs ?? 300000;
			const alerts = notificationService.query({
				topic: req.topic,
				severity: req.severity,
				acknowledged: false,
			});

			const bySeverity: Record<NotificationSeverity, number> = {
				info: 0,
				warning: 0,
				error: 0,
				critical: 0,
			};

			let oldestUnackedAgeMs = 0;
			let newestUnackedAgeMs = 0;
			let overdueCount = 0;
			const now = Date.now();

			for (const alert of alerts) {
				bySeverity[alert.severity] = (bySeverity[alert.severity] ?? 0) + 1;
				const ageMs = Math.max(0, now - new Date(alert.timestamp).getTime());
				if (ageMs > oldestUnackedAgeMs) {
					oldestUnackedAgeMs = ageMs;
				}
				if (newestUnackedAgeMs === 0 || ageMs < newestUnackedAgeMs) {
					newestUnackedAgeMs = ageMs;
				}
				if (ageMs >= overdueThresholdMs) {
					overdueCount += 1;
				}
			}

			return {
				totalUnacked: alerts.length,
				oldestUnackedAgeMs,
				newestUnackedAgeMs: alerts.length > 0 ? newestUnackedAgeMs : 0,
				overdueCount,
				overdueThresholdMs,
				bySeverity,
			};
		},
	};
}
