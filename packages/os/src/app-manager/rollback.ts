import type { AppManifestV1 } from "./manifest.js";
import type { AppQuota } from "./quota.js";
import type { RollbackSnapshot, ExportedRollbackState, ImportRollbackStateInput, AppInstallReportState, AppInstallDeltaReport } from "./types.js";
import { normalizeManifest } from "./manifest.js";
import { OSError } from "../kernel/errors.js";

export const MAX_ROLLBACK_SNAPSHOTS_PER_APP = 20;
export const DEFAULT_ROLLBACK_TTL_MS = 24 * 60 * 60 * 1000;

export class RollbackManager {
	private readonly snapshots = new Map<string, RollbackSnapshot>();
	private readonly installReports = new Map<string, AppInstallReportState>();
	private rollbackTokenTtlMs = DEFAULT_ROLLBACK_TTL_MS;

	setInstallReport(report: AppInstallDeltaReport, lastAction: "install" | "rollback" = "install"): void {
		this.installReports.set(report.appId, {
			report: {
				appId: report.appId,
				version: report.version,
				addedPages: [...report.addedPages],
				addedPolicies: [...report.addedPolicies],
				addedObservability: [...report.addedObservability],
				rollbackToken: report.rollbackToken,
			},
			lastAction,
			updatedAt: new Date().toISOString(),
		});
	}

	getInstallReport(appId: string): AppInstallDeltaReport | undefined {
		return this.installReports.get(appId)?.report;
	}

	getInstallReportState(appId: string): AppInstallReportState | undefined {
		const state = this.installReports.get(appId);
		if (!state) return undefined;
		return {
			report: {
				...state.report,
			},
			lastAction: state.lastAction,
			updatedAt: state.updatedAt,
		};
	}

	setRollbackSnapshot(
		rollbackToken: string,
		snapshot: {
			appId: string;
			previous?: AppManifestV1;
			previousQuota?: AppQuota;
			createdAt?: string;
			expiresAt?: string;
		},
	): void {
		const createdAt = snapshot.createdAt ?? new Date().toISOString();
		const expiresAt = snapshot.expiresAt ?? new Date(Date.now() + this.rollbackTokenTtlMs).toISOString();
		this.snapshots.set(rollbackToken, {
			appId: snapshot.appId,
			previous: snapshot.previous ? cloneManifest(snapshot.previous) : undefined,
			previousQuota: snapshot.previousQuota ? { ...snapshot.previousQuota } : undefined,
			createdAt,
			expiresAt,
		});
		this.pruneRollbackSnapshots(snapshot.appId);
	}

	consumeRollbackSnapshot(
		rollbackToken: string,
		options?: { appId?: string },
	): { appId: string; previous?: AppManifestV1; previousQuota?: AppQuota } | undefined {
		const snapshot = this.snapshots.get(rollbackToken);
		if (!snapshot) return undefined;
		const expiresAt = Date.parse(snapshot.expiresAt);
		if (!Number.isNaN(expiresAt) && expiresAt <= Date.now()) {
			this.snapshots.delete(rollbackToken);
			return undefined;
		}
		if (options?.appId && snapshot.appId !== options.appId) {
			return undefined;
		}
		this.snapshots.delete(rollbackToken);
		return {
			appId: snapshot.appId,
			previous: snapshot.previous ? cloneManifest(snapshot.previous) : undefined,
			previousQuota: snapshot.previousQuota ? { ...snapshot.previousQuota } : undefined,
		};
	}

	setRollbackTokenTTL(ms: number): void {
		if (!Number.isFinite(ms) || ms <= 0) {
			throw new OSError("E_VALIDATION_FAILED", `Invalid rollback token TTL: ${ms}`);
		}
		this.rollbackTokenTtlMs = Math.floor(ms);
	}

	exportState(): ExportedRollbackState {
		return {
			snapshots: [...this.snapshots.entries()].map(([token, snapshot]) => ({
				token,
				appId: snapshot.appId,
				previous: snapshot.previous ? cloneManifest(snapshot.previous) : undefined,
				previousQuota: snapshot.previousQuota ? { ...snapshot.previousQuota } : undefined,
				createdAt: snapshot.createdAt,
				expiresAt: snapshot.expiresAt,
			})),
			installReports: [...this.installReports.values()].map((state) => ({
				report: { ...state.report },
				lastAction: state.lastAction,
				updatedAt: state.updatedAt,
			})),
		};
	}

	importState(input: ImportRollbackStateInput): void {
		if (!input || typeof input !== "object") {
			throw new OSError("E_VALIDATION_FAILED", "Invalid rollback state: object required");
		}
		if (!Array.isArray(input.snapshots)) {
			throw new OSError("E_VALIDATION_FAILED", "Invalid rollback state: snapshots must be array");
		}
		if (!Array.isArray(input.installReports)) {
			throw new OSError("E_VALIDATION_FAILED", "Invalid rollback state: installReports must be array");
		}
		const snapshots = (input.snapshots ?? []).map((snapshot) => {
			validateRollbackSnapshot(snapshot);
			return {
				token: snapshot.token,
				appId: snapshot.appId,
				previous: snapshot.previous,
				previousQuota: snapshot.previousQuota,
				createdAt: snapshot.createdAt,
				expiresAt: snapshot.expiresAt,
			};
		});
		const snapshotTokenSet = new Set<string>();
		for (const snapshot of snapshots) {
			if (snapshotTokenSet.has(snapshot.token)) {
				throw new OSError("E_VALIDATION_FAILED", `Invalid rollback state: duplicate snapshot token ${snapshot.token}`);
			}
			snapshotTokenSet.add(snapshot.token);
		}
		const reports = (input.installReports ?? []).map((state) => {
			validateInstallReportState(state);
			return {
				report: { ...state.report },
				lastAction: state.lastAction,
				updatedAt: state.updatedAt,
			};
		});
		const reportAppIdSet = new Set<string>();
		for (const state of reports) {
			if (reportAppIdSet.has(state.report.appId)) {
				throw new OSError(
					"E_VALIDATION_FAILED",
					`Invalid rollback state: duplicate install report appId ${state.report.appId}`,
				);
			}
			reportAppIdSet.add(state.report.appId);
		}

		this.snapshots.clear();
		this.installReports.clear();
		for (const snapshot of snapshots) {
			this.setRollbackSnapshot(snapshot.token, snapshot);
		}
		for (const reportState of reports) {
			this.installReports.set(reportState.report.appId, reportState);
		}
	}

	listSnapshots(appId?: string): Array<{
		token: string;
		appId: string;
		createdAt: string;
		expiresAt: string;
	}> {
		return [...this.snapshots.entries()]
			.filter(([, snapshot]) => !appId || snapshot.appId === appId)
			.map(([token, snapshot]) => ({
				token,
				appId: snapshot.appId,
				createdAt: snapshot.createdAt,
				expiresAt: snapshot.expiresAt,
			}));
	}

	garbageCollectExpired(now = Date.now()): { scanned: number; removed: number } {
		const entries = [...this.snapshots.entries()];
		let removed = 0;
		for (const [token, snapshot] of entries) {
			const expiresAt = Date.parse(snapshot.expiresAt);
			if (!Number.isNaN(expiresAt) && expiresAt <= now) {
				this.snapshots.delete(token);
				removed += 1;
			}
		}
		return {
			scanned: entries.length,
			removed,
		};
	}

	deleteInstallReport(appId: string): void {
		this.installReports.delete(appId);
	}

	deleteSnapshotsForApp(appId: string): void {
		for (const [token, snapshot] of this.snapshots.entries()) {
			if (snapshot.appId === appId) {
				this.snapshots.delete(token);
			}
		}
	}

	private pruneRollbackSnapshots(appId: string): void {
		const tokensForApp = [...this.snapshots.entries()]
			.filter(([, snapshot]) => snapshot.appId === appId)
			.map(([token]) => token);
		const overflow = tokensForApp.length - MAX_ROLLBACK_SNAPSHOTS_PER_APP;
		if (overflow <= 0) return;
		for (const token of tokensForApp.slice(0, overflow)) {
			this.snapshots.delete(token);
		}
	}
}

function cloneManifest(manifest: AppManifestV1): AppManifestV1 {
	return JSON.parse(JSON.stringify(manifest)) as AppManifestV1;
}

function validateIsoTimestamp(value: string, field: string): void {
	if (typeof value !== "string" || Number.isNaN(Date.parse(value))) {
		throw new OSError("E_VALIDATION_FAILED", `Invalid rollback state: ${field} must be ISO datetime string`);
	}
}

export function validateRollbackSnapshot(snapshot: {
	token: string;
	appId: string;
	createdAt: string;
	expiresAt: string;
	previous?: AppManifestV1;
	previousQuota?: AppQuota;
}): void {
	if (!snapshot || typeof snapshot !== "object") {
		throw new OSError("E_VALIDATION_FAILED", "Invalid rollback state: snapshot object required");
	}
	if (typeof snapshot.token !== "string" || snapshot.token.trim().length === 0) {
		throw new OSError("E_VALIDATION_FAILED", "Invalid rollback state: snapshot.token required");
	}
	if (typeof snapshot.appId !== "string" || snapshot.appId.trim().length === 0) {
		throw new OSError("E_VALIDATION_FAILED", "Invalid rollback state: snapshot.appId required");
	}
	validateIsoTimestamp(snapshot.createdAt, "snapshot.createdAt");
	validateIsoTimestamp(snapshot.expiresAt, "snapshot.expiresAt");
	if (Date.parse(snapshot.expiresAt) <= Date.parse(snapshot.createdAt)) {
		throw new OSError("E_VALIDATION_FAILED", "Invalid rollback state: snapshot.expiresAt must be after createdAt");
	}
	if (snapshot.previous) {
		normalizeManifest(snapshot.previous);
	}
	if (snapshot.previousQuota) {
		const { maxTokens, maxToolCalls } = snapshot.previousQuota;
		if (!Number.isFinite(maxTokens) || maxTokens <= 0 || !Number.isFinite(maxToolCalls) || maxToolCalls <= 0) {
			throw new OSError("E_VALIDATION_FAILED", "Invalid rollback state: snapshot.previousQuota invalid");
		}
	}
}

export function validateInstallReportState(state: AppInstallReportState): void {
	if (!state || typeof state !== "object" || !state.report) {
		throw new OSError("E_VALIDATION_FAILED", "Invalid rollback state: install report object required");
	}
	if (state.lastAction !== "install" && state.lastAction !== "rollback") {
		throw new OSError("E_VALIDATION_FAILED", "Invalid rollback state: install report lastAction invalid");
	}
	validateIsoTimestamp(state.updatedAt, "installReport.updatedAt");
	const report = state.report;
	if (typeof report.appId !== "string" || report.appId.trim().length === 0) {
		throw new OSError("E_VALIDATION_FAILED", "Invalid rollback state: report.appId required");
	}
	if (typeof report.version !== "string" || report.version.trim().length === 0) {
		throw new OSError("E_VALIDATION_FAILED", "Invalid rollback state: report.version required");
	}
	if (!Array.isArray(report.addedPages) || !Array.isArray(report.addedPolicies) || !Array.isArray(report.addedObservability)) {
		throw new OSError("E_VALIDATION_FAILED", "Invalid rollback state: report arrays required");
	}
	if (typeof report.rollbackToken !== "string" || report.rollbackToken.trim().length === 0) {
		throw new OSError("E_VALIDATION_FAILED", "Invalid rollback state: report.rollbackToken required");
	}
}
