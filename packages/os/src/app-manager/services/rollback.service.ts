import type { OSService } from "../../types/os.js";
import { createOSServiceClass } from "../../os-service-class.js";
import { APP_INSTALL_ROLLBACK } from "../../tokens.js";
import type {
	AppInstallRollbackRequest,
	AppServiceHooks,
	AppInstallDeltaReport,
} from "../types.js";
import type { AppManager } from "../manager.js";
import { OSError } from "../../kernel/errors.js";

export async function executeAppInstallRollback(
	manager: AppManager,
	hooks: AppServiceHooks | undefined,
	req: AppInstallRollbackRequest,
): Promise<{ ok: true; restoredVersion?: string; uninstalled: boolean }> {
	const snapshot = manager.consumeRollbackSnapshot(req.rollbackToken, { appId: req.appId });
	if (!snapshot) {
		throw new OSError("E_VALIDATION_FAILED", `Invalid rollback token: ${req.rollbackToken}`);
	}
	if (snapshot.previous) {
		manager.install(snapshot.previous);
		manager.quota.reset(req.appId);
		if (snapshot.previousQuota) {
			manager.quota.setQuota(req.appId, snapshot.previousQuota);
		}
		const report: AppInstallDeltaReport = {
			appId: snapshot.previous.id,
			version: snapshot.previous.version,
			addedPages: snapshot.previous.entry.pages.map((page) => page.route),
			addedPolicies: [...snapshot.previous.permissions],
			addedObservability: [
				`audit:${snapshot.previous.id}`,
				`metrics:${snapshot.previous.id}`,
				`events:${snapshot.previous.id}`,
			],
			rollbackToken: req.rollbackToken,
		};
		manager.setInstallReport(report, "rollback");
		hooks?.onInstall?.(snapshot.previous);
		hooks?.onRollback?.({
			appId: req.appId,
			rollbackToken: req.rollbackToken,
			restoredVersion: snapshot.previous.version,
			uninstalled: false,
		});
		return {
			ok: true,
			restoredVersion: snapshot.previous.version,
			uninstalled: false,
		};
	}
	manager.uninstall(req.appId);
	hooks?.onUninstall?.(req.appId);
	hooks?.onRollback?.({
		appId: req.appId,
		rollbackToken: req.rollbackToken,
		uninstalled: true,
	});
	return {
		ok: true,
		uninstalled: true,
	};
}

export const AppInstallRollbackOSService = createOSServiceClass(APP_INSTALL_ROLLBACK, {
	requiredPermissions: ["app:manage"],
	execute: ([manager, hooks]: [AppManager, AppServiceHooks | undefined], req) =>
		executeAppInstallRollback(manager, hooks, req),
});

export function createAppInstallRollbackService(
	manager: AppManager,
	hooks?: AppServiceHooks,
): OSService<AppInstallRollbackRequest, { ok: true; restoredVersion?: string; uninstalled: boolean }> {
	return new AppInstallRollbackOSService(manager, hooks);
}
