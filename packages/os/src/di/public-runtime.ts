import type { OSRootServices } from "./root-services.js";
import type { OSRootRuntime } from "./root-runtime.js";
import { PUBLIC_OS_RUNTIME_BINDINGS } from "./runtime-bindings.js";

export type PublicOSRuntimeKey = (typeof PUBLIC_OS_RUNTIME_BINDINGS)[number]["key"];
export const PUBLIC_OS_RUNTIME_KEYS = PUBLIC_OS_RUNTIME_BINDINGS.map((binding) => binding.key) as ReadonlyArray<
	PublicOSRuntimeKey
>;
export type PublicOSRuntime = Pick<OSRootServices, PublicOSRuntimeKey>;

export function createPublicOSRuntimeView(runtime: OSRootRuntime): PublicOSRuntime {
	return Object.fromEntries(
		PUBLIC_OS_RUNTIME_BINDINGS.map((binding) => [binding.key, binding.select(runtime)]),
	) as PublicOSRuntime;
}
