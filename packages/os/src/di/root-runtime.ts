import {
	type AppPageRenderer,
	type AppPageSystemRuntime,
	type AppServiceHooks,
} from "../app-manager/index.js";
import type { AppManifestV1 } from "../app-manager/manifest.js";
import type { CreateDefaultLLMOSOptions } from "../llm-os.types.js";
import type { AppRuntimeRegistry } from "./app-runtime-registry.js";
import { createOSRootServices, type OSRootServices } from "./root-services.js";
import type { OSServiceFactories } from "./tokens/shared.js";
import {
	createOSRootRuntimeComponents,
	type OSRuntimeServiceTokens,
} from "./root-runtime-components.js";
import { createRuntimeBootstrapController } from "./runtime-bootstrap-controller.js";

export interface OSRootRuntime extends OSRootServices {
	appPageSystemRuntime: AppPageSystemRuntime;
	appPageRenderer: AppPageRenderer;
	appServiceHooks: AppServiceHooks;
	rollbackHooks: AppServiceHooks;
	systemTaskManifest: AppManifestV1;
	serviceTokens: OSRuntimeServiceTokens;
	bootstrap(appRuntimeRegistry: AppRuntimeRegistry, serviceFactories: OSServiceFactories): void;
}

export function createOSRootRuntime(options: CreateDefaultLLMOSOptions = {}): OSRootRuntime {
	const services = createOSRootServices(options);

	let currentAppRuntimeRegistry: AppRuntimeRegistry | undefined;
	const components = createOSRootRuntimeComponents({
		services,
		getAppRuntimeRegistry: () => currentAppRuntimeRegistry,
	});
	const bootstrapController = createRuntimeBootstrapController({
		options,
		services,
		components,
		setAppRuntimeRegistry: (appRuntimeRegistry) => {
			currentAppRuntimeRegistry = appRuntimeRegistry;
		},
	});

	return {
		...services,
		appPageSystemRuntime: components.appPageSystemRuntime,
		appPageRenderer: components.appPageRenderer,
		appServiceHooks: components.appServiceHooks,
		rollbackHooks: components.rollbackHooks,
		systemTaskManifest: components.systemTaskManifest,
		serviceTokens: components.serviceTokens,
		bootstrap: bootstrapController.bootstrap,
	};
}
