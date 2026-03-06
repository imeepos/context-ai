import type { LLMOSKernel } from "../kernel/index.js";
import type { NetService } from "../net-service/index.js";
import type { NotificationService, NotificationSeverity } from "../notification-service/index.js";
import type { SchedulerService } from "../scheduler-service/index.js";
import type { OSService } from "../types/os.js";
import type { PolicyInput } from "../types/os.js";
import type { SecurityService } from "../security-service/index.js";
import type { TenantQuotaGovernor } from "../kernel/resource-governor.js";
import type { AppManager } from "../app-manager/index.js";
import type { AppManifestV1 } from "../app-manager/manifest.js";
import { gzipSync } from "node:zlib";
import { createHash } from "node:crypto";
import { OSError } from "../kernel/errors.js";

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

export interface SystemRoutesRequest {
	appId?: string;
	prefix?: string;
	offset?: number;
	limit?: number;
}

export interface SystemRoutesResponse {
	routes: string[];
	total: number;
}

export interface SystemRoutesStatsRequest {
	appId?: string;
}

export interface SystemRoutesStatsResponse {
	stats: Array<{
		route: string;
		total: number;
		success: number;
		failure: number;
		lastRenderedAt?: string;
		lastError?: string;
	}>;
}

export function createSystemRoutesService(
	appManager: AppManager,
): OSService<SystemRoutesRequest, SystemRoutesResponse> {
	return {
		name: "system.routes",
		requiredPermissions: ["system:read"],
		execute: async (req) => {
			let routes = appManager.routes.listRoutes(req.appId);
			const prefix = req.prefix?.trim();
			if (prefix) {
				routes = routes.filter((route) => route.startsWith(prefix));
			}
			const total = routes.length;
			const offset = req.offset && req.offset > 0 ? req.offset : 0;
			const limit = req.limit && req.limit > 0 ? req.limit : routes.length;
			return {
				routes: routes.slice(offset, offset + limit),
				total,
			};
		},
	};
}

export function createSystemRoutesStatsService(
	appManager: AppManager,
): OSService<SystemRoutesStatsRequest, SystemRoutesStatsResponse> {
	return {
		name: "system.routes.stats",
		requiredPermissions: ["system:read"],
		execute: async (req) => ({
			stats: appManager.routes.stats(req.appId),
		}),
	};
}

export interface SystemAppInstallReportRequest {
	appId: string;
}

export interface SystemAppInstallReportResponse {
	appId: string;
	version: string;
	addedPages: string[];
	addedPolicies: string[];
	addedObservability: string[];
	rollbackToken: string;
	lastAction: "install" | "rollback";
	updatedAt: string;
}

export function createSystemAppInstallReportService(
	appManager: AppManager,
): OSService<SystemAppInstallReportRequest, SystemAppInstallReportResponse> {
	return {
		name: "system.app.install.report",
		requiredPermissions: ["system:read"],
		execute: async (req) => {
			const manifest = appManager.registry.get(req.appId);
			const state = appManager.getInstallReportState(req.appId);
			const report = state?.report;
			return {
				appId: manifest.id,
				version: report?.version ?? manifest.version,
				addedPages: report?.addedPages ?? manifest.entry.pages.map((page) => page.route),
				addedPolicies: report?.addedPolicies ?? [...manifest.permissions],
				addedObservability: report?.addedObservability ?? [`audit:${manifest.id}`, `metrics:${manifest.id}`, `events:${manifest.id}`],
				rollbackToken: report?.rollbackToken ?? `${manifest.id}@${manifest.version}:unknown`,
				lastAction: state?.lastAction ?? "install",
				updatedAt: state?.updatedAt ?? new Date().toISOString(),
			};
		},
	};
}

export interface SystemAppDeltaRequest {
	appId?: string;
}

export interface SystemAppDeltaResponse {
	apps: Array<{
		appId: string;
		version: string;
		pages: string[];
		policies: string[];
		observability: string[];
	}>;
}

export interface SystemAppRollbackState {
	snapshots: Array<{
		token?: string;
		tokenHash?: string;
		appId: string;
		createdAt: string;
		expiresAt: string;
		hasPrevious?: boolean;
		hasPreviousQuota?: boolean;
		previous?: AppManifestV1;
		previousQuota?: {
			maxToolCalls: number;
			maxTokens: number;
		};
	}>;
	installReports: Array<{
		appId: string;
		version: string;
		lastAction: "install" | "rollback";
		updatedAt: string;
	}>;
}

export interface SystemAppRollbackStatsRequest {
	appId?: string;
	soonToExpireWindowMs?: number;
}

export interface SystemAppRollbackStatsResponse {
	totalSnapshots: number;
	expiredSnapshots: number;
	activeSnapshots: number;
	soonToExpireSnapshots: number;
	oldestCreatedAt?: string;
	newestCreatedAt?: string;
	byApp: Array<{
		appId: string;
		total: number;
		expired: number;
		active: number;
		soonToExpire: number;
		oldestCreatedAt?: string;
		newestCreatedAt?: string;
		recentCreatedAt?: string;
	}>;
}

export function createSystemAppDeltaService(
	appManager: AppManager,
): OSService<SystemAppDeltaRequest, SystemAppDeltaResponse> {
	return {
		name: "system.app.delta",
		requiredPermissions: ["system:read"],
		execute: async (req) => {
			const list = req.appId ? [appManager.registry.get(req.appId)] : appManager.registry.list();
			return {
				apps: list.map((manifest) => ({
					appId: manifest.id,
					version: manifest.version,
					pages: manifest.entry.pages.map((item) => item.route),
					policies: [...manifest.permissions],
					observability: [`audit:${manifest.id}`, `metrics:${manifest.id}`, `events:${manifest.id}`],
				})),
			};
		},
	};
}

export function createSystemAppRollbackStateExportService(
	appManager: AppManager,
): OSService<{ includeSensitive?: boolean }, { state: SystemAppRollbackState }> {
	return {
		name: "system.app.rollback.state.export",
		requiredPermissions: ["system:read"],
		execute: async (req) => {
			const state = appManager.exportRollbackState();
			const includeSensitive = req.includeSensitive === true;
			return {
				state: {
					snapshots: state.snapshots.map((snapshot) => ({
						token: includeSensitive ? snapshot.token : undefined,
						tokenHash: includeSensitive
							? undefined
							: createHash("sha256").update(snapshot.token, "utf8").digest("hex"),
						appId: snapshot.appId,
						createdAt: snapshot.createdAt,
						expiresAt: snapshot.expiresAt,
						hasPrevious: includeSensitive ? undefined : !!snapshot.previous,
						hasPreviousQuota: includeSensitive ? undefined : !!snapshot.previousQuota,
						previous: includeSensitive ? snapshot.previous : undefined,
						previousQuota: includeSensitive ? snapshot.previousQuota : undefined,
					})),
					installReports: state.installReports.map((item) => ({
						appId: item.report.appId,
						version: item.report.version,
						lastAction: item.lastAction,
						updatedAt: item.updatedAt,
					})),
				},
			};
		},
	};
}

export function createSystemAppRollbackAuditService(
	kernel: LLMOSKernel,
): OSService<
	{
		appId?: string;
		sessionId?: string;
		limit?: number;
	},
	{
		total: number;
		success: number;
		failure: number;
		records: Array<{
			timestamp: string;
			appId: string;
			sessionId: string;
			traceId?: string;
			success: boolean;
			durationMs: number;
			error?: string;
			errorCode?: string;
		}>;
	}
> {
	return {
		name: "system.app.rollback.audit",
		requiredPermissions: ["system:read"],
		execute: async (req) => {
			let records = kernel.audit.list().filter((item) => item.service === "app.install.rollback");
			if (req.appId) {
				records = records.filter((item) => item.appId === req.appId);
			}
			if (req.sessionId) {
				records = records.filter((item) => item.sessionId === req.sessionId);
			}
			if (req.limit && req.limit > 0) {
				records = records.slice(-req.limit);
			}
			const success = records.filter((item) => item.success).length;
			return {
				total: records.length,
				success,
				failure: records.length - success,
				records: records.map((item) => ({
					timestamp: item.timestamp,
					appId: item.appId,
					sessionId: item.sessionId,
					traceId: item.traceId,
					success: item.success,
					durationMs: item.durationMs,
					error: item.error,
					errorCode: item.errorCode,
				})),
			};
		},
	};
}

export function createSystemAppRollbackStateImportService(
	appManager: AppManager,
): OSService<
	{ state: ReturnType<AppManager["exportRollbackState"]> },
	{ imported: true }
> {
	return {
		name: "system.app.rollback.state.import",
		requiredPermissions: ["system:write"],
		execute: async (req) => {
			appManager.importRollbackState(req.state);
			return { imported: true };
		},
	};
}

export function createSystemAppRollbackStatePersistService(
	appManager: AppManager,
	store: { set(key: string, value: unknown): void },
	key = "system.app.rollback.state",
): OSService<Record<string, never>, { persisted: true }> {
	return {
		name: "system.app.rollback.state.persist",
		requiredPermissions: ["system:write"],
		execute: async () => {
			store.set(key, appManager.exportRollbackState() as unknown as Record<string, unknown>);
			return { persisted: true };
		},
	};
}

export function createSystemAppRollbackStateRecoverService(
	appManager: AppManager,
	store: { get(key: string): unknown },
	key = "system.app.rollback.state",
): OSService<Record<string, never>, { recovered: boolean; reason?: string; errorCode?: string }> {
	return {
		name: "system.app.rollback.state.recover",
		requiredPermissions: ["system:write"],
		execute: async () => {
			const raw = store.get(key);
			if (!raw || typeof raw !== "object") {
				return { recovered: false, reason: "empty_state" };
			}
			try {
				appManager.importRollbackState(raw as ReturnType<AppManager["exportRollbackState"]>);
				return { recovered: true };
			} catch (error) {
				if (error instanceof OSError) {
					return { recovered: false, reason: "invalid_state", errorCode: error.code };
				}
				throw error;
			}
		},
	};
}

export function createSystemAppRollbackStatsService(
	appManager: AppManager,
): OSService<SystemAppRollbackStatsRequest, SystemAppRollbackStatsResponse> {
	return {
		name: "system.app.rollback.stats",
		requiredPermissions: ["system:read"],
		execute: async (req) => {
			const snapshots = appManager.listRollbackSnapshots(req.appId);
			const now = Date.now();
			const soonWindowMs =
				typeof req.soonToExpireWindowMs === "number" && Number.isFinite(req.soonToExpireWindowMs) && req.soonToExpireWindowMs > 0
					? Math.floor(req.soonToExpireWindowMs)
					: 5 * 60 * 1000;
			const byAppMap = new Map<
				string,
				{
					total: number;
					expired: number;
					active: number;
					soonToExpire: number;
					oldestCreatedAt?: string;
					newestCreatedAt?: string;
				}
			>();
			for (const snapshot of snapshots) {
				const expiresAt = Date.parse(snapshot.expiresAt);
				const isExpired = !Number.isNaN(expiresAt) && expiresAt <= now;
				const isSoonToExpire = !isExpired && !Number.isNaN(expiresAt) && expiresAt <= now + soonWindowMs;
				const bucket = byAppMap.get(snapshot.appId) ?? {
					total: 0,
					expired: 0,
					active: 0,
					soonToExpire: 0,
					oldestCreatedAt: undefined,
					newestCreatedAt: undefined,
				};
				bucket.total += 1;
				bucket.expired += isExpired ? 1 : 0;
				bucket.active += isExpired ? 0 : 1;
				bucket.soonToExpire += isSoonToExpire ? 1 : 0;
				if (!bucket.oldestCreatedAt || Date.parse(snapshot.createdAt) < Date.parse(bucket.oldestCreatedAt)) {
					bucket.oldestCreatedAt = snapshot.createdAt;
				}
				if (!bucket.newestCreatedAt || Date.parse(snapshot.createdAt) > Date.parse(bucket.newestCreatedAt)) {
					bucket.newestCreatedAt = snapshot.createdAt;
				}
				byAppMap.set(snapshot.appId, bucket);
			}
			const byApp = [...byAppMap.entries()].map(([appId, item]) => ({
				appId,
				total: item.total,
				expired: item.expired,
				active: item.active,
				soonToExpire: item.soonToExpire,
				oldestCreatedAt: item.oldestCreatedAt,
				newestCreatedAt: item.newestCreatedAt,
				recentCreatedAt: item.newestCreatedAt,
			}));
			const expiredSnapshots = byApp.reduce((sum, item) => sum + item.expired, 0);
			const soonToExpireSnapshots = byApp.reduce((sum, item) => sum + item.soonToExpire, 0);
			const allCreatedAt = snapshots
				.map((snapshot) => snapshot.createdAt)
				.filter((createdAt) => !Number.isNaN(Date.parse(createdAt)))
				.sort((a, b) => Date.parse(a) - Date.parse(b));
			return {
				totalSnapshots: snapshots.length,
				expiredSnapshots,
				activeSnapshots: snapshots.length - expiredSnapshots,
				soonToExpireSnapshots,
				oldestCreatedAt: allCreatedAt[0],
				newestCreatedAt: allCreatedAt[allCreatedAt.length - 1],
				byApp,
			};
		},
	};
}

export function createSystemAppRollbackGCService(
	appManager: AppManager,
): OSService<
	{ appId?: string; dryRun?: boolean; limit?: number },
	{ scanned: number; eligible: number; removed: number; remaining: number; dryRun: boolean }
> {
	return {
		name: "system.app.rollback.gc",
		requiredPermissions: ["system:write"],
		execute: async (req) => {
			const snapshots = appManager.listRollbackSnapshots(req.appId);
			const now = Date.now();
			let candidates = snapshots.filter((snapshot) => {
				const expiresAt = Date.parse(snapshot.expiresAt);
				return !Number.isNaN(expiresAt) && expiresAt <= now;
			});
			if (typeof req.limit === "number" && Number.isFinite(req.limit) && req.limit > 0) {
				candidates = candidates.slice(0, Math.floor(req.limit));
			}
			if (req.dryRun) {
				return {
					scanned: snapshots.length,
					eligible: candidates.length,
					removed: 0,
					remaining: snapshots.length,
					dryRun: true,
				};
			}
			let removed = 0;
			for (const snapshot of candidates) {
				const before = appManager.listRollbackSnapshots(req.appId).length;
				appManager.consumeRollbackSnapshot(snapshot.token, req.appId ? { appId: req.appId } : undefined);
				const after = appManager.listRollbackSnapshots(req.appId).length;
				if (after < before) {
					removed += 1;
				}
			}
			return {
				scanned: snapshots.length,
				eligible: candidates.length,
				removed,
				remaining: appManager.listRollbackSnapshots(req.appId).length,
				dryRun: false,
			};
		},
	};
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
	servicePrefix?: string;
	errorCode?: string;
	windowMinutes?: number;
	limit?: number;
	bucketMinutes?: number;
	order?: "asc" | "desc";
	offset?: number;
	recentLimit?: number;
}

export interface SystemErrorsResponse {
	totalFailures: number;
	byErrorCode: Record<string, number>;
	byReason: Record<string, number>;
	topReasons: Array<{ reason: string; count: number }>;
	byService: Record<
		string,
		{
			total: number;
			byErrorCode: Record<string, number>;
		}
	>;
	recent: Array<{
		timestamp: string;
		service: string;
		traceId?: string;
		errorCode?: string;
		error?: string;
		appId: string;
		sessionId: string;
	}>;
	trend: Array<{
		bucketStart: string;
		count: number;
	}>;
}

export interface SystemErrorsExportRequest extends SystemErrorsRequest {
	format?: "json" | "csv";
	compress?: boolean;
	signingSecret?: string;
	keyId?: string;
}

export interface SystemErrorsExportResponse {
	format: "json" | "csv";
	contentType: "application/json" | "text/csv" | "application/gzip+base64";
	content: string;
	contentSha256: string;
	compressed: boolean;
	signature: string;
	keyId: string;
}

interface ErrorsSigningKeyRecord {
	keyId: string;
	secret: string;
	createdAt: string;
}

const errorsSigningKeys = new Map<string, ErrorsSigningKeyRecord>();
let activeErrorsSigningKeyId = "default";
if (!errorsSigningKeys.has(activeErrorsSigningKeyId)) {
	errorsSigningKeys.set(activeErrorsSigningKeyId, {
		keyId: activeErrorsSigningKeyId,
		secret: "errors-export-secret",
		createdAt: new Date().toISOString(),
	});
}

export function createSystemErrorsService(
	kernel: LLMOSKernel,
): OSService<SystemErrorsRequest, SystemErrorsResponse> {
	return {
		name: "system.errors",
		requiredPermissions: ["system:read"],
		execute: async (req) => {
			let records = kernel.audit.list().filter((record) => !record.success);
			if (req.windowMinutes && req.windowMinutes > 0) {
				const since = Date.now() - req.windowMinutes * 60 * 1000;
				records = records.filter((record) => Date.parse(record.timestamp) >= since);
			}
			if (req.service) {
				records = records.filter((record) => record.service === req.service);
			}
			if (req.servicePrefix) {
				records = records.filter((record) => record.service.startsWith(req.servicePrefix!));
			}
			if (req.errorCode) {
				records = records.filter((record) => (record.errorCode ?? "UNKNOWN") === req.errorCode);
			}
			if (req.limit && req.limit > 0 && records.length > req.limit) {
				records = records.slice(-req.limit);
			}
			const byErrorCode: Record<string, number> = {};
			const byReason: Record<string, number> = {};
			const byService: Record<
				string,
				{
					total: number;
					byErrorCode: Record<string, number>;
				}
			> = {};
			for (const record of records) {
				const code = record.errorCode ?? "UNKNOWN";
				byErrorCode[code] = (byErrorCode[code] ?? 0) + 1;
				const reason = record.error?.trim() || "UNKNOWN";
				byReason[reason] = (byReason[reason] ?? 0) + 1;
				const serviceBucket = byService[record.service] ?? { total: 0, byErrorCode: {} };
				serviceBucket.total += 1;
				serviceBucket.byErrorCode[code] = (serviceBucket.byErrorCode[code] ?? 0) + 1;
				byService[record.service] = serviceBucket;
			}
			const topReasons = Object.entries(byReason)
				.map(([reason, count]) => ({ reason, count }))
				.sort((a, b) => b.count - a.count || a.reason.localeCompare(b.reason))
				.slice(0, 10);
			const recentOrder = req.order === "asc" ? "asc" : "desc";
			const recentOffset = req.offset && req.offset > 0 ? req.offset : 0;
			const recentLimit = req.recentLimit && req.recentLimit > 0 ? req.recentLimit : 20;
			const recent = [...records]
				.sort((a, b) =>
					recentOrder === "asc"
						? Date.parse(a.timestamp) - Date.parse(b.timestamp)
						: Date.parse(b.timestamp) - Date.parse(a.timestamp),
				)
				.slice(recentOffset, recentOffset + recentLimit)
				.map((record) => ({
					timestamp: record.timestamp,
					service: record.service,
					traceId: record.traceId,
					errorCode: record.errorCode,
					error: record.error,
					appId: record.appId,
					sessionId: record.sessionId,
				}));
			const trend: Array<{ bucketStart: string; count: number }> = [];
			if (req.bucketMinutes && req.bucketMinutes > 0) {
				const bucketMs = req.bucketMinutes * 60 * 1000;
				const buckets = new Map<number, number>();
				for (const record of records) {
					const ts = Date.parse(record.timestamp);
					const bucketStartMs = Math.floor(ts / bucketMs) * bucketMs;
					buckets.set(bucketStartMs, (buckets.get(bucketStartMs) ?? 0) + 1);
				}
				for (const [bucketStartMs, count] of [...buckets.entries()].sort((a, b) => a[0] - b[0])) {
					trend.push({
						bucketStart: new Date(bucketStartMs).toISOString(),
						count,
					});
				}
			}
			return {
				totalFailures: records.length,
				byErrorCode,
				byReason,
				topReasons,
				byService,
				recent,
				trend,
			};
		},
	};
}

export function createSystemErrorsExportService(
	kernel: LLMOSKernel,
	securityService: SecurityService,
): OSService<SystemErrorsExportRequest, SystemErrorsExportResponse> {
	const base = createSystemErrorsService(kernel);
	return {
		name: "system.errors.export",
		requiredPermissions: ["system:read"],
		execute: async (req, ctx) => {
			const { format = "json", ...filters } = req;
			if (format !== "json" && format !== "csv") {
				throw new OSError("E_VALIDATION_FAILED", `Unsupported errors export format: ${format}`);
			}
			const response = await base.execute(filters, ctx);
			const selectedKeyId = req.signingSecret
				? "adhoc"
				: req.keyId && errorsSigningKeys.has(req.keyId)
					? req.keyId
					: activeErrorsSigningKeyId;
			const signingSecret =
				req.signingSecret ?? errorsSigningKeys.get(selectedKeyId)?.secret ?? "errors-export-secret";
			const payload =
				format === "csv"
					? [
							"timestamp,service,errorCode,error,traceId,appId,sessionId",
							...response.recent.map((item) =>
								[
									thisEscapeCsv(item.timestamp),
									thisEscapeCsv(item.service),
									thisEscapeCsv(item.errorCode ?? ""),
									thisEscapeCsv(item.error ?? ""),
									thisEscapeCsv(item.traceId ?? ""),
									thisEscapeCsv(item.appId),
									thisEscapeCsv(item.sessionId),
								].join(","),
							),
						].join("\n")
					: JSON.stringify(response);
			if (req.compress) {
				const content = gzipSync(Buffer.from(payload, "utf8")).toString("base64");
				return {
					format,
					contentType: "application/gzip+base64",
					content,
					contentSha256: createHash("sha256").update(content, "utf8").digest("hex"),
					compressed: true,
					signature: securityService.sign(content, signingSecret),
					keyId: selectedKeyId,
				};
			}
			if (format === "csv") {
				return {
					format: "csv",
					contentType: "text/csv",
					content: payload,
					contentSha256: createHash("sha256").update(payload, "utf8").digest("hex"),
					compressed: false,
					signature: securityService.sign(payload, signingSecret),
					keyId: selectedKeyId,
				};
			}
			return {
				format: "json",
				contentType: "application/json",
				content: payload,
				contentSha256: createHash("sha256").update(payload, "utf8").digest("hex"),
				compressed: false,
				signature: securityService.sign(payload, signingSecret),
				keyId: selectedKeyId,
			};
		},
	};
}

export function createSystemErrorsKeysRotateService(): OSService<
	{
		keyId: string;
		secret: string;
		setActive?: boolean;
	},
	{
		activeKeyId: string;
		keyIds: string[];
	}
> {
	return {
		name: "system.errors.keys.rotate",
		requiredPermissions: ["system:write"],
		execute: async (req) => {
			errorsSigningKeys.set(req.keyId, {
				keyId: req.keyId,
				secret: req.secret,
				createdAt: new Date().toISOString(),
			});
			if (req.setActive !== false) {
				activeErrorsSigningKeyId = req.keyId;
			}
			return {
				activeKeyId: activeErrorsSigningKeyId,
				keyIds: [...errorsSigningKeys.keys()],
			};
		},
	};
}

export function createSystemErrorsKeysListService(): OSService<
	Record<string, never>,
	{
		activeKeyId: string;
		keys: Array<{ keyId: string; createdAt: string; isActive: boolean }>;
	}
> {
	return {
		name: "system.errors.keys.list",
		requiredPermissions: ["system:read"],
		execute: async () => ({
			activeKeyId: activeErrorsSigningKeyId,
			keys: [...errorsSigningKeys.values()].map((item) => ({
				keyId: item.keyId,
				createdAt: item.createdAt,
				isActive: item.keyId === activeErrorsSigningKeyId,
			})),
		}),
	};
}

export function createSystemErrorsKeysActivateService(): OSService<
	{ keyId: string },
	{ activated: boolean; activeKeyId: string }
> {
	return {
		name: "system.errors.keys.activate",
		requiredPermissions: ["system:write"],
		execute: async (req) => {
			if (errorsSigningKeys.has(req.keyId)) {
				activeErrorsSigningKeyId = req.keyId;
				return { activated: true, activeKeyId: activeErrorsSigningKeyId };
			}
			return { activated: false, activeKeyId: activeErrorsSigningKeyId };
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

export interface SystemAlertsHealthRequest {
	windowMinutes?: number;
	topic?: string;
	criticalThreshold?: number;
	unackedThreshold?: number;
	ackP95ThresholdMs?: number;
	dropRateThreshold?: number;
}

export interface SystemAlertsHealthResponse {
	score: number;
	level: "healthy" | "degraded" | "critical";
	indicators: {
		criticalCount: number;
		unackedCount: number;
		ackP95Ms: number;
		dropRate: number;
	};
	breaches: SystemAlertsBreachesResponse["breaches"];
}

export function createSystemAlertsHealthService(
	notificationService: NotificationService,
): OSService<SystemAlertsHealthRequest, SystemAlertsHealthResponse> {
	return {
		name: "system.alerts.health",
		requiredPermissions: ["system:read"],
		execute: async (req) => {
			const windowMinutes = req.windowMinutes && req.windowMinutes > 0 ? req.windowMinutes : 10;
			const criticalThreshold = req.criticalThreshold ?? 10;
			const unackedThreshold = req.unackedThreshold ?? 20;
			const ackP95ThresholdMs = req.ackP95ThresholdMs ?? 300000;
			const dropRateThreshold = req.dropRateThreshold ?? 0.1;
			const breaches = await createSystemAlertsBreachesService(notificationService).execute(
				{
					windowMinutes,
					topic: req.topic,
					criticalThreshold,
					unackedThreshold,
					ackP95ThresholdMs,
				},
				{
					appId: "system",
					sessionId: "system",
					permissions: ["system:read"],
					workingDirectory: process.cwd(),
				},
			);
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
			const stats = notificationService.getStats();
			const droppedTotal =
				stats.dropped.dedupe + stats.dropped.muted + stats.dropped.rateLimited;
			const dropRate = stats.sent + droppedTotal === 0 ? 0 : droppedTotal / (stats.sent + droppedTotal);

			let score = 100;
			score -= breaches.breaches.length * 25;
			if (dropRate > dropRateThreshold) {
				score -= 20;
			}
			if (score < 0) {
				score = 0;
			}

			const level: SystemAlertsHealthResponse["level"] = score >= 80 ? "healthy" : score >= 50 ? "degraded" : "critical";

			return {
				score,
				level,
				indicators: {
					criticalCount: trends.bySeverity.critical ?? 0,
					unackedCount: unacked.total,
					ackP95Ms: slo.p95AckLatencyMs,
					dropRate,
				},
				breaches: breaches.breaches,
			};
		},
	};
}

export interface SystemAlertsAutoRemediateAction {
	id: string;
	type: "reset_net_circuit" | "replay_scheduler_failure" | "mute_topic";
	params: Record<string, unknown>;
	reason: string;
	rollback?: {
		type: "notification.unmute";
		params: Record<string, unknown>;
	};
}

export interface SystemAlertsAutoRemediatePlanRequest {
	topic?: string;
	windowMinutes?: number;
	overdueThresholdMs?: number;
}

export interface SystemAlertsAutoRemediatePlanResponse {
	generatedAt: string;
	actions: SystemAlertsAutoRemediateAction[];
}

export function createSystemAlertsAutoRemediatePlanService(
	notificationService: NotificationService,
	schedulerService?: SchedulerService,
	netService?: NetService,
): OSService<SystemAlertsAutoRemediatePlanRequest, SystemAlertsAutoRemediatePlanResponse> {
	return {
		name: "system.alerts.auto-remediate.plan",
		requiredPermissions: ["system:read"],
		execute: async (req) => {
			const topic = req.topic ?? "system.alert";
			const health = await createSystemAlertsHealthService(notificationService).execute(
				{
					topic,
					windowMinutes: req.windowMinutes,
				},
				{
					appId: "system",
					sessionId: "system",
					permissions: ["system:read"],
					workingDirectory: process.cwd(),
				},
			);
			const backlog = await createSystemAlertsBacklogService(notificationService).execute(
				{
					topic,
					overdueThresholdMs: req.overdueThresholdMs,
				},
				{
					appId: "system",
					sessionId: "system",
					permissions: ["system:read"],
					workingDirectory: process.cwd(),
				},
			);
			const actions: SystemAlertsAutoRemediateAction[] = [];
			if (health.level !== "healthy" && netService) {
				const circuits = netService.getCircuitSnapshot();
				const openHosts = Object.entries(circuits)
					.filter(([, state]) => state.state === "open")
					.map(([host]) => host);
				for (const host of openHosts) {
					actions.push({
						id: `reset-circuit-${host}`,
						type: "reset_net_circuit",
						params: { host },
						reason: `Open circuit detected for ${host}`,
					});
				}
			}
			if (schedulerService) {
				const failure = schedulerService.listFailures(1)[0];
				if (failure) {
					actions.push({
						id: `replay-${failure.id}`,
						type: "replay_scheduler_failure",
						params: { id: failure.id },
						reason: `Retry latest failed scheduler task ${failure.id}`,
					});
				}
			}
			if (backlog.overdueCount > 0) {
				const muteMs = Math.min(300000, backlog.oldestUnackedAgeMs);
				actions.push({
					id: `mute-${topic}`,
					type: "mute_topic",
					params: { topic, durationMs: muteMs },
					reason: `Backlog overdue count=${backlog.overdueCount}, temporarily mute noisy topic`,
					rollback: {
						type: "notification.unmute",
						params: { topic },
					},
				});
			}
			return {
				generatedAt: new Date().toISOString(),
				actions,
			};
		},
	};
}

export interface SystemAlertsAutoRemediateExecuteRequest {
	approved?: boolean;
	dryRun?: boolean;
	approver?: string;
	approvalExpiresAt?: string;
	ticketId?: string;
	actions: SystemAlertsAutoRemediateAction[];
}

export interface SystemAlertsAutoRemediateExecuteResponse {
	approved: boolean;
	executed: number;
	results: Array<{
		id: string;
		ok: boolean;
		message: string;
		rollback?: SystemAlertsAutoRemediateAction["rollback"];
	}>;
}

export interface SystemAlertsAutoRemediateAuditRecord {
	id: string;
	timestamp: string;
	appId: string;
	sessionId: string;
	traceId?: string;
	approved: boolean;
	approver?: string;
	approvalExpiresAt?: string;
	dryRun: boolean;
	ticketId?: string;
	executed: number;
	results: SystemAlertsAutoRemediateExecuteResponse["results"];
}

const autoRemediateAuditRecords: SystemAlertsAutoRemediateAuditRecord[] = [];

export function createSystemAlertsAutoRemediateExecuteService(
	notificationService: NotificationService,
	schedulerService: SchedulerService,
	netService: NetService,
): OSService<SystemAlertsAutoRemediateExecuteRequest, SystemAlertsAutoRemediateExecuteResponse> {
	return {
		name: "system.alerts.auto-remediate.execute",
		requiredPermissions: ["system:write"],
		execute: async (req, ctx) => {
			const appendAudit = (record: Omit<SystemAlertsAutoRemediateAuditRecord, "id" | "timestamp">): void => {
				autoRemediateAuditRecords.push({
					id: `ar-${Date.now()}-${autoRemediateAuditRecords.length + 1}`,
					timestamp: new Date().toISOString(),
					...record,
				});
				if (autoRemediateAuditRecords.length > 1000) {
					autoRemediateAuditRecords.splice(0, autoRemediateAuditRecords.length - 1000);
				}
			};
			if (!req.approved) {
				const response = {
					approved: false,
					executed: 0,
					results: req.actions.map((action) => ({
						id: action.id,
						ok: false,
						message: "approval_required",
					})),
				};
				appendAudit({
					appId: ctx.appId,
					sessionId: ctx.sessionId,
					traceId: ctx.traceId,
					approved: false,
					approver: req.approver,
					approvalExpiresAt: req.approvalExpiresAt,
					dryRun: req.dryRun ?? false,
					ticketId: req.ticketId,
					executed: 0,
					results: response.results,
				});
				return response;
			}
			const approvalExpiresAtMs = req.approvalExpiresAt ? Date.parse(req.approvalExpiresAt) : Number.NaN;
			if (!req.approver || Number.isNaN(approvalExpiresAtMs) || approvalExpiresAtMs <= Date.now()) {
				const response = {
					approved: false,
					executed: 0,
					results: req.actions.map((action) => ({
						id: action.id,
						ok: false,
						message: "approval_metadata_invalid",
					})),
				};
				appendAudit({
					appId: ctx.appId,
					sessionId: ctx.sessionId,
					traceId: ctx.traceId,
					approved: false,
					approver: req.approver,
					approvalExpiresAt: req.approvalExpiresAt,
					dryRun: req.dryRun ?? false,
					ticketId: req.ticketId,
					executed: 0,
					results: response.results,
				});
				return response;
			}
			const results: SystemAlertsAutoRemediateExecuteResponse["results"] = [];
			let executed = 0;
			for (const action of req.actions) {
				if (req.dryRun) {
					results.push({
						id: action.id,
						ok: true,
						message: "dry_run",
						rollback: action.rollback,
					});
					executed += 1;
					continue;
				}
				if (action.type === "reset_net_circuit") {
					const host = typeof action.params.host === "string" ? action.params.host : undefined;
					const cleared = netService.resetCircuits(host);
					results.push({
						id: action.id,
						ok: true,
						message: `cleared=${cleared}`,
						rollback: action.rollback,
					});
					executed += 1;
					continue;
				}
				if (action.type === "replay_scheduler_failure") {
					const id = String(action.params.id ?? "");
					const replayed = schedulerService.replayFailure(id);
					results.push({
						id: action.id,
						ok: replayed,
						message: replayed ? "replayed" : "replay_failed",
						rollback: action.rollback,
					});
					executed += replayed ? 1 : 0;
					continue;
				}
				if (action.type === "mute_topic") {
					const topic = String(action.params.topic ?? "");
					const durationMs = Number(action.params.durationMs ?? 0);
					notificationService.muteTopic({
						topic,
						durationMs: durationMs > 0 ? durationMs : 60000,
					});
					results.push({
						id: action.id,
						ok: true,
						message: "muted",
						rollback: action.rollback,
					});
					executed += 1;
					continue;
				}
				results.push({
					id: action.id,
					ok: false,
					message: "unknown_action",
					rollback: action.rollback,
				});
			}
			const response = {
				approved: true,
				executed,
				results,
			};
			appendAudit({
				appId: ctx.appId,
				sessionId: ctx.sessionId,
				traceId: ctx.traceId,
				approved: true,
				approver: req.approver,
				approvalExpiresAt: req.approvalExpiresAt,
				dryRun: req.dryRun ?? false,
				ticketId: req.ticketId,
				executed,
				results,
			});
			return response;
		},
	};
}

export function createSystemAlertsAutoRemediateAuditService(): OSService<
	{
		sessionId?: string;
		limit?: number;
	},
	{
		records: SystemAlertsAutoRemediateAuditRecord[];
	}
> {
	return {
		name: "system.alerts.auto-remediate.audit",
		requiredPermissions: ["system:read"],
		execute: async (req) => {
			let records = [...autoRemediateAuditRecords];
			if (req.sessionId) {
				records = records.filter((item) => item.sessionId === req.sessionId);
			}
			if (req.limit && req.limit > 0) {
				records = records.slice(-req.limit);
			}
			return {
				records,
			};
		},
	};
}

export interface SystemPolicyUpdateRequest {
	patch: Partial<ReturnType<LLMOSKernel["policy"]["getSnapshot"]>>;
	createVersionLabel?: string;
}

export function createSystemPolicyUpdateService(
	kernel: LLMOSKernel,
): OSService<SystemPolicyUpdateRequest, { policy: ReturnType<LLMOSKernel["policy"]["getSnapshot"]> }> {
	return {
		name: "system.policy.update",
		requiredPermissions: ["system:write"],
		execute: async (req) => {
			const policy = kernel.policy.updateRules(req.patch);
			if (req.createVersionLabel !== undefined) {
				kernel.policy.createVersion(req.createVersionLabel);
			}
			return { policy };
		},
	};
}

export function createSystemPolicyVersionCreateService(
	kernel: LLMOSKernel,
): OSService<{ label?: string }, { versionId: string; createdAt: string; label?: string }> {
	return {
		name: "system.policy.version.create",
		requiredPermissions: ["system:write"],
		execute: async (req) => {
			const version = kernel.policy.createVersion(req.label);
			return {
				versionId: version.versionId,
				createdAt: version.createdAt,
				label: version.label,
			};
		},
	};
}

export function createSystemPolicyVersionListService(
	kernel: LLMOSKernel,
): OSService<Record<string, never>, { versions: ReturnType<LLMOSKernel["policy"]["listVersions"]> }> {
	return {
		name: "system.policy.version.list",
		requiredPermissions: ["system:read"],
		execute: async () => ({
			versions: kernel.policy.listVersions(),
		}),
	};
}

export function createSystemPolicyVersionRollbackService(
	kernel: LLMOSKernel,
): OSService<{ versionId: string }, { rolledBack: boolean; policy: ReturnType<LLMOSKernel["policy"]["getSnapshot"]> }> {
	return {
		name: "system.policy.version.rollback",
		requiredPermissions: ["system:write"],
		execute: async (req) => ({
			rolledBack: kernel.policy.rollbackVersion(req.versionId),
			policy: kernel.policy.getSnapshot(),
		}),
	};
}

export interface SystemPolicySimulateBatchRequest {
	inputs: PolicyInput[];
}

export interface SystemPolicySimulateBatchResponse {
	total: number;
	denied: number;
	decisions: Array<{
		allowed: boolean;
		reason?: string;
	}>;
	reasons: Record<string, number>;
}

export function createSystemPolicySimulateBatchService(
	kernel: LLMOSKernel,
): OSService<SystemPolicySimulateBatchRequest, SystemPolicySimulateBatchResponse> {
	return {
		name: "system.policy.simulate.batch",
		requiredPermissions: ["system:read"],
		execute: async (req, ctx) => {
			const decisions = req.inputs.map((input) => kernel.policy.evaluate(input, ctx));
			const reasons: Record<string, number> = {};
			for (const decision of decisions) {
				if (!decision.allowed) {
					const key = decision.reason ?? "denied";
					reasons[key] = (reasons[key] ?? 0) + 1;
				}
			}
			const denied = decisions.filter((item) => !item.allowed).length;
			return {
				total: decisions.length,
				denied,
				decisions,
				reasons,
			};
		},
	};
}

export interface SystemPolicyGuardApplyRequest {
	patch: Partial<ReturnType<LLMOSKernel["policy"]["getSnapshot"]>>;
	simulationInputs?: PolicyInput[];
	requireAllSimulationsAllowed?: boolean;
	healthCheck?: {
		service?: string;
		maxErrorRate?: number;
		minSuccessRate?: number;
	};
}

export interface SystemPolicyGuardApplyResponse {
	applied: boolean;
	rolledBack: boolean;
	reason?: "simulation_denied" | "health_check_failed";
	simulation?: SystemPolicySimulateBatchResponse;
	policy: ReturnType<LLMOSKernel["policy"]["getSnapshot"]>;
}

export function createSystemPolicyGuardApplyService(
	kernel: LLMOSKernel,
): OSService<SystemPolicyGuardApplyRequest, SystemPolicyGuardApplyResponse> {
	return {
		name: "system.policy.guard.apply",
		requiredPermissions: ["system:write"],
		execute: async (req, ctx) => {
			let simulation: SystemPolicySimulateBatchResponse | undefined;
			if (req.simulationInputs && req.simulationInputs.length > 0) {
				simulation = await createSystemPolicySimulateBatchService(kernel).execute(
					{
						inputs: req.simulationInputs,
					},
					ctx,
				);
				if (req.requireAllSimulationsAllowed && simulation.denied > 0) {
					return {
						applied: false,
						rolledBack: false,
						reason: "simulation_denied",
						simulation,
						policy: kernel.policy.getSnapshot(),
					};
				}
			}

			const preVersion = kernel.policy.createVersion("guard:pre-apply");
			kernel.policy.updateRules(req.patch);

			if (req.healthCheck) {
				const snapshots = kernel.metrics.allSnapshots();
				const target = req.healthCheck.service
					? snapshots.filter((item) => item.service === req.healthCheck!.service)
					: snapshots;
				const total = target.reduce((sum, item) => sum + item.total, 0);
				const success = target.reduce((sum, item) => sum + item.success, 0);
				const failure = target.reduce((sum, item) => sum + item.failure, 0);
				const successRate = total === 0 ? 1 : success / total;
				const errorRate = total === 0 ? 0 : failure / total;
				const failedBySuccess =
					req.healthCheck.minSuccessRate !== undefined && successRate < req.healthCheck.minSuccessRate;
				const failedByError =
					req.healthCheck.maxErrorRate !== undefined && errorRate > req.healthCheck.maxErrorRate;
				if (failedBySuccess || failedByError) {
					kernel.policy.rollbackVersion(preVersion.versionId);
					return {
						applied: false,
						rolledBack: true,
						reason: "health_check_failed",
						simulation,
						policy: kernel.policy.getSnapshot(),
					};
				}
			}
			kernel.policy.createVersion("guard:applied");
			return {
				applied: true,
				rolledBack: false,
				simulation,
				policy: kernel.policy.getSnapshot(),
			};
		},
	};
}

export interface SystemSLORequest {
	services?: string[];
}

export interface SystemSLOResponse {
	global: {
		total: number;
		success: number;
		failure: number;
		successRate: number;
		errorRate: number;
		p95DurationMs: number;
	};
	services: ReturnType<LLMOSKernel["metrics"]["allSnapshots"]>;
	alerting: {
		ackedCount: number;
		p95AckLatencyMs: number;
	};
}

export interface SLOThresholdRule {
	id: string;
	metric: "global_success_rate" | "global_error_rate" | "alert_ack_p95_ms";
	operator: "gt" | "lt";
	threshold: number;
	severity: "warning" | "critical";
}

const sloRules = new Map<string, SLOThresholdRule>();

export function createSystemSLOService(
	kernel: LLMOSKernel,
	notificationService: NotificationService,
): OSService<SystemSLORequest, SystemSLOResponse> {
	return {
		name: "system.slo",
		requiredPermissions: ["system:read"],
		execute: async (req) => {
			const serviceMetrics = kernel.metrics
				.allSnapshots()
				.filter((metric) => !req.services || req.services.includes(metric.service));
			const total = serviceMetrics.reduce((sum, item) => sum + item.total, 0);
			const success = serviceMetrics.reduce((sum, item) => sum + item.success, 0);
			const failure = serviceMetrics.reduce((sum, item) => sum + item.failure, 0);
			const p95DurationMs =
				serviceMetrics.length === 0 ? 0 : Math.max(...serviceMetrics.map((item) => item.p95DurationMs));
			const alertSLO = await createSystemAlertsSLOService(notificationService).execute(
				{},
				{
					appId: "system",
					sessionId: "system",
					permissions: ["system:read"],
					workingDirectory: process.cwd(),
				},
			);
			return {
				global: {
					total,
					success,
					failure,
					successRate: total === 0 ? 1 : success / total,
					errorRate: total === 0 ? 0 : failure / total,
					p95DurationMs,
				},
				services: serviceMetrics,
				alerting: {
					ackedCount: alertSLO.ackedCount,
					p95AckLatencyMs: alertSLO.p95AckLatencyMs,
				},
			};
		},
	};
}

export function createSystemSLORulesUpsertService(): OSService<{ rule: SLOThresholdRule }, { rule: SLOThresholdRule }> {
	return {
		name: "system.slo.rules.upsert",
		requiredPermissions: ["system:write"],
		execute: async (req) => {
			sloRules.set(req.rule.id, req.rule);
			return { rule: req.rule };
		},
	};
}

export function createSystemSLORulesListService(): OSService<Record<string, never>, { rules: SLOThresholdRule[] }> {
	return {
		name: "system.slo.rules.list",
		requiredPermissions: ["system:read"],
		execute: async () => ({
			rules: [...sloRules.values()],
		}),
	};
}

export function createSystemSLORulesEvaluateService(
	kernel: LLMOSKernel,
	notificationService: NotificationService,
): OSService<
	Record<string, never>,
	{
		breaches: Array<{
			ruleId: string;
			metric: SLOThresholdRule["metric"];
			value: number;
			threshold: number;
			severity: SLOThresholdRule["severity"];
		}>;
	}
> {
	return {
		name: "system.slo.rules.evaluate",
		requiredPermissions: ["system:read"],
		execute: async () => {
			const slo = await createSystemSLOService(kernel, notificationService).execute(
				{},
				{
					appId: "system",
					sessionId: "system",
					permissions: ["system:read"],
					workingDirectory: process.cwd(),
				},
			);
			const valueByMetric: Record<SLOThresholdRule["metric"], number> = {
				global_success_rate: slo.global.successRate,
				global_error_rate: slo.global.errorRate,
				alert_ack_p95_ms: slo.alerting.p95AckLatencyMs,
			};
			const breaches: Array<{
				ruleId: string;
				metric: SLOThresholdRule["metric"];
				value: number;
				threshold: number;
				severity: SLOThresholdRule["severity"];
			}> = [];
			for (const rule of sloRules.values()) {
				const value = valueByMetric[rule.metric];
				const matched = rule.operator === "gt" ? value > rule.threshold : value < rule.threshold;
				if (matched) {
					breaches.push({
						ruleId: rule.id,
						metric: rule.metric,
						value,
						threshold: rule.threshold,
						severity: rule.severity,
					});
				}
			}
			return { breaches };
		},
	};
}

export interface SystemAuditExportRequest {
	since?: string;
	until?: string;
	cursor?: number;
	limit?: number;
	format?: "jsonl";
	compress?: boolean;
	signingSecret?: string;
	keyId?: string;
}

export interface SystemAuditExportResponse {
	content: string;
	contentType: string;
	compressed: boolean;
	signature: string;
	keyId: string;
	nextCursor: number;
	exported: number;
}

interface AuditSigningKeyRecord {
	keyId: string;
	secret: string;
	createdAt: string;
}

const auditSigningKeys = new Map<string, AuditSigningKeyRecord>();
let activeAuditSigningKeyId = "default";
if (!auditSigningKeys.has(activeAuditSigningKeyId)) {
	auditSigningKeys.set(activeAuditSigningKeyId, {
		keyId: activeAuditSigningKeyId,
		secret: "audit-export-secret",
		createdAt: new Date().toISOString(),
	});
}

export function createSystemAuditExportService(
	kernel: LLMOSKernel,
	securityService: SecurityService,
): OSService<SystemAuditExportRequest, SystemAuditExportResponse> {
	return {
		name: "system.audit.export",
		requiredPermissions: ["system:read"],
		execute: async (req) => {
			if (req.format && req.format !== "jsonl") {
				throw new OSError("E_VALIDATION_FAILED", `Unsupported audit export format: ${req.format}`);
			}
			let records = kernel.audit.list();
			if (req.since) {
				const since = Date.parse(req.since);
				if (!Number.isNaN(since)) {
					records = records.filter((item) => Date.parse(item.timestamp) >= since);
				}
			}
			if (req.until) {
				const until = Date.parse(req.until);
				if (!Number.isNaN(until)) {
					records = records.filter((item) => Date.parse(item.timestamp) <= until);
				}
			}
			const cursor = req.cursor && req.cursor > 0 ? req.cursor : 0;
			const limit = req.limit && req.limit > 0 ? req.limit : 100;
			const sliced = records.slice(cursor, cursor + limit);
			const jsonl = sliced.map((item) => JSON.stringify(item)).join("\n");
			const selectedKeyId = req.signingSecret
				? "adhoc"
				: req.keyId && auditSigningKeys.has(req.keyId)
					? req.keyId
					: activeAuditSigningKeyId;
			const signingSecret =
				req.signingSecret ?? auditSigningKeys.get(selectedKeyId)?.secret ?? "audit-export-secret";
			if (req.compress) {
				const compressedBuffer = gzipSync(Buffer.from(jsonl, "utf8"));
				const content = compressedBuffer.toString("base64");
				return {
					content,
					contentType: "application/gzip+base64",
					compressed: true,
					signature: securityService.sign(content, signingSecret),
					keyId: selectedKeyId,
					nextCursor: cursor + sliced.length,
					exported: sliced.length,
				};
			}
			return {
				content: jsonl,
				contentType: "application/x-ndjson",
				compressed: false,
				signature: securityService.sign(jsonl, signingSecret),
				keyId: selectedKeyId,
				nextCursor: cursor + sliced.length,
				exported: sliced.length,
			};
		},
	};
}

export function createSystemAuditKeysRotateService(): OSService<
	{
		keyId: string;
		secret: string;
		setActive?: boolean;
	},
	{
		activeKeyId: string;
		keyIds: string[];
	}
> {
	return {
		name: "system.audit.keys.rotate",
		requiredPermissions: ["system:write"],
		execute: async (req) => {
			auditSigningKeys.set(req.keyId, {
				keyId: req.keyId,
				secret: req.secret,
				createdAt: new Date().toISOString(),
			});
			if (req.setActive !== false) {
				activeAuditSigningKeyId = req.keyId;
			}
			return {
				activeKeyId: activeAuditSigningKeyId,
				keyIds: [...auditSigningKeys.keys()],
			};
		},
	};
}

export function createSystemAuditKeysListService(): OSService<
	Record<string, never>,
	{
		activeKeyId: string;
		keys: Array<{ keyId: string; createdAt: string; isActive: boolean }>;
	}
> {
	return {
		name: "system.audit.keys.list",
		requiredPermissions: ["system:read"],
		execute: async () => ({
			activeKeyId: activeAuditSigningKeyId,
			keys: [...auditSigningKeys.values()].map((item) => ({
				keyId: item.keyId,
				createdAt: item.createdAt,
				isActive: item.keyId === activeAuditSigningKeyId,
			})),
		}),
	};
}

export function createSystemAuditKeysActivateService(): OSService<
	{ keyId: string },
	{ activated: boolean; activeKeyId: string }
> {
	return {
		name: "system.audit.keys.activate",
		requiredPermissions: ["system:write"],
		execute: async (req) => {
			if (auditSigningKeys.has(req.keyId)) {
				activeAuditSigningKeyId = req.keyId;
				return { activated: true, activeKeyId: activeAuditSigningKeyId };
			}
			return { activated: false, activeKeyId: activeAuditSigningKeyId };
		},
	};
}

export function createSystemQuotaService(
	tenantGovernor: TenantQuotaGovernor,
): OSService<{ tenantId: string }, { tenantId: string; quota?: { maxToolCalls: number; maxTokens: number }; usage: { toolCalls: number; tokens: number } }> {
	return {
		name: "system.quota",
		requiredPermissions: ["system:read"],
		execute: async (req) => ({
			tenantId: req.tenantId,
			quota: tenantGovernor.getQuota(req.tenantId),
			usage: tenantGovernor.getUsage(req.tenantId),
		}),
	};
}

export function createSystemQuotaAdjustService(
	tenantGovernor: TenantQuotaGovernor,
): OSService<
	{
		tenantId: string;
		loadFactor: number;
		priority: "low" | "normal" | "high";
	},
	{
		tenantId: string;
		quota?: { maxToolCalls: number; maxTokens: number };
	}
> {
	return {
		name: "system.quota.adjust",
		requiredPermissions: ["system:write"],
		execute: async (req) => ({
			tenantId: req.tenantId,
			quota: tenantGovernor.adjustQuota(req.tenantId, {
				loadFactor: req.loadFactor,
				priority: req.priority,
			}),
		}),
	};
}

export interface TenantQuotaPolicyRule {
	id: string;
	tier: "free" | "pro" | "enterprise";
	priority: "low" | "normal" | "high";
	loadMin?: number;
	loadMax?: number;
	hourStart?: number;
	hourEnd?: number;
	quota: {
		maxToolCalls: number;
		maxTokens: number;
	};
}

const quotaPolicies = new Map<string, TenantQuotaPolicyRule>();

export function createSystemQuotaPolicyUpsertService(): OSService<
	{ policy: TenantQuotaPolicyRule },
	{ policy: TenantQuotaPolicyRule }
> {
	return {
		name: "system.quota.policy.upsert",
		requiredPermissions: ["system:write"],
		execute: async (req) => {
			quotaPolicies.set(req.policy.id, req.policy);
			return { policy: req.policy };
		},
	};
}

export function createSystemQuotaPolicyListService(): OSService<Record<string, never>, { policies: TenantQuotaPolicyRule[] }> {
	return {
		name: "system.quota.policy.list",
		requiredPermissions: ["system:read"],
		execute: async () => ({
			policies: [...quotaPolicies.values()],
		}),
	};
}

export function createSystemQuotaPolicyApplyService(
	tenantGovernor: TenantQuotaGovernor,
): OSService<
	{
		tenantId: string;
		tier: "free" | "pro" | "enterprise";
		priority: "low" | "normal" | "high";
		loadFactor: number;
		hour?: number;
	},
	{
		matchedPolicyId?: string;
		quota?: {
			maxToolCalls: number;
			maxTokens: number;
		};
	}
> {
	return {
		name: "system.quota.policy.apply",
		requiredPermissions: ["system:write"],
		execute: async (req) => {
			const hour = req.hour ?? new Date().getHours();
			const matched = [...quotaPolicies.values()].find((policy) => {
				if (policy.tier !== req.tier) return false;
				if (policy.priority !== req.priority) return false;
				if (policy.loadMin !== undefined && req.loadFactor < policy.loadMin) return false;
				if (policy.loadMax !== undefined && req.loadFactor > policy.loadMax) return false;
				if (policy.hourStart !== undefined && hour < policy.hourStart) return false;
				if (policy.hourEnd !== undefined && hour > policy.hourEnd) return false;
				return true;
			});
			if (!matched) {
				return {};
			}
			tenantGovernor.setQuota(req.tenantId, {
				maxToolCalls: matched.quota.maxToolCalls,
				maxTokens: matched.quota.maxTokens,
			});
			return {
				matchedPolicyId: matched.id,
				quota: tenantGovernor.getQuota(req.tenantId),
			};
		},
	};
}

export function createSystemQuotaHotspotsService(
	tenantGovernor: TenantQuotaGovernor,
): OSService<
	{
		thresholdToolCalls: number;
		limit?: number;
	},
	{
		hotspots: Array<{ tenantId: string; toolCalls: number; tokens: number }>;
	}
> {
	return {
		name: "system.quota.hotspots",
		requiredPermissions: ["system:read"],
		execute: async (req) => {
			const thresholdToolCalls = req.thresholdToolCalls > 0 ? req.thresholdToolCalls : 10;
			const limit = req.limit && req.limit > 0 ? req.limit : 10;
			const hotspots = Object.entries(tenantGovernor.listUsage())
				.filter(([, usage]) => usage.toolCalls >= thresholdToolCalls)
				.map(([tenantId, usage]) => ({
					tenantId,
					toolCalls: usage.toolCalls,
					tokens: usage.tokens,
				}))
				.sort((a, b) => b.toolCalls - a.toolCalls)
				.slice(0, limit);
			return { hotspots };
		},
	};
}

export function createSystemQuotaHotspotsIsolateService(
	tenantGovernor: TenantQuotaGovernor,
): OSService<
	{
		thresholdToolCalls: number;
		reductionFactor?: number;
	},
	{
		isolated: Array<{
			tenantId: string;
			before?: { maxToolCalls: number; maxTokens: number };
			after?: { maxToolCalls: number; maxTokens: number };
		}>;
	}
> {
	return {
		name: "system.quota.hotspots.isolate",
		requiredPermissions: ["system:write"],
		execute: async (req) => {
			const reductionFactor = req.reductionFactor && req.reductionFactor > 0 ? req.reductionFactor : 0.5;
			const thresholdToolCalls = req.thresholdToolCalls > 0 ? req.thresholdToolCalls : 10;
			const usage = tenantGovernor.listUsage();
			const isolated: Array<{
				tenantId: string;
				before?: { maxToolCalls: number; maxTokens: number };
				after?: { maxToolCalls: number; maxTokens: number };
			}> = [];
			for (const [tenantId, currentUsage] of Object.entries(usage)) {
				if (currentUsage.toolCalls < thresholdToolCalls) continue;
				const before = tenantGovernor.getQuota(tenantId);
				if (!before) continue;
				tenantGovernor.setQuota(tenantId, {
					maxToolCalls: Math.max(1, Math.floor(before.maxToolCalls * reductionFactor)),
					maxTokens: Math.max(100, Math.floor(before.maxTokens * reductionFactor)),
				});
				isolated.push({
					tenantId,
					before,
					after: tenantGovernor.getQuota(tenantId),
				});
			}
			return { isolated };
		},
	};
}

export interface SystemChaosRunRequest {
	scenario: "policy_denied" | "scheduler_failure" | "alert_storm" | "scheduler_replay";
}

export interface SystemChaosRunResponse {
	scenario: SystemChaosRunRequest["scenario"];
	passed: boolean;
	details: Record<string, unknown>;
}

export function createSystemChaosRunService(
	kernel: LLMOSKernel,
	notificationService: NotificationService,
	schedulerService: SchedulerService,
): OSService<SystemChaosRunRequest, SystemChaosRunResponse> {
	return {
		name: "system.chaos.run",
		requiredPermissions: ["system:write"],
		execute: async (req) => {
			if (req.scenario === "policy_denied") {
				const decision = kernel.policy.evaluate(
					{
						command: "rm -rf /",
					},
					{
						appId: "chaos",
						sessionId: "chaos",
						permissions: [],
						workingDirectory: process.cwd(),
					},
				);
				return {
					scenario: req.scenario,
					passed: !decision.allowed,
					details: {
						decision,
					},
				};
			}
			if (req.scenario === "scheduler_failure") {
				const id = `chaos-${Date.now()}`;
				schedulerService.scheduleRetryable(
					id,
					async () => {
						throw new OSError("E_SERVICE_EXECUTION", "chaos-failure");
					},
					{ maxRetries: 0, backoffMs: 1 },
				);
				await new Promise((resolve) => setTimeout(resolve, 5));
				const failures = schedulerService.listFailures(5).filter((item) => item.id === id);
				return {
					scenario: req.scenario,
					passed: failures.length > 0,
					details: {
						failures,
					},
				};
			}
			if (req.scenario === "scheduler_replay") {
				const id = `chaos-replay-${Date.now()}`;
				schedulerService.scheduleRetryable(
					id,
					async () => {
						throw new OSError("E_SERVICE_EXECUTION", "chaos-replay-failure");
					},
					{ maxRetries: 0, backoffMs: 1 },
				);
				await new Promise((resolve) => setTimeout(resolve, 5));
				const replayed = schedulerService.replayFailure(id);
				return {
					scenario: req.scenario,
					passed: replayed,
					details: {
						replayed,
					},
				};
			}
			const before = notificationService.getStats();
			notificationService.send({ topic: "system.alert", message: "chaos-a", severity: "critical" });
			notificationService.send({ topic: "system.alert", message: "chaos-b", severity: "critical" });
			const after = notificationService.getStats();
			return {
				scenario: req.scenario,
				passed: after.sent >= before.sent,
				details: {
					before,
					after,
				},
			};
		},
	};
}

const chaosBaselines = new Map<
	string,
	{
		capturedAt: string;
		total: number;
		failure: number;
		errorRate: number;
	}
>();

export interface GovernanceStateSnapshot {
	sloRules: SLOThresholdRule[];
	quotaPolicies: TenantQuotaPolicyRule[];
	auditKeys: Array<{ keyId: string; secret: string; createdAt: string }>;
	activeAuditKeyId: string;
	chaosBaselines: Array<{
		name: string;
		capturedAt: string;
		total: number;
		failure: number;
		errorRate: number;
	}>;
}

function exportGovernanceState(): GovernanceStateSnapshot {
	return {
		sloRules: [...sloRules.values()],
		quotaPolicies: [...quotaPolicies.values()],
		auditKeys: [...auditSigningKeys.values()].map((item) => ({
			keyId: item.keyId,
			secret: item.secret,
			createdAt: item.createdAt,
		})),
		activeAuditKeyId: activeAuditSigningKeyId,
		chaosBaselines: [...chaosBaselines.entries()].map(([name, baseline]) => ({
			name,
			capturedAt: baseline.capturedAt,
			total: baseline.total,
			failure: baseline.failure,
			errorRate: baseline.errorRate,
		})),
	};
}

function importGovernanceState(snapshot: GovernanceStateSnapshot): void {
	sloRules.clear();
	for (const rule of snapshot.sloRules ?? []) {
		sloRules.set(rule.id, rule);
	}
	quotaPolicies.clear();
	for (const policy of snapshot.quotaPolicies ?? []) {
		quotaPolicies.set(policy.id, policy);
	}
	auditSigningKeys.clear();
	for (const key of snapshot.auditKeys ?? []) {
		auditSigningKeys.set(key.keyId, {
			keyId: key.keyId,
			secret: key.secret,
			createdAt: key.createdAt,
		});
	}
	if (!auditSigningKeys.has("default")) {
		auditSigningKeys.set("default", {
			keyId: "default",
			secret: "audit-export-secret",
			createdAt: new Date().toISOString(),
		});
	}
	activeAuditSigningKeyId = snapshot.activeAuditKeyId && auditSigningKeys.has(snapshot.activeAuditKeyId)
		? snapshot.activeAuditKeyId
		: "default";
	chaosBaselines.clear();
	for (const baseline of snapshot.chaosBaselines ?? []) {
		chaosBaselines.set(baseline.name, {
			capturedAt: baseline.capturedAt,
			total: baseline.total,
			failure: baseline.failure,
			errorRate: baseline.errorRate,
		});
	}
}

export function createSystemChaosBaselineCaptureService(
	kernel: LLMOSKernel,
): OSService<
	{
		name: string;
	},
	{
		name: string;
		baseline: {
			capturedAt: string;
			total: number;
			failure: number;
			errorRate: number;
		};
	}
> {
	return {
		name: "system.chaos.baseline.capture",
		requiredPermissions: ["system:write"],
		execute: async (req) => {
			const metrics = kernel.metrics.allSnapshots();
			const total = metrics.reduce((sum, item) => sum + item.total, 0);
			const failure = metrics.reduce((sum, item) => sum + item.failure, 0);
			const baseline = {
				capturedAt: new Date().toISOString(),
				total,
				failure,
				errorRate: total === 0 ? 0 : failure / total,
			};
			chaosBaselines.set(req.name, baseline);
			return {
				name: req.name,
				baseline,
			};
		},
	};
}

export function createSystemChaosBaselineVerifyService(
	kernel: LLMOSKernel,
): OSService<
	{
		name: string;
		maxErrorRateDelta?: number;
		maxFailureDelta?: number;
	},
	{
		name: string;
		passed: boolean;
		reason?: string;
		current: {
			total: number;
			failure: number;
			errorRate: number;
		};
		baseline?: {
			capturedAt: string;
			total: number;
			failure: number;
			errorRate: number;
		};
	}
> {
	return {
		name: "system.chaos.baseline.verify",
		requiredPermissions: ["system:read"],
		execute: async (req) => {
			const baseline = chaosBaselines.get(req.name);
			const metrics = kernel.metrics.allSnapshots();
			const total = metrics.reduce((sum, item) => sum + item.total, 0);
			const failure = metrics.reduce((sum, item) => sum + item.failure, 0);
			const current = {
				total,
				failure,
				errorRate: total === 0 ? 0 : failure / total,
			};
			if (!baseline) {
				return {
					name: req.name,
					passed: false,
					reason: "baseline_not_found",
					current,
				};
			}
			const maxErrorRateDelta = req.maxErrorRateDelta ?? 0.05;
			const maxFailureDelta = req.maxFailureDelta ?? 10;
			const errorRateDelta = current.errorRate - baseline.errorRate;
			const failureDelta = current.failure - baseline.failure;
			const passed = errorRateDelta <= maxErrorRateDelta && failureDelta <= maxFailureDelta;
			return {
				name: req.name,
				passed,
				reason: passed ? undefined : "baseline_regression",
				current,
				baseline,
			};
		},
	};
}

export function createSystemGovernanceStateExportService(): OSService<
	Record<string, never>,
	{ state: GovernanceStateSnapshot }
> {
	return {
		name: "system.governance.state.export",
		requiredPermissions: ["system:read"],
		execute: async () => ({
			state: exportGovernanceState(),
		}),
	};
}

export function createSystemGovernanceStateImportService(): OSService<
	{ state: GovernanceStateSnapshot },
	{ imported: true }
> {
	return {
		name: "system.governance.state.import",
		requiredPermissions: ["system:write"],
		execute: async (req) => {
			importGovernanceState(req.state);
			return { imported: true };
		},
	};
}

export function createSystemGovernanceStatePersistService(
	store: {
		set(key: string, value: unknown): void;
	},
	key = "system.governance.state",
): OSService<Record<string, never>, { persisted: true }> {
	return {
		name: "system.governance.state.persist",
		requiredPermissions: ["system:write"],
		execute: async () => {
			store.set(key, exportGovernanceState() as unknown as Record<string, unknown>);
			return { persisted: true };
		},
	};
}

export function createSystemGovernanceStateRecoverService(
	store: {
		get(key: string): unknown;
	},
	key = "system.governance.state",
): OSService<Record<string, never>, { recovered: boolean }> {
	return {
		name: "system.governance.state.recover",
		requiredPermissions: ["system:write"],
		execute: async () => {
			const raw = store.get(key);
			if (!raw || typeof raw !== "object") {
				return { recovered: false };
			}
			importGovernanceState(raw as GovernanceStateSnapshot);
			return { recovered: true };
		},
	};
}

function thisEscapeCsv(value: string): string {
	const escaped = value.replaceAll('"', '""');
	return `"${escaped}"`;
}
