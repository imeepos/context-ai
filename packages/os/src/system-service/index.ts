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

function thisEscapeCsv(value: string): string {
	const escaped = value.replaceAll('"', '""');
	return `"${escaped}"`;
}
