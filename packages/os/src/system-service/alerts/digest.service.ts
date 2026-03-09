import type { NotificationService, NotificationSeverity } from "../types.js";
import type { OSService } from "../../types/os.js";
import * as TOKENS from "../../tokens.js";

export interface SystemAlertsDigestRequest {
	topic?: string;
	limit?: number;
}

export interface SystemAlertsDigestResponse {
	total: number;
	digest: string;
}

export function createSystemAlertsDigestService(
	notificationService: NotificationService,
): OSService<SystemAlertsDigestRequest, SystemAlertsDigestResponse> {
	return {
		name: TOKENS.SYSTEM_ALERTS_DIGEST,
		requiredPermissions: ["system:read"],
		execute: async (req) => {
			const alerts = notificationService.query({
				topic: req.topic,
				acknowledged: false,
				limit: req.limit,
			});
			const bySeverity: Partial<Record<NotificationSeverity, number>> = {};
			for (const alert of alerts) {
				bySeverity[alert.severity] = (bySeverity[alert.severity] ?? 0) + 1;
			}

			const severitySummary = ["critical", "error", "warning", "info"]
				.filter((level) => (bySeverity[level as NotificationSeverity] ?? 0) > 0)
				.map((level) => `${level}:${bySeverity[level as NotificationSeverity]}`)
				.join(", ");

			const topIncidents = [...alerts]
				.sort((a, b) => a.topic.localeCompare(b.topic))
				.slice(0, 5)
				.map((item) => `[${item.severity}] ${item.message}`)
				.join("; ");

			const digest =
				alerts.length === 0
					? "No unacked alerts."
					: `Unacked alerts=${alerts.length}. Severity(${severitySummary}). Top incidents: ${topIncidents}`;

			return {
				total: alerts.length,
				digest,
			};
		},
	};
}
