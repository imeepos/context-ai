import type { LLMOSKernel } from "../kernel/index.js";
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
}

export function createSystemSnapshotService(
	kernel: LLMOSKernel,
): OSService<Record<string, never>, SystemSnapshotResponse> {
	return {
		name: "system.snapshot",
		requiredPermissions: ["system:read"],
		execute: async () => {
			const services = kernel.services.list();
			const metrics = kernel.metrics.allSnapshots();
			const latestAudit = kernel.audit.list().at(-1);
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
