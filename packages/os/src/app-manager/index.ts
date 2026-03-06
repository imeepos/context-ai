import { AppLifecycleManager, type AppLifecycleState } from "./lifecycle.js";
import type { AppManifest } from "./manifest.js";
import { AppPermissionStore } from "./permissions.js";
import { AppQuotaManager, type AppQuota } from "./quota.js";
import { AppRegistry } from "./registry.js";
import { OSError } from "../kernel/errors.js";
import type { OSService } from "../types/os.js";

export class AppManager {
	readonly registry = new AppRegistry();
	readonly lifecycle = new AppLifecycleManager();
	readonly permissions = new AppPermissionStore();
	readonly quota = new AppQuotaManager();
	private readonly disabledApps = new Set<string>();

	install(manifest: AppManifest, quota?: AppQuota): void {
		this.registry.install(manifest);
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
		this.permissions.grant(manifest.id, manifest.permissions);
	}

	uninstall(appId: string): void {
		this.registry.uninstall(appId);
		this.lifecycle.reset(appId);
		this.permissions.revokeAll(appId);
		this.quota.reset(appId);
		this.disabledApps.delete(appId);
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
}

export interface AppInstallRequest {
	manifest: AppManifest;
	quota?: AppQuota;
}

export interface AppUpgradeRequest {
	manifest: AppManifest;
}

export interface AppSetStateRequest {
	appId: string;
	state: AppLifecycleState;
}

export interface AppManageRequest {
	appId: string;
}

export interface AppListRequest {
	readonly _: "list";
}

export interface AppServiceHooks {
	onInstall?: (manifest: AppManifest) => void;
	onUninstall?: (appId: string) => void;
	onUpgrade?: (manifest: AppManifest) => void;
}

export function createAppInstallService(
	manager: AppManager,
	hooks?: AppServiceHooks,
): OSService<AppInstallRequest, { ok: true }> {
	return {
		name: "app.install",
		requiredPermissions: ["app:manage"],
		execute: async (req) => {
			manager.install(req.manifest, req.quota);
			hooks?.onInstall?.(req.manifest);
			return { ok: true };
		},
	};
}

export function createAppUpgradeService(
	manager: AppManager,
	hooks?: AppServiceHooks,
): OSService<AppUpgradeRequest, { ok: true }> {
	return {
		name: "app.upgrade",
		requiredPermissions: ["app:manage"],
		execute: async (req) => {
			manager.upgrade(req.manifest);
			hooks?.onUpgrade?.(req.manifest);
			return { ok: true };
		},
	};
}

export function createAppSetStateService(manager: AppManager): OSService<AppSetStateRequest, { state: AppLifecycleState }> {
	return {
		name: "app.state.set",
		requiredPermissions: ["app:manage"],
		execute: async (req) => ({
			state: manager.setState(req.appId, req.state),
		}),
	};
}

export function createAppListService(manager: AppManager): OSService<AppListRequest, { apps: AppManifest[] }> {
	return {
		name: "app.list",
		requiredPermissions: ["app:read"],
		execute: async () => ({
			apps: manager.registry.list(),
		}),
	};
}

export function createAppUninstallService(
	manager: AppManager,
	hooks?: AppServiceHooks,
): OSService<AppManageRequest, { ok: true }> {
	return {
		name: "app.uninstall",
		requiredPermissions: ["app:manage"],
		execute: async (req) => {
			manager.uninstall(req.appId);
			hooks?.onUninstall?.(req.appId);
			return { ok: true };
		},
	};
}

export function createAppDisableService(manager: AppManager): OSService<AppManageRequest, { ok: true }> {
	return {
		name: "app.disable",
		requiredPermissions: ["app:manage"],
		execute: async (req) => {
			manager.disable(req.appId);
			return { ok: true };
		},
	};
}

export function createAppEnableService(manager: AppManager): OSService<AppManageRequest, { ok: true }> {
	return {
		name: "app.enable",
		requiredPermissions: ["app:manage"],
		execute: async (req) => {
			manager.enable(req.appId);
			return { ok: true };
		},
	};
}

export type { AppManifest } from "./manifest.js";
export type { AppLifecycleState } from "./lifecycle.js";
export type { AppQuota } from "./quota.js";
