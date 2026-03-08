import { Injector, type Provider } from "@context-ai/core";
import type { CreateDefaultLLMOSOptions } from "../llm-os.types.js";
import {
	OS_APP_RUNTIME_REGISTRY,
	OS_OPTIONS,
	OS_ROOT_RUNTIME,
	OS_INJECTOR,
} from "./tokens.js";
import { AppRuntimeRegistry } from "./app-runtime-registry.js";
import { createValueProviders } from "./provider-builders.js";
import type { OSRootRuntime } from "./root-runtime.js";
import { createOSRuntimeValueBindings } from "./runtime-token-providers.js";
import { createOSServiceFactoryProviders } from "./service-factory-providers.js";

export interface CreateOSBaseProvidersInput {
	options: CreateDefaultLLMOSOptions;
	runtime: OSRootRuntime;
}

export function createOSBaseProviders(input: CreateOSBaseProvidersInput): Provider[] {
	return [
		...createValueProviders([
			{ provide: OS_OPTIONS, useValue: input.options },
			{ provide: OS_ROOT_RUNTIME, useValue: input.runtime },
			...createOSRuntimeValueBindings(input.runtime),
		]),
		{ provide: OS_INJECTOR, useExisting: Injector },
		{
			provide: OS_APP_RUNTIME_REGISTRY,
			useFactory: (injector: Injector) => new AppRuntimeRegistry(injector),
			deps: [Injector],
		},
		...createOSServiceFactoryProviders(),
	];
}
