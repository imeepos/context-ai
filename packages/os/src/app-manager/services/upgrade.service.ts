import type { OSService } from "../../types/os.js";
import { createOSServiceClass } from "../../os-service-class.js";
import { APP_UPGRADE } from "../../tokens.js";
import type { AppUpgradeRequest, AppServiceHooks } from "../types.js";
import type { AppManager } from "../manager.js";

export function executeAppUpgrade(
	manager: AppManager,
	hooks: AppServiceHooks | undefined,
	req: AppUpgradeRequest,
): { ok: true } {
	manager.upgrade(req.manifest);
	hooks?.onUpgrade?.(req.manifest);
	return { ok: true };
}

export const AppUpgradeOSService = createOSServiceClass(APP_UPGRADE, {
	requiredPermissions: ["app:manage"],
	execute: ([manager, hooks]: [AppManager, AppServiceHooks | undefined], req) =>
		executeAppUpgrade(manager, hooks, req),
});

export function createAppUpgradeService(
	manager: AppManager,
	hooks?: AppServiceHooks,
): OSService<AppUpgradeRequest, { ok: true }> {
	return new AppUpgradeOSService(manager, hooks);
}
