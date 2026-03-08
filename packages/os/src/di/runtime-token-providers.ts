import type { OSRootRuntime } from "./root-runtime.js";
import { createValueProviders, type ValueBinding } from "./provider-builders.js";
import { OS_RUNTIME_TOKEN_BINDINGS } from "./runtime-bindings.js";

export function createOSRuntimeValueBindings(runtime: OSRootRuntime): ValueBinding[] {
	return OS_RUNTIME_TOKEN_BINDINGS.map(({ provide, select }) => ({
		provide,
		useValue: select(runtime),
	}));
}

export function createOSRuntimeValueProviders(runtime: OSRootRuntime) {
	return createValueProviders(createOSRuntimeValueBindings(runtime));
}
