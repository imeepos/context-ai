import type { AppManager } from "../app-manager/index.js";
import type { AppManifestV1 } from "../app-manager/manifest.js";
import type { LLMOSKernel } from "../kernel/index.js";
import type { NotificationService } from "../notification-service/index.js";
import type { AppRuntimeRegistry } from "./app-runtime-registry.js";
import { registerDefaultRuntimeObservers } from "./runtime-observers.js";
import type { OSServiceFactories } from "./tokens/shared.js";

export type RuntimeServiceFactories = OSServiceFactories;

export interface RegisterEnabledServicesInput<Catalog extends RuntimeServiceFactories> {
	kernel: LLMOSKernel;
	serviceFactories: Catalog;
	enabledServices?: Partial<Record<string, boolean>>;
}

export function registerEnabledServices<Catalog extends RuntimeServiceFactories>(
	input: RegisterEnabledServicesInput<Catalog>,
): void {
	for (const serviceName of Object.keys(input.serviceFactories) as Array<keyof Catalog>) {
		if (input.enabledServices?.[serviceName as string] === false) {
			continue;
		}
		const service = (input.serviceFactories[serviceName] as Catalog[keyof Catalog])();
		input.kernel.registerService(service);
	}
}

export interface InstallSystemTaskAppInput {
	appManager: AppManager;
	appRuntimeRegistry: AppRuntimeRegistry;
	kernel: LLMOSKernel;
	systemTaskManifest: AppManifestV1;
}

export function installSystemTaskApp(input: InstallSystemTaskAppInput): void {
	input.appManager.install(input.systemTaskManifest);
	input.appRuntimeRegistry.create(input.appManager.registry.get(input.systemTaskManifest.id));
	input.kernel.capabilities.set(input.systemTaskManifest.id, input.systemTaskManifest.permissions);
}

export interface BootstrapOSRuntimeInput<Catalog extends RuntimeServiceFactories> {
	appManager: AppManager;
	appRuntimeRegistry: AppRuntimeRegistry;
	kernel: LLMOSKernel;
	notificationService: NotificationService;
	systemTaskManifest: AppManifestV1;
	serviceFactories: Catalog;
	enabledServices?: Partial<Record<string, boolean>>;
}

export function bootstrapOSRuntime<Catalog extends RuntimeServiceFactories>(
	input: BootstrapOSRuntimeInput<Catalog>,
): void {
	registerEnabledServices({
		kernel: input.kernel,
		serviceFactories: input.serviceFactories,
		enabledServices: input.enabledServices,
	});
	registerDefaultRuntimeObservers({
		kernel: input.kernel,
		notificationService: input.notificationService,
	});
	installSystemTaskApp({
		appManager: input.appManager,
		appRuntimeRegistry: input.appRuntimeRegistry,
		kernel: input.kernel,
		systemTaskManifest: input.systemTaskManifest,
	});
}
