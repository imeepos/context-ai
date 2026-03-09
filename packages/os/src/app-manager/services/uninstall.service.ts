import type { OSService } from "../../types/os.js";
import { createOSServiceClass } from "../../os-service-class.js";
import { APP_UNINSTALL } from "../../tokens.js";
import type { AppManageRequest, AppServiceHooks } from "../types.js";
import type { AppManager } from "../manager.js";

export function executeAppUninstall(
	manager: AppManager,
	hooks: AppServiceHooks | undefined,
	req: AppManageRequest,
): { ok: true } {
	manager.uninstall(req.appId);
	hooks?.onUninstall?.(req.appId);
	return { ok: true };
}

export const AppUninstallOSService = createOSServiceClass(APP_UNINSTALL, {
	requiredPermissions: ["app:manage"],
	execute: ([manager, hooks]: [AppManager, AppServiceHooks | undefined], req) =>
		executeAppUninstall(manager, hooks, req),
});

export function createAppUninstallService(
	manager: AppManager,
	hooks?: AppServiceHooks,
): OSService<AppManageRequest, { ok: true }> {
	return new AppUninstallOSService(manager, hooks);
}
