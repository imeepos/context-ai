import type { NotificationService, NotificationSeverity } from "../types.js";
import type { OSService } from "../../types/os.js";
import * as TOKENS from "../../tokens.js";

export interface SystemAlertsRequest {
	topic?: string;
	severity?: NotificationSeverity;
	since?: string;
	until?: string;
	limit?: number;
}

export interface SystemAlertsResponse {
	total: number;
	bySeverity: Partial<Record<NotificationSeverity, number>>;
	alerts: ReturnType<NotificationService["query"]>;
}

export function createSystemAlertsService(
	notificationService: NotificationService,
): OSService<SystemAlertsRequest, SystemAlertsResponse> {
	return {
		name: TOKENS.SYSTEM_ALERTS,
		requiredPermissions: ["system:read"],
		execute: async (req) => {
			const alerts = notificationService.query({
				topic: req.topic,
				severity: req.severity,
				since: req.since,
				until: req.until,
				limit: req.limit,
			});
			const bySeverity: Partial<Record<NotificationSeverity, number>> = {};
			for (const alert of alerts) {
				bySeverity[alert.severity] = (bySeverity[alert.severity] ?? 0) + 1;
			}
			return {
				total: alerts.length,
				bySeverity,
				alerts,
			};
		},
	};
}

export interface SystemAlertsClearRequest {
	topic?: string;
	severity?: NotificationSeverity;
}

export interface SystemAlertsClearResponse {
	cleared: number;
}

export function createSystemAlertsClearService(
	notificationService: NotificationService,
): OSService<SystemAlertsClearRequest, SystemAlertsClearResponse> {
	return {
		name: TOKENS.SYSTEM_ALERTS_CLEAR,
		requiredPermissions: ["system:read"],
		execute: async (req) => ({
			cleared: notificationService.clear({
				topic: req.topic,
				severity: req.severity,
			}),
		}),
	};
}

export interface SystemAlertsExportRequest {
	topic?: string;
	severity?: NotificationSeverity;
	since?: string;
	until?: string;
	limit?: number;
	format?: "json" | "csv";
}

export interface SystemAlertsExportResponse {
	format: "json" | "csv";
	contentType: "application/json" | "text/csv";
	content: string;
}

function escapeCsv(value: string): string {
	const escaped = value.replaceAll('"', '""');
	return `"${escaped}"`;
}

export function createSystemAlertsExportService(
	notificationService: NotificationService,
): OSService<SystemAlertsExportRequest, SystemAlertsExportResponse> {
	return {
		name: TOKENS.SYSTEM_ALERTS_EXPORT,
		requiredPermissions: ["system:read"],
		execute: async (req) => {
			const alerts = notificationService.query({
				topic: req.topic,
				severity: req.severity,
				since: req.since,
				until: req.until,
				limit: req.limit,
			});
			const format = req.format ?? "json";
			if (format === "csv") {
				const header = "timestamp,topic,severity,message";
				const rows = alerts.map((alert) =>
					[
						escapeCsv(alert.timestamp),
						escapeCsv(alert.topic),
						escapeCsv(alert.severity),
						escapeCsv(alert.message),
					].join(","),
				);
				return {
					format: "csv",
					contentType: "text/csv",
					content: [header, ...rows].join("\n"),
				};
			}
			return {
				format: "json",
				contentType: "application/json",
				content: JSON.stringify(alerts),
			};
		},
	};
}

export interface SystemAlertsStatsResponse {
	stats: ReturnType<NotificationService["getStats"]>;
}

export function createSystemAlertsStatsService(
	notificationService: NotificationService,
): OSService<Record<string, never>, SystemAlertsStatsResponse> {
	return {
		name: TOKENS.SYSTEM_ALERTS_STATS,
		requiredPermissions: ["system:read"],
		execute: async () => ({
			stats: notificationService.getStats(),
		}),
	};
}

export interface SystemAlertsTopicsResponse {
	topics: Record<
		string,
		{
			sent: number;
			dropped: number;
			total: number;
		}
	>;
}

export function createSystemAlertsTopicsService(
	notificationService: NotificationService,
): OSService<Record<string, never>, SystemAlertsTopicsResponse> {
	return {
		name: TOKENS.SYSTEM_ALERTS_TOPICS,
		requiredPermissions: ["system:read"],
		execute: async () => {
			const byTopic = notificationService.getStats().byTopic;
			const topics: Record<
				string,
				{
					sent: number;
					dropped: number;
					total: number;
				}
			> = {};
			for (const [topic, counts] of Object.entries(byTopic)) {
				topics[topic] = {
					sent: counts.sent,
					dropped: counts.dropped,
					total: counts.sent + counts.dropped,
				};
			}
			return { topics };
		},
	};
}

export interface SystemAlertsPolicyResponse {
	policy: ReturnType<NotificationService["getPolicy"]>;
}

export function createSystemAlertsPolicyService(
	notificationService: NotificationService,
): OSService<Record<string, never>, SystemAlertsPolicyResponse> {
	return {
		name: TOKENS.SYSTEM_ALERTS_POLICY,
		requiredPermissions: ["system:read"],
		execute: async () => ({
			policy: notificationService.getPolicy(),
		}),
	};
}
