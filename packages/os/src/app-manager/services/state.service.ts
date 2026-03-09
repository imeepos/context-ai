import type { OSService } from "../../types/os.js";
import { createOSServiceClass } from "../../os-service-class.js";
import { APP_STATE_SET, APP_DISABLE, APP_ENABLE } from "../../tokens.js";
import type { AppSetStateRequest, AppManageRequest } from "../types.js";
import type { AppLifecycleState } from "../lifecycle.js";
import type { AppManager } from "../manager.js";

export const AppSetStateOSService = createOSServiceClass(APP_STATE_SET, {
	requiredPermissions: ["app:manage"],
	execute: ([manager]: [AppManager], req) => ({
		state: manager.setState(req.appId, req.state),
	}),
});

export function createAppSetStateService(manager: AppManager): OSService<AppSetStateRequest, { state: AppLifecycleState }> {
	return new AppSetStateOSService(manager);
}

export const AppDisableOSService = createOSServiceClass(APP_DISABLE, {
	requiredPermissions: ["app:manage"],
	execute: ([manager]: [AppManager], req) => {
		manager.disable(req.appId);
		return { ok: true as const };
	},
});

export function createAppDisableService(manager: AppManager): OSService<AppManageRequest, { ok: true }> {
	return new AppDisableOSService(manager);
}

export const AppEnableOSService = createOSServiceClass(APP_ENABLE, {
	requiredPermissions: ["app:manage"],
	execute: ([manager]: [AppManager], req) => {
		manager.enable(req.appId);
		return { ok: true as const };
	},
});

export function createAppEnableService(manager: AppManager): OSService<AppManageRequest, { ok: true }> {
	return new AppEnableOSService(manager);
}
