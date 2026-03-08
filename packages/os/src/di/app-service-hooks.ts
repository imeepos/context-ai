import type { AppManager, AppServiceHooks } from "../app-manager/index.js";
import type { LLMOSKernel } from "../kernel/index.js";
import type { NotificationService } from "../notification-service/index.js";
import type { AppRuntimeRegistry } from "./app-runtime-registry.js";

export interface CreateAppServiceHooksInput {
	appManager: AppManager;
	kernel: LLMOSKernel;
	notificationService: NotificationService;
	getAppRuntimeRegistry: () => AppRuntimeRegistry | undefined;
}

export interface AppServiceHooksBundle {
	appServiceHooks: AppServiceHooks;
	rollbackHooks: AppServiceHooks;
}

export function createAppServiceHooks(input: CreateAppServiceHooksInput): AppServiceHooksBundle {
	const appServiceHooks: AppServiceHooks = {
		onInstall: (manifest) => {
			input.kernel.capabilities.set(manifest.id, manifest.permissions);
			input.getAppRuntimeRegistry()?.create(input.appManager.registry.get(manifest.id));
		},
		onUninstall: (appId) => {
			input.kernel.capabilities.remove(appId);
			input.getAppRuntimeRegistry()?.destroy(appId);
		},
		onUpgrade: (manifest) => {
			input.kernel.capabilities.set(manifest.id, manifest.permissions);
			input.getAppRuntimeRegistry()?.create(input.appManager.registry.get(manifest.id));
		},
	};

	const rollbackHooks: AppServiceHooks = {
		...appServiceHooks,
		onRollback: (inputRollback) => {
			input.kernel.events.publish("system.app.rollback", inputRollback);
			input.notificationService.send({
				topic: "system.app.rollback",
				severity: "warning",
				message: inputRollback.uninstalled
					? `app rollback removed ${inputRollback.appId} token=${inputRollback.rollbackToken}`
					: `app rollback restored ${inputRollback.appId}@${inputRollback.restoredVersion} token=${inputRollback.rollbackToken}`,
			});
		},
	};

	return {
		appServiceHooks,
		rollbackHooks,
	};
}
