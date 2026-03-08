import type { Injector } from "@context-ai/core";
import { createOSInjector } from "./di/create-os-injector.js";
import { createPublicOSRuntimeView } from "./di/public-runtime.js";
import type { OSRootRuntime } from "./di/root-runtime.js";
import { OS_ROOT_RUNTIME } from "./di/tokens.js";
import type { CreateDefaultLLMOSOptions, DefaultLLMOS } from "./llm-os.types.js";

export type { CreateDefaultLLMOSOptions, DefaultLLMOS } from "./llm-os.types.js";
export { createOSInjector } from "./di/create-os-injector.js";

function createFacade(
	injector: Injector,
): DefaultLLMOS<OSRootRuntime["serviceTokens"]> {
	const runtime = injector.get(OS_ROOT_RUNTIME);
	return {
		injector,
		...createPublicOSRuntimeView(runtime),
		serviceTokens: runtime.serviceTokens,
	};
}

export function createDefaultLLMOS(
	options: CreateDefaultLLMOSOptions = {},
): DefaultLLMOS<OSRootRuntime["serviceTokens"]> {
	return createFacade(createOSInjector(options));
}

export const osInjector = createOSInjector();

export type DefaultServiceTokens = ReturnType<typeof createDefaultLLMOS>["serviceTokens"];
