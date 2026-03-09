import type { NotificationService } from "../types.js";
import type { OSService } from "../../types/os.js";
import * as TOKENS from "../../tokens.js";
import type { SystemAlertsReportCompactResponse } from "./types.js";

export function createSystemAlertsReportCompactService(
	notificationService: NotificationService,
): OSService<{ topic?: string; windowMinutes?: number }, SystemAlertsReportCompactResponse> {
	return {
		name: TOKENS.SYSTEM_ALERTS_REPORT_COMPACT,
		requiredPermissions: ["system:read"],
		execute: async (req) => {
			const alerts = notificationService.query({
				topic: req.topic,
			});
			const unacked = alerts.filter((alert) => !alert.acknowledged);
			const critical = alerts.filter((alert) => alert.severity === "critical");

			const summary = `Alerts: ${alerts.length} total, ${unacked.length} unacked, ${critical.length} critical`;
			return { summary };
		},
	};
}
