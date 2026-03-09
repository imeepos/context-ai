import type { OSService } from "../../types/os.js";
import { createOSServiceClass } from "../../os-service-class.js";
import { APP_LIST } from "../../tokens.js";
import type { AppListRequest } from "../types.js";
import type { AppManifest } from "../manifest.js";
import type { AppManager } from "../manager.js";

export const AppListOSService = createOSServiceClass(APP_LIST, {
	requiredPermissions: ["app:read"],
	execute: ([manager]: [AppManager]) => ({
		apps: manager.registry.list(),
	}),
});

export function createAppListService(manager: AppManager): OSService<AppListRequest, { apps: AppManifest[] }> {
	return new AppListOSService(manager);
}
