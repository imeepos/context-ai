import type { AppManager, LLMOSKernel } from "../types.js";
import type { OSService } from "../../types/os.js";
import type { AppManifestV1 } from "../../app-manager/manifest.js";
import * as TOKENS from "../../tokens.js";
import { createHash } from "node:crypto";

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
		name: TOKENS.SYSTEM_APP_INSTALL_REPORT,
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

export function createSystemAppDeltaService(
	appManager: AppManager,
): OSService<SystemAppDeltaRequest, SystemAppDeltaResponse> {
	return {
		name: TOKENS.SYSTEM_APP_DELTA,
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

export function createSystemAppRollbackStateExportService(
	appManager: AppManager,
): OSService<{ includeSensitive?: boolean }, { state: SystemAppRollbackState }> {
	return {
		name: TOKENS.SYSTEM_APP_ROLLBACK_STATE_EXPORT,
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
		name: TOKENS.SYSTEM_APP_ROLLBACK_AUDIT,
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

function fingerprintState(value: unknown): { stateHash: string; stateSizeBytes: number } {
	const json = JSON.stringify(value);
	return {
		stateHash: createHash("sha256").update(json, "utf8").digest("hex"),
		stateSizeBytes: Buffer.byteLength(json, "utf8"),
	};
}

export function createSystemAppRollbackStateImportService(
	appManager: AppManager,
): OSService<
	{ state: ReturnType<AppManager["exportRollbackState"]> },
	{
		imported: true;
		snapshots: number;
		installReports: number;
		stateHash: string;
		stateSizeBytes: number;
	}
> {
	return {
		name: TOKENS.SYSTEM_APP_ROLLBACK_STATE_IMPORT,
		requiredPermissions: ["system:write"],
		execute: async (req) => {
			appManager.importRollbackState(req.state);
			const fp = fingerprintState(req.state);
			return {
				imported: true,
				snapshots: req.state.snapshots.length,
				installReports: req.state.installReports.length,
				stateHash: fp.stateHash,
				stateSizeBytes: fp.stateSizeBytes,
			};
		},
	};
}

export function createSystemAppRollbackStatePersistService(
	appManager: AppManager,
	store: { set(key: string, value: unknown): void },
	key = "system.app.rollback.state",
): OSService<Record<string, never>, { persisted: true }> {
	return {
		name: TOKENS.SYSTEM_APP_ROLLBACK_STATE_PERSIST,
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
): OSService<
	Record<string, never>,
	{
		recovered: boolean;
		reason?: string;
		errorCode?: string;
		snapshots: number;
		installReports: number;
		stateHash?: string;
		stateSizeBytes: number;
	}
> {
	return {
		name: TOKENS.SYSTEM_APP_ROLLBACK_STATE_RECOVER,
		requiredPermissions: ["system:write"],
		execute: async () => {
			const raw = store.get(key);
			if (!raw || typeof raw !== "object") {
				return {
					recovered: false,
					reason: "empty_state",
					snapshots: 0,
					installReports: 0,
					stateSizeBytes: 0,
				};
			}
			const fp = fingerprintState(raw);
			try {
				appManager.importRollbackState(raw as ReturnType<AppManager["exportRollbackState"]>);
				const state = raw as ReturnType<AppManager["exportRollbackState"]>;
				return {
					recovered: true,
					snapshots: state.snapshots.length,
					installReports: state.installReports.length,
					stateHash: fp.stateHash,
					stateSizeBytes: fp.stateSizeBytes,
				};
			} catch (error) {
				if (error instanceof Error && "code" in error) {
					return {
						recovered: false,
						reason: "invalid_state",
						errorCode: (error as { code: string }).code,
						snapshots: 0,
						installReports: 0,
						stateHash: fp.stateHash,
						stateSizeBytes: fp.stateSizeBytes,
					};
				}
				throw error;
			}
		},
	};
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

export function createSystemAppRollbackStatsService(
	appManager: AppManager,
): OSService<SystemAppRollbackStatsRequest, SystemAppRollbackStatsResponse> {
	return {
		name: TOKENS.SYSTEM_APP_ROLLBACK_STATS,
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
		name: TOKENS.SYSTEM_APP_ROLLBACK_GC,
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
