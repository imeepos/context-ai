import type { NotificationService, NotificationSeverity } from "../types.js";
import type { OSService } from "../../types/os.js";
import * as TOKENS from "../../tokens.js";

export interface SystemAlertsTrendsRequest {
	windowMinutes: number;
	topic?: string;
}

export interface SystemAlertsTrendsResponse {
	windowMinutes: number;
	total: number;
	bySeverity: Partial<Record<NotificationSeverity, number>>;
}

export function createSystemAlertsTrendsService(
	notificationService: NotificationService,
): OSService<SystemAlertsTrendsRequest, SystemAlertsTrendsResponse> {
	return {
		name: TOKENS.SYSTEM_ALERTS_TRENDS,
		requiredPermissions: ["system:read"],
		execute: async (req) => {
			const windowMinutes = req.windowMinutes > 0 ? req.windowMinutes : 1;
			const since = new Date(Date.now() - windowMinutes * 60 * 1000).toISOString();
			const alerts = notificationService.query({
				topic: req.topic,
				since,
			});
			const bySeverity: Partial<Record<NotificationSeverity, number>> = {};
			for (const alert of alerts) {
				bySeverity[alert.severity] = (bySeverity[alert.severity] ?? 0) + 1;
			}
			return {
				windowMinutes,
				total: alerts.length,
				bySeverity,
			};
		},
	};
}

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
			const incidents = new Map<string, {
				message: string;
				severity: NotificationSeverity;
				count: number;
			}>();
			for (const alert of alerts) {
				const key = `${alert.severity}::${alert.message}`;
				const current = incidents.get(key);
				if (current) {
					current.count += 1;
				} else {
					incidents.set(key, { message: alert.message, severity: alert.severity, count: 1 });
				}
			}
			const severitySummary = ["critical", "error", "warning", "info"]
				.filter((level) => (bySeverity[level as NotificationSeverity] ?? 0) > 0)
				.map((level) => `${level}:${bySeverity[level as NotificationSeverity]}`)
				.join(", ");
			const incidentSummary = [...incidents.values()]
				.sort((a, b) => b.count - a.count)
				.slice(0, 5)
				.map((item) => `[${item.severity}] ${item.message} x${item.count}`)
				.join("; ");
			const digest =
				alerts.length === 0
					? "No unacked alerts."
					: `Unacked alerts=${alerts.length}. Severity(${severitySummary}). Top incidents: ${incidentSummary}`;
			return {
				total: alerts.length,
				digest,
			};
		},
	};
}
