import type { LLMOSKernel } from "../kernel/index.js";
import type { NetService } from "../net-service/index.js";
import type { NotificationService, NotificationSeverity } from "../notification-service/index.js";
import type { SchedulerService } from "../scheduler-service/index.js";
import type { OSService } from "../types/os.js";

export interface SystemHealthResponse {
	services: string[];
	metrics: Array<{
		service: string;
		total: number;
		success: number;
		failure: number;
		p95DurationMs: number;
		successRate: number;
		errorRate: number;
	}>;
}

export function createSystemHealthService(kernel: LLMOSKernel): OSService<Record<string, never>, SystemHealthResponse> {
	return {
		name: "system.health",
		requiredPermissions: ["system:read"],
		execute: async () => ({
			services: kernel.services.list(),
			metrics: kernel.metrics.allSnapshots(),
		}),
	};
}

export interface SystemDependenciesResponse {
	graph: Record<string, string[]>;
}

export function createSystemDependenciesService(
	kernel: LLMOSKernel,
): OSService<Record<string, never>, SystemDependenciesResponse> {
	return {
		name: "system.dependencies",
		requiredPermissions: ["system:read"],
		execute: async () => ({
			graph: kernel.services.graph(),
		}),
	};
}

export interface SystemMetricsRequest {
	service?: string;
}

export interface SystemMetricsResponse {
	metrics: Array<{
		service: string;
		total: number;
		success: number;
		failure: number;
		p95DurationMs: number;
		successRate: number;
		errorRate: number;
	}>;
}

export function createSystemMetricsService(
	kernel: LLMOSKernel,
): OSService<SystemMetricsRequest, SystemMetricsResponse> {
	return {
		name: "system.metrics",
		requiredPermissions: ["system:read"],
		execute: async (req) => ({
			metrics: req.service ? [kernel.metrics.snapshot(req.service)] : kernel.metrics.allSnapshots(),
		}),
	};
}

export interface SystemAuditRequest {
	sessionId?: string;
	traceId?: string;
	service?: string;
	limit?: number;
}

export interface SystemAuditResponse {
	records: Array<{
		id: string;
		timestamp: string;
		appId: string;
		sessionId: string;
		traceId?: string;
		service: string;
		success: boolean;
		durationMs: number;
		error?: string;
		errorCode?: string;
	}>;
}

export function createSystemAuditService(kernel: LLMOSKernel): OSService<SystemAuditRequest, SystemAuditResponse> {
	return {
		name: "system.audit",
		requiredPermissions: ["system:read"],
		execute: async (req) => {
			let records = kernel.audit.list();
			if (req.sessionId) {
				records = records.filter((record) => record.sessionId === req.sessionId);
			}
			if (req.traceId) {
				records = records.filter((record) => record.traceId === req.traceId);
			}
			if (req.service) {
				records = records.filter((record) => record.service === req.service);
			}
			if (req.limit && req.limit > 0) {
				records = records.slice(-req.limit);
			}
			return { records };
		},
	};
}

export interface SystemTopologyResponse {
	services: string[];
	dependencies: Record<string, string[]>;
	bootOrder: string[];
	metrics: Array<{
		service: string;
		total: number;
		success: number;
		failure: number;
		p95DurationMs: number;
		successRate: number;
		errorRate: number;
	}>;
}

export function createSystemTopologyService(
	kernel: LLMOSKernel,
): OSService<Record<string, never>, SystemTopologyResponse> {
	return {
		name: "system.topology",
		requiredPermissions: ["system:read"],
		execute: async () => ({
			services: kernel.services.list(),
			dependencies: kernel.services.graph(),
			bootOrder: kernel.services.bootOrder(),
			metrics: kernel.metrics.allSnapshots(),
		}),
	};
}

export interface SystemCapabilitiesRequest {
	appId: string;
}

export interface SystemCapabilitiesResponse {
	appId: string;
	capabilities: string[];
}

export function createSystemCapabilitiesService(
	kernel: LLMOSKernel,
): OSService<SystemCapabilitiesRequest, SystemCapabilitiesResponse> {
	return {
		name: "system.capabilities",
		requiredPermissions: ["system:read"],
		execute: async (req) => ({
			appId: req.appId,
			capabilities: kernel.capabilities.list(req.appId),
		}),
	};
}

export interface SystemCapabilitiesListResponse {
	capabilitiesByApp: Record<string, string[]>;
}

export function createSystemCapabilitiesListService(
	kernel: LLMOSKernel,
): OSService<Record<string, never>, SystemCapabilitiesListResponse> {
	return {
		name: "system.capabilities.list",
		requiredPermissions: ["system:read"],
		execute: async () => ({
			capabilitiesByApp: kernel.capabilities.listAll(),
		}),
	};
}

export interface SystemEventsRequest {
	topic?: string;
	limit?: number;
}

export interface SystemEventsResponse {
	events: Array<{
		topic: string;
		timestamp: string;
		payload: unknown;
	}>;
}

export function createSystemEventsService(
	kernel: LLMOSKernel,
): OSService<SystemEventsRequest, SystemEventsResponse> {
	return {
		name: "system.events",
		requiredPermissions: ["system:read"],
		execute: async (req) => ({
			events: kernel.events.list(req.topic, req.limit),
		}),
	};
}

export interface SystemPolicyResponse {
	policy: ReturnType<LLMOSKernel["policy"]["getSnapshot"]>;
}

export function createSystemPolicyService(
	kernel: LLMOSKernel,
): OSService<Record<string, never>, SystemPolicyResponse> {
	return {
		name: "system.policy",
		requiredPermissions: ["system:read"],
		execute: async () => ({
			policy: kernel.policy.getSnapshot(),
		}),
	};
}

export interface SystemSnapshotResponse {
	health: {
		services: string[];
		metricsCount: number;
	};
	topology: {
		services: string[];
		bootOrder: string[];
	};
	policy: ReturnType<LLMOSKernel["policy"]["getSnapshot"]>;
	latestAudit?: {
		id: string;
		service: string;
		success: boolean;
		errorCode?: string;
		timestamp: string;
	};
	resilience: {
		openNetCircuits: number;
		schedulerFailures: number;
	};
}

export function createSystemSnapshotService(
	kernel: LLMOSKernel,
	deps?: {
		netService?: NetService;
		schedulerService?: SchedulerService;
	},
): OSService<Record<string, never>, SystemSnapshotResponse> {
	return {
		name: "system.snapshot",
		requiredPermissions: ["system:read"],
		execute: async () => {
			const services = kernel.services.list();
			const metrics = kernel.metrics.allSnapshots();
			const latestAudit = kernel.audit.list().at(-1);
			const netCircuits = deps?.netService?.getCircuitSnapshot() ?? {};
			const openNetCircuits = Object.values(netCircuits).filter((item) => item.state === "open").length;
			const schedulerFailures = deps?.schedulerService?.listFailures().length ?? 0;
			return {
				health: {
					services,
					metricsCount: metrics.length,
				},
				topology: {
					services,
					bootOrder: kernel.services.bootOrder(),
				},
				policy: kernel.policy.getSnapshot(),
				latestAudit: latestAudit
					? {
							id: latestAudit.id,
							service: latestAudit.service,
							success: latestAudit.success,
							errorCode: latestAudit.errorCode,
							timestamp: latestAudit.timestamp,
						}
					: undefined,
				resilience: {
					openNetCircuits,
					schedulerFailures,
				},
			};
		},
	};
}

export interface SystemErrorsRequest {
	service?: string;
}

export interface SystemErrorsResponse {
	totalFailures: number;
	byErrorCode: Record<string, number>;
}

export function createSystemErrorsService(
	kernel: LLMOSKernel,
): OSService<SystemErrorsRequest, SystemErrorsResponse> {
	return {
		name: "system.errors",
		requiredPermissions: ["system:read"],
		execute: async (req) => {
			let records = kernel.audit.list().filter((record) => !record.success);
			if (req.service) {
				records = records.filter((record) => record.service === req.service);
			}
			const byErrorCode: Record<string, number> = {};
			for (const record of records) {
				const code = record.errorCode ?? "UNKNOWN";
				byErrorCode[code] = (byErrorCode[code] ?? 0) + 1;
			}
			return {
				totalFailures: records.length,
				byErrorCode,
			};
		},
	};
}

export interface SystemPolicyEvaluateRequest {
	path?: string;
	command?: string;
	url?: string;
	method?: string;
	requiredPermissions?: string[];
}

export interface SystemPolicyEvaluateResponse {
	allowed: boolean;
	reason?: string;
}

export function createSystemPolicyEvaluateService(
	kernel: LLMOSKernel,
): OSService<SystemPolicyEvaluateRequest, SystemPolicyEvaluateResponse> {
	return {
		name: "system.policy.evaluate",
		requiredPermissions: ["system:read"],
		execute: async (req, ctx) => {
			if (req.url) {
				const decision = kernel.policy.evaluateNetworkRequest(
					{
						url: req.url,
						method: req.method ?? "GET",
					},
					{
						...ctx,
						permissions: req.requiredPermissions ?? ctx.permissions,
					},
				);
				return decision;
			}
			return kernel.policy.evaluate(
				{
					path: req.path,
					command: req.command,
					requiredPermissions: req.requiredPermissions,
				},
				ctx,
			);
		},
	};
}

export interface SystemNetCircuitResponse {
	circuits: ReturnType<NetService["getCircuitSnapshot"]>;
}

export function createSystemNetCircuitService(
	netService: NetService,
): OSService<Record<string, never>, SystemNetCircuitResponse> {
	return {
		name: "system.net.circuit",
		requiredPermissions: ["system:read"],
		execute: async () => ({
			circuits: netService.getCircuitSnapshot(),
		}),
	};
}

export interface SystemNetCircuitResetRequest {
	host?: string;
}

export interface SystemNetCircuitResetResponse {
	cleared: number;
}

export function createSystemNetCircuitResetService(
	netService: NetService,
): OSService<SystemNetCircuitResetRequest, SystemNetCircuitResetResponse> {
	return {
		name: "system.net.circuit.reset",
		requiredPermissions: ["system:read"],
		execute: async (req) => ({
			cleared: netService.resetCircuits(req.host),
		}),
	};
}

export interface SystemSchedulerFailuresRequest {
	id?: string;
	limit?: number;
}

export interface SystemSchedulerFailuresResponse {
	failures: ReturnType<SchedulerService["listFailures"]>;
}

export function createSystemSchedulerFailuresService(
	schedulerService: SchedulerService,
): OSService<SystemSchedulerFailuresRequest, SystemSchedulerFailuresResponse> {
	return {
		name: "system.scheduler.failures",
		requiredPermissions: ["system:read"],
		execute: async (req) => {
			let failures = schedulerService.listFailures(req.limit);
			if (req.id) {
				failures = failures.filter((item) => item.id === req.id);
			}
			return { failures };
		},
	};
}

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
		name: "system.alerts",
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
		name: "system.alerts.clear",
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

export function createSystemAlertsExportService(
	notificationService: NotificationService,
): OSService<SystemAlertsExportRequest, SystemAlertsExportResponse> {
	return {
		name: "system.alerts.export",
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
						thisEscapeCsv(alert.timestamp),
						thisEscapeCsv(alert.topic),
						thisEscapeCsv(alert.severity),
						thisEscapeCsv(alert.message),
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
		name: "system.alerts.stats",
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
		name: "system.alerts.topics",
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

export interface SystemAlertsUnackedRequest {
	topic?: string;
	severity?: NotificationSeverity;
	limit?: number;
}

export interface SystemAlertsUnackedResponse {
	total: number;
	alerts: ReturnType<NotificationService["query"]>;
}

export function createSystemAlertsUnackedService(
	notificationService: NotificationService,
): OSService<SystemAlertsUnackedRequest, SystemAlertsUnackedResponse> {
	return {
		name: "system.alerts.unacked",
		requiredPermissions: ["system:read"],
		execute: async (req) => {
			const alerts = notificationService.query({
				topic: req.topic,
				severity: req.severity,
				acknowledged: false,
				limit: req.limit,
			});
			return {
				total: alerts.length,
				alerts,
			};
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
		name: "system.alerts.policy",
		requiredPermissions: ["system:read"],
		execute: async () => ({
			policy: notificationService.getPolicy(),
		}),
	};
}

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
		name: "system.alerts.trends",
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

export interface SystemAlertsSLOResponse {
	ackedCount: number;
	avgAckLatencyMs: number;
	p95AckLatencyMs: number;
}

export function createSystemAlertsSLOService(
	notificationService: NotificationService,
): OSService<Record<string, never>, SystemAlertsSLOResponse> {
	return {
		name: "system.alerts.slo",
		requiredPermissions: ["system:read"],
		execute: async () => {
			const acked = notificationService
				.query({})
				.filter((item) => item.acknowledged && item.ackedAt)
				.map((item) => Date.parse(item.ackedAt!) - Date.parse(item.timestamp))
				.filter((value) => Number.isFinite(value) && value >= 0)
				.sort((a, b) => a - b);
			if (acked.length === 0) {
				return {
					ackedCount: 0,
					avgAckLatencyMs: 0,
					p95AckLatencyMs: 0,
				};
			}
			const sum = acked.reduce((total, current) => total + current, 0);
			const avg = Math.round(sum / acked.length);
			const p95Index = Math.ceil(acked.length * 0.95) - 1;
			const p95 = acked[Math.max(0, p95Index)] ?? acked[acked.length - 1] ?? 0;
			return {
				ackedCount: acked.length,
				avgAckLatencyMs: avg,
				p95AckLatencyMs: p95,
			};
		},
	};
}

export interface SystemAlertsIncidentsRequest {
	topic?: string;
	severity?: NotificationSeverity;
	limit?: number;
}

export interface SystemAlertsIncidentsResponse {
	totalIncidents: number;
	incidents: Array<{
		signature: string;
		topic: string;
		severity: NotificationSeverity;
		message: string;
		count: number;
		firstSeen: string;
		lastSeen: string;
	}>;
}

export function createSystemAlertsIncidentsService(
	notificationService: NotificationService,
): OSService<SystemAlertsIncidentsRequest, SystemAlertsIncidentsResponse> {
	return {
		name: "system.alerts.incidents",
		requiredPermissions: ["system:read"],
		execute: async (req) => {
			const alerts = notificationService.query({
				topic: req.topic,
				severity: req.severity,
				acknowledged: false,
				limit: req.limit,
			});
			const groups = new Map<
				string,
				{
					signature: string;
					topic: string;
					severity: NotificationSeverity;
					message: string;
					count: number;
					firstSeen: string;
					lastSeen: string;
				}
			>();
			for (const alert of alerts) {
				const signature = `${alert.topic}::${alert.severity}::${alert.message}`;
				const current = groups.get(signature);
				if (!current) {
					groups.set(signature, {
						signature,
						topic: alert.topic,
						severity: alert.severity,
						message: alert.message,
						count: 1,
						firstSeen: alert.timestamp,
						lastSeen: alert.timestamp,
					});
					continue;
				}
				current.count += 1;
				if (alert.timestamp < current.firstSeen) current.firstSeen = alert.timestamp;
				if (alert.timestamp > current.lastSeen) current.lastSeen = alert.timestamp;
			}
			return {
				totalIncidents: groups.size,
				incidents: [...groups.values()].sort((a, b) => b.count - a.count),
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
		name: "system.alerts.digest",
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
			const incidents = new Map<string, { message: string; count: number; severity: NotificationSeverity }>();
			for (const alert of alerts) {
				const key = `${alert.severity}::${alert.message}`;
				const current = incidents.get(key);
				if (current) {
					current.count += 1;
				} else {
					incidents.set(key, { message: alert.message, count: 1, severity: alert.severity });
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

export interface SystemAlertsReportRequest {
	topic?: string;
	windowMinutes?: number;
}

export interface SystemAlertsReportResponse {
	policy: ReturnType<NotificationService["getPolicy"]>;
	stats: ReturnType<NotificationService["getStats"]>;
	trends: {
		windowMinutes: number;
		total: number;
		bySeverity: Partial<Record<NotificationSeverity, number>>;
	};
	slo: {
		ackedCount: number;
		avgAckLatencyMs: number;
		p95AckLatencyMs: number;
	};
	digest: string;
}

export function createSystemAlertsReportService(
	notificationService: NotificationService,
): OSService<SystemAlertsReportRequest, SystemAlertsReportResponse> {
	return {
		name: "system.alerts.report",
		requiredPermissions: ["system:read"],
		execute: async (req) => {
			const windowMinutes = req.windowMinutes && req.windowMinutes > 0 ? req.windowMinutes : 60;
			const trends = await createSystemAlertsTrendsService(notificationService).execute(
				{
					topic: req.topic,
					windowMinutes,
				},
				{
					appId: "system",
					sessionId: "system",
					permissions: ["system:read"],
					workingDirectory: process.cwd(),
				},
			);
			const slo = await createSystemAlertsSLOService(notificationService).execute(
				{},
				{
					appId: "system",
					sessionId: "system",
					permissions: ["system:read"],
					workingDirectory: process.cwd(),
				},
			);
			const digest = await createSystemAlertsDigestService(notificationService).execute(
				{ topic: req.topic, limit: 20 },
				{
					appId: "system",
					sessionId: "system",
					permissions: ["system:read"],
					workingDirectory: process.cwd(),
				},
			);
			return {
				policy: notificationService.getPolicy(),
				stats: notificationService.getStats(),
				trends,
				slo,
				digest: digest.digest,
			};
		},
	};
}

export interface SystemAlertsReportCompactResponse {
	summary: string;
}

export function createSystemAlertsReportCompactService(
	notificationService: NotificationService,
): OSService<SystemAlertsReportRequest, SystemAlertsReportCompactResponse> {
	return {
		name: "system.alerts.report.compact",
		requiredPermissions: ["system:read"],
		execute: async (req) => {
			const report = await createSystemAlertsReportService(notificationService).execute(
				req,
				{
					appId: "system",
					sessionId: "system",
					permissions: ["system:read"],
					workingDirectory: process.cwd(),
				},
			);
			const topSeverities = Object.entries(report.trends.bySeverity)
				.map(([key, value]) => `${key}:${value}`)
				.join(",");
			return {
				summary: `total=${report.trends.total};window=${report.trends.windowMinutes}m;ackP95=${report.slo.p95AckLatencyMs};sev=${topSeverities}`,
			};
		},
	};
}

export interface SystemAlertsFlappingRequest {
	windowMinutes: number;
	threshold: number;
	topic?: string;
}

export interface SystemAlertsFlappingResponse {
	total: number;
	items: Array<{
		signature: string;
		topic: string;
		severity: NotificationSeverity;
		message: string;
		count: number;
	}>;
}

export function createSystemAlertsFlappingService(
	notificationService: NotificationService,
): OSService<SystemAlertsFlappingRequest, SystemAlertsFlappingResponse> {
	return {
		name: "system.alerts.flapping",
		requiredPermissions: ["system:read"],
		execute: async (req) => {
			const windowMinutes = req.windowMinutes > 0 ? req.windowMinutes : 5;
			const threshold = req.threshold > 0 ? req.threshold : 3;
			const since = new Date(Date.now() - windowMinutes * 60 * 1000).toISOString();
			const alerts = notificationService.query({
				topic: req.topic,
				since,
			});
			const groups = new Map<
				string,
				{
					signature: string;
					topic: string;
					severity: NotificationSeverity;
					message: string;
					count: number;
				}
			>();
			for (const alert of alerts) {
				const signature = `${alert.topic}::${alert.severity}::${alert.message}`;
				const current = groups.get(signature);
				if (current) {
					current.count += 1;
				} else {
					groups.set(signature, {
						signature,
						topic: alert.topic,
						severity: alert.severity,
						message: alert.message,
						count: 1,
					});
				}
			}
			const items = [...groups.values()].filter((item) => item.count >= threshold).sort((a, b) => b.count - a.count);
			return {
				total: items.length,
				items,
			};
		},
	};
}

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
		name: "system.alerts.timeline",
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
			};
		},
	};
}

export interface SystemAlertsHotspotsRequest {
	windowMinutes: number;
	topic?: string;
	limit?: number;
}

export interface SystemAlertsHotspotsResponse {
	windowMinutes: number;
	items: Array<{
		signature: string;
		message: string;
		severity: NotificationSeverity;
		currentCount: number;
		previousCount: number;
		delta: number;
	}>;
}

export function createSystemAlertsHotspotsService(
	notificationService: NotificationService,
): OSService<SystemAlertsHotspotsRequest, SystemAlertsHotspotsResponse> {
	return {
		name: "system.alerts.hotspots",
		requiredPermissions: ["system:read"],
		execute: async (req) => {
			const windowMinutes = req.windowMinutes > 0 ? req.windowMinutes : 10;
			const windowMs = windowMinutes * 60 * 1000;
			const nowMs = Date.now();
			const currentStart = nowMs - windowMs;
			const previousStart = currentStart - windowMs;

			const all = notificationService.query({
				topic: req.topic,
				since: new Date(previousStart).toISOString(),
				until: new Date(nowMs).toISOString(),
			});
			const currentMap = new Map<string, { message: string; severity: NotificationSeverity; count: number }>();
			const previousMap = new Map<string, { message: string; severity: NotificationSeverity; count: number }>();

			for (const alert of all) {
				const ts = Date.parse(alert.timestamp);
				const signature = `${alert.message}::${alert.severity}`;
				if (ts >= currentStart && ts <= nowMs) {
					const cur = currentMap.get(signature);
					if (cur) {
						cur.count += 1;
					} else {
						currentMap.set(signature, { message: alert.message, severity: alert.severity, count: 1 });
					}
				} else if (ts >= previousStart && ts < currentStart) {
					const prev = previousMap.get(signature);
					if (prev) {
						prev.count += 1;
					} else {
						previousMap.set(signature, { message: alert.message, severity: alert.severity, count: 1 });
					}
				}
			}

			const keys = new Set([...currentMap.keys(), ...previousMap.keys()]);
			const items = [...keys]
				.map((signature) => {
					const current = currentMap.get(signature);
					const previous = previousMap.get(signature);
					const currentCount = current?.count ?? 0;
					const previousCount = previous?.count ?? 0;
					return {
						signature,
						message: current?.message ?? previous?.message ?? "",
						severity: current?.severity ?? previous?.severity ?? "info",
						currentCount,
						previousCount,
						delta: currentCount - previousCount,
					};
				})
				.filter((item) => item.currentCount > 0 || item.previousCount > 0)
				.sort((a, b) => b.delta - a.delta || b.currentCount - a.currentCount);

			return {
				windowMinutes,
				items: req.limit && req.limit > 0 ? items.slice(0, req.limit) : items,
			};
		},
	};
}

export interface SystemAlertsRecommendationsRequest {
	topic?: string;
	windowMinutes: number;
}

export interface SystemAlertsRecommendationsResponse {
	recommendations: Array<{
		title: string;
		reason: string;
		action: string;
		priority: "low" | "medium" | "high";
	}>;
}

export function createSystemAlertsRecommendationsService(
	notificationService: NotificationService,
): OSService<SystemAlertsRecommendationsRequest, SystemAlertsRecommendationsResponse> {
	return {
		name: "system.alerts.recommendations",
		requiredPermissions: ["system:read"],
		execute: async (req) => {
			const windowMinutes = req.windowMinutes > 0 ? req.windowMinutes : 10;
			const trends = await createSystemAlertsTrendsService(notificationService).execute(
				{
					windowMinutes,
					topic: req.topic,
				},
				{
					appId: "system",
					sessionId: "system",
					permissions: ["system:read"],
					workingDirectory: process.cwd(),
				},
			);
			const flapping = await createSystemAlertsFlappingService(notificationService).execute(
				{
					windowMinutes,
					threshold: 3,
					topic: req.topic,
				},
				{
					appId: "system",
					sessionId: "system",
					permissions: ["system:read"],
					workingDirectory: process.cwd(),
				},
			);
			const hotspots = await createSystemAlertsHotspotsService(notificationService).execute(
				{
					windowMinutes,
					topic: req.topic,
					limit: 3,
				},
				{
					appId: "system",
					sessionId: "system",
					permissions: ["system:read"],
					workingDirectory: process.cwd(),
				},
			);

			const recommendations: Array<{
				title: string;
				reason: string;
				action: string;
				priority: "low" | "medium" | "high";
			}> = [];

			if ((trends.bySeverity.critical ?? 0) > 0) {
				recommendations.push({
					title: "Handle critical alerts first",
					reason: `Detected ${trends.bySeverity.critical} critical alerts in last ${windowMinutes} minutes`,
					action: "Escalate on-call and start incident bridge immediately",
					priority: "high",
				});
			}
			if (flapping.total > 0) {
				recommendations.push({
					title: "Suppress flapping alerts",
					reason: `Detected ${flapping.total} flapping signatures`,
					action: "Apply temporary mute/dedupe or tune thresholds for noisy signatures",
					priority: "medium",
				});
			}
			const topHotspot = hotspots.items[0];
			if (topHotspot && topHotspot.delta > 0) {
				recommendations.push({
					title: "Investigate rising hotspot",
					reason: `${topHotspot.message} increased by ${topHotspot.delta} vs previous window`,
					action: "Run targeted diagnostics for related service and recent deployments",
					priority: topHotspot.severity === "critical" ? "high" : "medium",
				});
			}
			if (recommendations.length === 0) {
				recommendations.push({
					title: "System stable",
					reason: "No critical growth or flapping patterns detected",
					action: "Keep current policies and continue periodic monitoring",
					priority: "low",
				});
			}

			return { recommendations };
		},
	};
}

export interface SystemAlertsFeedRequest {
	topic?: string;
	severity?: NotificationSeverity;
	acknowledged?: boolean;
	offset?: number;
	limit?: number;
}

export interface SystemAlertsFeedResponse {
	total: number;
	offset: number;
	limit: number;
	hasMore: boolean;
	items: ReturnType<NotificationService["query"]>;
}

export function createSystemAlertsFeedService(
	notificationService: NotificationService,
): OSService<SystemAlertsFeedRequest, SystemAlertsFeedResponse> {
	return {
		name: "system.alerts.feed",
		requiredPermissions: ["system:read"],
		execute: async (req) => {
			const offset = req.offset && req.offset > 0 ? req.offset : 0;
			const limit = req.limit && req.limit > 0 ? req.limit : 20;
			const all = notificationService
				.query({
					topic: req.topic,
					severity: req.severity,
					acknowledged: req.acknowledged,
				})
				.slice()
				.sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1));
			const items = all.slice(offset, offset + limit);
			return {
				total: all.length,
				offset,
				limit,
				hasMore: offset + limit < all.length,
				items,
			};
		},
	};
}

export interface SystemAlertsBacklogRequest {
	topic?: string;
	severity?: NotificationSeverity;
	overdueThresholdMs?: number;
}

export interface SystemAlertsBacklogResponse {
	totalUnacked: number;
	oldestUnackedAgeMs: number;
	newestUnackedAgeMs: number;
	overdueCount: number;
	overdueThresholdMs: number;
	bySeverity: Record<NotificationSeverity, number>;
}

export function createSystemAlertsBacklogService(
	notificationService: NotificationService,
): OSService<SystemAlertsBacklogRequest, SystemAlertsBacklogResponse> {
	return {
		name: "system.alerts.backlog",
		requiredPermissions: ["system:read"],
		execute: async (req) => {
			const overdueThresholdMs = req.overdueThresholdMs && req.overdueThresholdMs > 0 ? req.overdueThresholdMs : 300000;
			const unacked = notificationService.query({
				topic: req.topic,
				severity: req.severity,
				acknowledged: false,
			});
			const now = Date.now();
			const bySeverity: Record<NotificationSeverity, number> = {
				info: 0,
				warning: 0,
				error: 0,
				critical: 0,
			};
			let oldestUnackedAgeMs = 0;
			let newestUnackedAgeMs = 0;
			let overdueCount = 0;

			for (const alert of unacked) {
				bySeverity[alert.severity] += 1;
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
				totalUnacked: unacked.length,
				oldestUnackedAgeMs,
				newestUnackedAgeMs: unacked.length > 0 ? newestUnackedAgeMs : 0,
				overdueCount,
				overdueThresholdMs,
				bySeverity,
			};
		},
	};
}

export interface SystemAlertsBreachesRequest {
	windowMinutes: number;
	topic?: string;
	criticalThreshold?: number;
	unackedThreshold?: number;
	ackP95ThresholdMs?: number;
}

export interface SystemAlertsBreachesResponse {
	breaches: Array<{
		metric: "critical_count" | "unacked_count" | "ack_p95_ms";
		value: number;
		threshold: number;
		reason: string;
		severity: "warning" | "critical";
	}>;
}

export function createSystemAlertsBreachesService(
	notificationService: NotificationService,
): OSService<SystemAlertsBreachesRequest, SystemAlertsBreachesResponse> {
	return {
		name: "system.alerts.breaches",
		requiredPermissions: ["system:read"],
		execute: async (req) => {
			const windowMinutes = req.windowMinutes > 0 ? req.windowMinutes : 10;
			const criticalThreshold = req.criticalThreshold ?? 10;
			const unackedThreshold = req.unackedThreshold ?? 20;
			const ackP95ThresholdMs = req.ackP95ThresholdMs ?? 300000;

			const trends = await createSystemAlertsTrendsService(notificationService).execute(
				{
					topic: req.topic,
					windowMinutes,
				},
				{
					appId: "system",
					sessionId: "system",
					permissions: ["system:read"],
					workingDirectory: process.cwd(),
				},
			);
			const unacked = await createSystemAlertsUnackedService(notificationService).execute(
				{
					topic: req.topic,
				},
				{
					appId: "system",
					sessionId: "system",
					permissions: ["system:read"],
					workingDirectory: process.cwd(),
				},
			);
			const slo = await createSystemAlertsSLOService(notificationService).execute(
				{},
				{
					appId: "system",
					sessionId: "system",
					permissions: ["system:read"],
					workingDirectory: process.cwd(),
				},
			);

			const breaches: SystemAlertsBreachesResponse["breaches"] = [];
			const criticalCount = trends.bySeverity.critical ?? 0;
			if (criticalCount > criticalThreshold) {
				breaches.push({
					metric: "critical_count",
					value: criticalCount,
					threshold: criticalThreshold,
					reason: `Critical alerts ${criticalCount} exceeded threshold ${criticalThreshold} in ${windowMinutes}m`,
					severity: "critical",
				});
			}
			if (unacked.total > unackedThreshold) {
				breaches.push({
					metric: "unacked_count",
					value: unacked.total,
					threshold: unackedThreshold,
					reason: `Unacked alerts ${unacked.total} exceeded threshold ${unackedThreshold}`,
					severity: "warning",
				});
			}
			if (slo.p95AckLatencyMs > ackP95ThresholdMs) {
				breaches.push({
					metric: "ack_p95_ms",
					value: slo.p95AckLatencyMs,
					threshold: ackP95ThresholdMs,
					reason: `Ack p95 ${slo.p95AckLatencyMs}ms exceeded threshold ${ackP95ThresholdMs}ms`,
					severity: "warning",
				});
			}

			return { breaches };
		},
	};
}

function thisEscapeCsv(value: string): string {
	const escaped = value.replaceAll('"', '""');
	return `"${escaped}"`;
}
