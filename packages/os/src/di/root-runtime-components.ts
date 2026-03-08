import type {
	AppPageRenderer,
	AppPageSystemRuntime,
	AppServiceHooks,
} from "../app-manager/index.js";
import type { AppManifestV1 } from "../app-manager/manifest.js";
import type { AppRuntimeRegistry } from "./app-runtime-registry.js";
import { createAppServiceHooks } from "./app-service-hooks.js";
import { createAppPageRenderer, createAppPageSystemRuntime } from "./page-runtime.js";
import { createDefaultSystemTaskManifest, registerDefaultModels } from "./runtime-defaults.js";
import { OS_SERVICE_CATALOG_DEFINITIONS } from "./service-definitions.js";
import { createServiceTokens, type ServiceTokensOfDefinitions } from "./service-tokens.js";
import type { OSRootServices } from "./root-services.js";

export type OSRuntimeServiceTokens = ServiceTokensOfDefinitions<typeof OS_SERVICE_CATALOG_DEFINITIONS>;

export interface OSRootRuntimeComponents {
	appPageSystemRuntime: AppPageSystemRuntime;
	appPageRenderer: AppPageRenderer;
	appServiceHooks: AppServiceHooks;
	rollbackHooks: AppServiceHooks;
	systemTaskManifest: AppManifestV1;
	serviceTokens: OSRuntimeServiceTokens;
}

export interface CreateOSRootRuntimeComponentsInput {
	services: OSRootServices;
	getAppRuntimeRegistry: () => AppRuntimeRegistry | undefined;
}

export function createOSRootRuntimeComponents(
	input: CreateOSRootRuntimeComponentsInput,
): OSRootRuntimeComponents {
	const { services } = input;
	const appPageSystemRuntime = createAppPageSystemRuntime(services.kernel);
	const appPageRenderer = createAppPageRenderer({
		appManager: services.appManager,
		getAppRuntimeRegistry: input.getAppRuntimeRegistry,
	});

	registerDefaultModels(services.modelService);

	const systemTaskManifest = createDefaultSystemTaskManifest();
	const { appServiceHooks, rollbackHooks } = createAppServiceHooks({
		appManager: services.appManager,
		kernel: services.kernel,
		notificationService: services.notificationService,
		getAppRuntimeRegistry: input.getAppRuntimeRegistry,
	});

	const serviceTokens = createServiceTokens(OS_SERVICE_CATALOG_DEFINITIONS) as OSRuntimeServiceTokens;

	return {
		appPageSystemRuntime,
		appPageRenderer,
		appServiceHooks,
		rollbackHooks,
		systemTaskManifest,
		serviceTokens,
	};
}
