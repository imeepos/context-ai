import type { AppManager } from "../types.js";
import type { OSService } from "../../types/os.js";
import * as TOKENS from "../../tokens.js";

export interface SystemRoutesRequest {
	appId?: string;
	prefix?: string;
	offset?: number;
	limit?: number;
}

export interface SystemRoutesResponse {
	routes: string[];
	total: number;
}

export function createSystemRoutesService(
	appManager: AppManager,
): OSService<SystemRoutesRequest, SystemRoutesResponse> {
	return {
		name: TOKENS.SYSTEM_ROUTES,
		requiredPermissions: ["system:read"],
		execute: async (req) => {
			let routes = appManager.routes.listRoutes(req.appId);
			const prefix = req.prefix?.trim();
			if (prefix) {
				routes = routes.filter((route) => route.startsWith(prefix));
			}
			const total = routes.length;
			const offset = req.offset && req.offset > 0 ? req.offset : 0;
			const limit = req.limit && req.limit > 0 ? req.limit : routes.length;
			return {
				routes: routes.slice(offset, offset + limit),
				total,
			};
		},
	};
}

export interface SystemRoutesStatsRequest {
	appId?: string;
}

export interface SystemRoutesStatsResponse {
	stats: Array<{
		route: string;
		total: number;
		success: number;
		failure: number;
		lastRenderedAt?: string;
		lastError?: string;
	}>;
}

export function createSystemRoutesStatsService(
	appManager: AppManager,
): OSService<SystemRoutesStatsRequest, SystemRoutesStatsResponse> {
	return {
		name: TOKENS.SYSTEM_ROUTES_STATS,
		requiredPermissions: ["system:read"],
		execute: async (req) => ({
			stats: appManager.routes.stats(req.appId),
		}),
	};
}
