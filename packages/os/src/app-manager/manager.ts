import { AppLifecycleManager, type AppLifecycleState } from "./lifecycle.js";
import type { AppManifest, AppManifestV1 } from "./manifest.js";
import { normalizeManifest } from "./manifest.js";
import { AppPermissionStore } from "./permissions.js";
import type { AppQuota } from "./quota.js";
import { AppQuotaManager } from "./quota.js";
import { AppRegistry } from "./registry.js";
import { AppRouteRegistry } from "./route-registry.js";
import { OSError } from "../kernel/errors.js";
import type { AppInstallDeltaReport, AppInstallReportState } from "./types.js";
import { RollbackManager } from "./rollback.js";

export class AppManager {
	readonly registry = new AppRegistry();
	readonly lifecycle = new AppLifecycleManager();
	readonly permissions = new AppPermissionStore();
	readonly quota = new AppQuotaManager();
	readonly routes = new AppRouteRegistry();
	readonly rollback = new RollbackManager();
	private readonly disabledApps = new Set<string>();

	install(manifest: AppManifest, quota?: AppQuota): void {
		const normalized = normalizeManifest(manifest);
		const alreadyInstalled = this.registry.has(normalized.id);
		this.registry.install(manifest);
		if (alreadyInstalled) {
			this.routes.unregisterApp(normalized.id);
		}
		this.routes.register(normalized);
		this.permissions.grant(manifest.id, manifest.permissions);
		if (quota) {
			this.quota.setQuota(manifest.id, quota);
		}
	}

	upgrade(manifest: AppManifest): void {
		if (!this.registry.has(manifest.id)) {
			throw new OSError("E_APP_NOT_REGISTERED", `App not found: ${manifest.id}`);
		}
		this.registry.install(manifest);
		const normalized = normalizeManifest(manifest);
		this.routes.unregisterApp(manifest.id);
		this.routes.register(normalized);
		this.permissions.grant(manifest.id, manifest.permissions);
	}

	uninstall(appId: string): void {
		this.registry.uninstall(appId);
		this.routes.unregisterApp(appId);
		this.lifecycle.reset(appId);
		this.permissions.revokeAll(appId);
		this.quota.reset(appId);
		this.disabledApps.delete(appId);
		this.rollback.deleteInstallReport(appId);
		this.rollback.deleteSnapshotsForApp(appId);
	}

	setState(appId: string, state: AppLifecycleState): AppLifecycleState {
		return this.lifecycle.transition(appId, state);
	}

	disable(appId: string): void {
		if (!this.registry.has(appId)) throw new OSError("E_APP_NOT_REGISTERED", `App not found: ${appId}`);
		this.disabledApps.add(appId);
	}

	enable(appId: string): void {
		if (!this.registry.has(appId)) throw new OSError("E_APP_NOT_REGISTERED", `App not found: ${appId}`);
		this.disabledApps.delete(appId);
	}

	isEnabled(appId: string): boolean {
		return this.registry.has(appId) && !this.disabledApps.has(appId);
	}

	// Delegate to RollbackManager
	setInstallReport(report: AppInstallDeltaReport, lastAction: "install" | "rollback" = "install"): void {
		this.rollback.setInstallReport(report, lastAction);
	}

	getInstallReport(appId: string): AppInstallDeltaReport | undefined {
		return this.rollback.getInstallReport(appId);
	}

	getInstallReportState(appId: string): AppInstallReportState | undefined {
		return this.rollback.getInstallReportState(appId);
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
		this.rollback.setRollbackSnapshot(rollbackToken, snapshot);
	}

	consumeRollbackSnapshot(
		rollbackToken: string,
		options?: { appId?: string },
	): { appId: string; previous?: AppManifestV1; previousQuota?: AppQuota } | undefined {
		return this.rollback.consumeRollbackSnapshot(rollbackToken, options);
	}

	setRollbackTokenTTL(ms: number): void {
		this.rollback.setRollbackTokenTTL(ms);
	}

	exportRollbackState(): {
		snapshots: Array<{
			token: string;
			appId: string;
			previous?: AppManifestV1;
			previousQuota?: AppQuota;
			createdAt: string;
			expiresAt: string;
		}>;
		installReports: AppInstallReportState[];
	} {
		return this.rollback.exportState();
	}

	importRollbackState(input: {
		snapshots: Array<{
			token: string;
			appId: string;
			previous?: AppManifestV1;
			previousQuota?: AppQuota;
			createdAt: string;
			expiresAt: string;
		}>;
		installReports: AppInstallReportState[];
	}): void {
		this.rollback.importState(input);
	}

	listRollbackSnapshots(appId?: string): Array<{
		token: string;
		appId: string;
		createdAt: string;
		expiresAt: string;
	}> {
		return this.rollback.listSnapshots(appId);
	}

	garbageCollectExpiredRollbackSnapshots(now = Date.now()): { scanned: number; removed: number } {
		return this.rollback.garbageCollectExpired(now);
	}
}
