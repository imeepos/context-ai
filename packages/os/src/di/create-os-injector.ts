import { createInjector, type Injector } from "@context-ai/core";
import type { CreateDefaultLLMOSOptions } from "../llm-os.types.js";
import { createOSBaseProviders } from "./providers.js";
import { createOSRootRuntime } from "./root-runtime.js";
import { OS_APP_RUNTIME_REGISTRY, OS_SERVICE_FACTORIES } from "./tokens.js";

export function createOSInjector(options: CreateDefaultLLMOSOptions = {}): Injector {
	const runtime = createOSRootRuntime(options);
	const baseProviders = createOSBaseProviders({
		options,
		runtime,
	});
	const osInjector = createInjector(baseProviders);
	const appRuntimeRegistry = osInjector.get(OS_APP_RUNTIME_REGISTRY);
	const serviceFactories = osInjector.get(OS_SERVICE_FACTORIES);
	runtime.bootstrap(appRuntimeRegistry, serviceFactories);
	return osInjector;
}
