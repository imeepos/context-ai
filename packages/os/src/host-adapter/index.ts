import { OSError } from "../kernel/errors.js";
import { createOSServiceClass } from "../os-service-class.js";
import { HOST_EXECUTE } from "../tokens.js";
import type { OSService } from "../types/os.js";

export interface HostAdapterRequest {
	adapter: string;
	action: string;
	payload?: unknown;
}

export interface HostAdapter {
	name: string;
	handle(action: string, payload?: unknown): Promise<unknown>;
}

export class HostAdapterRegistry {
	private readonly adapters = new Map<string, HostAdapter>();

	register(adapter: HostAdapter): void {
		this.adapters.set(adapter.name, adapter);
	}

	async execute(request: HostAdapterRequest): Promise<unknown> {
		const adapter = this.adapters.get(request.adapter);
		if (!adapter) throw new OSError("E_SERVICE_NOT_FOUND", `Host adapter not found: ${request.adapter}`);
		return adapter.handle(request.action, request.payload);
	}
}

export const HostAdapterExecuteOSService = createOSServiceClass(HOST_EXECUTE, {
	requiredPermissions: ["host:invoke"],
	execute: async ([registry]: [HostAdapterRegistry], req) => ({ result: await registry.execute(req) }),
});

export function createHostAdapterExecuteService(registry: HostAdapterRegistry): OSService<HostAdapterRequest, { result: unknown }> {
	return new HostAdapterExecuteOSService(registry);
}
