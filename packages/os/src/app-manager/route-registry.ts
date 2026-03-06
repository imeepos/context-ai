import type { AppManifestV1, AppPageEntry } from "./manifest.js";
import { OSError } from "../kernel/errors.js";

export interface ResolvedAppPage {
	appId: string;
	page: AppPageEntry;
}

export class AppRouteRegistry {
	private readonly routeToPage = new Map<string, ResolvedAppPage>();
	private readonly routesByApp = new Map<string, Set<string>>();

	register(manifest: AppManifestV1): void {
		const appRoutes = this.routesByApp.get(manifest.id) ?? new Set<string>();
		for (const page of manifest.entry.pages) {
			const existing = this.routeToPage.get(page.route);
			if (existing && existing.appId !== manifest.id) {
				throw new OSError("E_VALIDATION_FAILED", `Route already registered: ${page.route}`);
			}
			this.routeToPage.set(page.route, { appId: manifest.id, page });
			appRoutes.add(page.route);
		}
		this.routesByApp.set(manifest.id, appRoutes);
	}

	unregisterApp(appId: string): void {
		const routes = this.routesByApp.get(appId);
		if (!routes) return;
		for (const route of routes) {
			this.routeToPage.delete(route);
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
}
