import type { NetService } from "../types.js";
import type { OSService } from "../../types/os.js";
import * as TOKENS from "../../tokens.js";

export interface SystemNetCircuitResponse {
	circuits: ReturnType<NetService["getCircuitSnapshot"]>;
}

export function createSystemNetCircuitService(
	netService: NetService,
): OSService<Record<string, never>, SystemNetCircuitResponse> {
	return {
		name: TOKENS.SYSTEM_NET_CIRCUIT,
		requiredPermissions: ["system:read"],
		execute: async () => ({
			circuits: netService.getCircuitSnapshot(),
		}),
	};
}

export interface SystemNetCircuitResetRequest {
	host?: string;
}

export interface SystemNetCircuitResetResponse {
	cleared: number;
}

export function createSystemNetCircuitResetService(
	netService: NetService,
): OSService<SystemNetCircuitResetRequest, SystemNetCircuitResetResponse> {
	return {
		name: TOKENS.SYSTEM_NET_CIRCUIT_RESET,
		requiredPermissions: ["system:read"],
		execute: async (req) => ({
			cleared: netService.resetCircuits(req.host),
		}),
	};
}

export interface SystemSchedulerFailuresRequest {
	id?: string;
	limit?: number;
}

export interface SystemSchedulerFailuresResponse {
	failures: Array<{
		id: string;
		timestamp: string;
		error: string;
		attempt: number;
	}>;
}

export function createSystemSchedulerFailuresService(
	schedulerService: { listFailures(limit?: number): Array<{ id: string; timestamp: string; error: string; attempt: number }> },
): OSService<SystemSchedulerFailuresRequest, SystemSchedulerFailuresResponse> {
	return {
		name: TOKENS.SYSTEM_SCHEDULER_FAILURES,
		requiredPermissions: ["system:read"],
		execute: async (req) => {
			let failures = schedulerService.listFailures(req.limit);
			if (req.id) {
				failures = failures.filter((item) => item.id === req.id);
			}
			return { failures };
		},
	};
}
