import type { AppManifestV1, AppPageEntry } from "./manifest.js";
import { OSError } from "../kernel/errors.js";

export interface ResolvedAppPage {
	appId: string;
	page: AppPageEntry;
}

export interface RouteRenderStats {
	route: string;
	total: number;
	success: number;
	failure: number;
	lastRenderedAt?: string;
	lastError?: string;
}

export class AppRouteRegistry {
	private readonly routeToPage = new Map<string, ResolvedAppPage>();
	private readonly routesByApp = new Map<string, Set<string>>();
	private readonly routeStats = new Map<string, Omit<RouteRenderStats, "route">>();

	register(manifest: AppManifestV1): void {
		const appRoutes = this.routesByApp.get(manifest.id) ?? new Set<string>();
		for (const page of manifest.entry.pages) {
			const existing = this.routeToPage.get(page.route);
			if (existing && existing.appId !== manifest.id) {
				throw new OSError("E_VALIDATION_FAILED", `Route already registered: ${page.route}`);
			}
			this.routeToPage.set(page.route, { appId: manifest.id, page });
			appRoutes.add(page.route);
			if (!this.routeStats.has(page.route)) {
				this.routeStats.set(page.route, {
					total: 0,
					success: 0,
					failure: 0,
				});
			}
		}
		this.routesByApp.set(manifest.id, appRoutes);
	}

	unregisterApp(appId: string): void {
		const routes = this.routesByApp.get(appId);
		if (!routes) return;
		for (const route of routes) {
			this.routeToPage.delete(route);
			this.routeStats.delete(route);
		}
		this.routesByApp.delete(appId);
	}

	resolve(route: string): ResolvedAppPage {
		const resolved = this.routeToPage.get(route);
		if (!resolved) {
			throw new OSError("E_VALIDATION_FAILED", `Route not found: ${route}`);
		}
		return resolved;
	}

	listRoutes(appId?: string): string[] {
		if (appId) {
			return [...(this.routesByApp.get(appId) ?? new Set<string>())];
		}
		return [...this.routeToPage.keys()];
	}

	recordRender(route: string, input: { success: boolean; error?: string }): void {
		const current = this.routeStats.get(route) ?? {
			total: 0,
			success: 0,
			failure: 0,
		};
		const next = {
			total: current.total + 1,
			success: current.success + (input.success ? 1 : 0),
			failure: current.failure + (input.success ? 0 : 1),
			lastRenderedAt: new Date().toISOString(),
			lastError: input.success ? current.lastError : input.error ?? current.lastError,
		};
		this.routeStats.set(route, next);
	}

	stats(appId?: string): RouteRenderStats[] {
		const routes = this.listRoutes(appId);
		return routes.map((route) => {
			const stat = this.routeStats.get(route) ?? { total: 0, success: 0, failure: 0 };
			return {
				route,
				total: stat.total,
				success: stat.success,
				failure: stat.failure,
				lastRenderedAt: stat.lastRenderedAt,
				lastError: stat.lastError,
			};
		});
	}
}
