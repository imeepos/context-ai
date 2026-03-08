import type { CreateDefaultLLMOSOptions } from "../llm-os.types.js";
import type { AppRuntimeRegistry } from "./app-runtime-registry.js";
import { bootstrapOSRuntime } from "./bootstrap-runtime.js";
import type { OSRootRuntimeComponents } from "./root-runtime-components.js";
import type { OSRootServices } from "./root-services.js";
import type { OSServiceFactories } from "./tokens/shared.js";

export interface RuntimeBootstrapController {
	bootstrap(appRuntimeRegistry: AppRuntimeRegistry, serviceFactories: OSServiceFactories): void;
}

export interface CreateRuntimeBootstrapControllerInput {
	options: CreateDefaultLLMOSOptions;
	services: OSRootServices;
	components: Pick<OSRootRuntimeComponents, "systemTaskManifest">;
	setAppRuntimeRegistry: (appRuntimeRegistry: AppRuntimeRegistry) => void;
}

export function createRuntimeBootstrapController(
	input: CreateRuntimeBootstrapControllerInput,
): RuntimeBootstrapController {
	let bootstrapped = false;

	return {
		bootstrap(appRuntimeRegistry: AppRuntimeRegistry, serviceFactories: OSServiceFactories): void {
			if (bootstrapped) {
				return;
			}
			bootstrapped = true;
			input.setAppRuntimeRegistry(appRuntimeRegistry);
			bootstrapOSRuntime({
				appManager: input.services.appManager,
				appRuntimeRegistry,
				kernel: input.services.kernel,
				notificationService: input.services.notificationService,
				systemTaskManifest: input.components.systemTaskManifest,
				serviceFactories,
				enabledServices: input.options.enabledServices,
			});
		},
	};
}
