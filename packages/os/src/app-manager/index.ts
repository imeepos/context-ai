import { AppLifecycleManager, type AppLifecycleState } from "./lifecycle.js";
import type { AppManifest, AppManifestV1, AppPageEntry } from "./manifest.js";
import { normalizeManifest } from "./manifest.js";
import { AppPermissionStore } from "./permissions.js";
import { AppQuotaManager, type AppQuota } from "./quota.js";
import { AppRegistry } from "./registry.js";
import { AppRouteRegistry } from "./route-registry.js";
import { OSError } from "../kernel/errors.js";
import type { OSService } from "../types/os.js";
import type { SecurityService } from "../security-service/index.js";
import { randomUUID } from "node:crypto";

export class AppManager {
	readonly registry = new AppRegistry();
	readonly lifecycle = new AppLifecycleManager();
	readonly permissions = new AppPermissionStore();
	readonly quota = new AppQuotaManager();
	readonly routes = new AppRouteRegistry();
	private readonly disabledApps = new Set<string>();
	private readonly installReports = new Map<string, AppInstallDeltaReport>();
	private readonly rollbackSnapshots = new Map<string, { appId: string; previous?: AppManifestV1 }>();

	install(manifest: AppManifest, quota?: AppQuota): void {
		const normalized = normalizeManifest(manifest);
		const alreadyInstalled = this.registry.has(normalized.id);
		this.registry.install(manifest);
		if (alreadyInstalled) {
			this.routes.unregisterApp(normalized.id);
		}
		this.routes.register(normalized);
		this.permissions.grant(manifest.id, manifest.permissions);
		if (quota) {
			this.quota.setQuota(manifest.id, quota);
		}
	}

	upgrade(manifest: AppManifest): void {
		if (!this.registry.has(manifest.id)) {
			throw new OSError("E_APP_NOT_REGISTERED", `App not found: ${manifest.id}`);
		}
		this.registry.install(manifest);
		const normalized = normalizeManifest(manifest);
		this.routes.unregisterApp(manifest.id);
		this.routes.register(normalized);
		this.permissions.grant(manifest.id, manifest.permissions);
	}

	uninstall(appId: string): void {
		this.registry.uninstall(appId);
		this.routes.unregisterApp(appId);
		this.lifecycle.reset(appId);
		this.permissions.revokeAll(appId);
		this.quota.reset(appId);
		this.disabledApps.delete(appId);
		this.installReports.delete(appId);
		for (const [token, snapshot] of this.rollbackSnapshots.entries()) {
			if (snapshot.appId === appId) {
				this.rollbackSnapshots.delete(token);
			}
		}
	}

	setState(appId: string, state: AppLifecycleState): AppLifecycleState {
		return this.lifecycle.transition(appId, state);
	}

	disable(appId: string): void {
		if (!this.registry.has(appId)) throw new OSError("E_APP_NOT_REGISTERED", `App not found: ${appId}`);
		this.disabledApps.add(appId);
	}

	enable(appId: string): void {
		if (!this.registry.has(appId)) throw new OSError("E_APP_NOT_REGISTERED", `App not found: ${appId}`);
		this.disabledApps.delete(appId);
	}

	isEnabled(appId: string): boolean {
		return this.registry.has(appId) && !this.disabledApps.has(appId);
	}

	setInstallReport(report: AppInstallDeltaReport): void {
		this.installReports.set(report.appId, report);
	}

	getInstallReport(appId: string): AppInstallDeltaReport | undefined {
		return this.installReports.get(appId);
	}

	setRollbackSnapshot(rollbackToken: string, snapshot: { appId: string; previous?: AppManifestV1 }): void {
		this.rollbackSnapshots.set(rollbackToken, {
			appId: snapshot.appId,
			previous: snapshot.previous ? cloneManifest(snapshot.previous) : undefined,
		});
	}

	consumeRollbackSnapshot(rollbackToken: string): { appId: string; previous?: AppManifestV1 } | undefined {
		const snapshot = this.rollbackSnapshots.get(rollbackToken);
		this.rollbackSnapshots.delete(rollbackToken);
		if (!snapshot) return undefined;
		return {
			appId: snapshot.appId,
			previous: snapshot.previous ? cloneManifest(snapshot.previous) : undefined,
		};
	}
}

export interface AppInstallRequest {
	manifest: AppManifest;
	quota?: AppQuota;
	force?: boolean;
}

export interface AppInstallDeltaReport {
	appId: string;
	version: string;
	addedPages: string[];
	addedPolicies: string[];
	addedObservability: string[];
	rollbackToken: string;
}

export interface AppInstallRollbackRequest {
	appId: string;
	rollbackToken: string;
}

export interface AppUpgradeRequest {
	manifest: AppManifest;
}

export interface AppInstallV1Request {
	manifest: AppManifestV1;
	quota?: AppQuota;
	force?: boolean;
	requireSignature?: boolean;
	signingSecret?: string;
}

export interface AppSetStateRequest {
	appId: string;
	state: AppLifecycleState;
}

export interface AppManageRequest {
	appId: string;
}

export interface AppStartRequest {
	appId: string;
	route?: string;
}

export interface AppListRequest {
	readonly _: "list";
}

export interface AppServiceHooks {
	onInstall?: (manifest: AppManifest) => void;
	onUninstall?: (appId: string) => void;
	onUpgrade?: (manifest: AppManifest) => void;
}

export interface AppPageRenderer {
	render(input: {
		appId: string;
		page: AppPageEntry;
		context: { appId: string; sessionId: string; permissions: string[]; workingDirectory: string };
	}): Promise<{
		prompt: string;
		tools: Array<{ name: string; description?: string; parameters?: unknown }>;
		dataViews?: Array<{ title: string; format: string; fields?: string[] }>;
		metadata?: Record<string, string>;
	}>;
}

export function createAppInstallService(
	manager: AppManager,
	hooks?: AppServiceHooks,
): OSService<AppInstallRequest, { ok: true; report: AppInstallDeltaReport }> {
	const diffAddedRoutes = (previous: AppManifestV1 | undefined, next: AppManifestV1): number => {
		if (!previous) return next.entry.pages.length;
		const previousRoutes = new Set(previous.entry.pages.map((item) => item.route));
		return next.entry.pages.filter((item) => !previousRoutes.has(item.route)).length;
	};
	return {
		name: "app.install",
		requiredPermissions: ["app:manage"],
		execute: async (req) => {
			const next = normalizeManifest(req.manifest);
			const previous = manager.registry.has(next.id) ? manager.registry.get(next.id) : undefined;
			const addedRoutes = diffAddedRoutes(previous, next);
			if (!req.force && addedRoutes === 0 && previous) {
				throw new OSError("E_VALIDATION_FAILED", `No page delta for app.install: ${next.id}`);
			}
			manager.install(req.manifest, req.quota);
			hooks?.onInstall?.(req.manifest);
			const report: AppInstallDeltaReport = {
				appId: next.id,
				version: next.version,
				addedPages: next.entry.pages
					.map((page) => page.route)
					.filter((route) => !previous?.entry.pages.some((item) => item.route === route)),
				addedPolicies: next.permissions.filter((permission) => !previous?.permissions.includes(permission)),
				addedObservability: [`audit:${next.id}`, `metrics:${next.id}`, `events:${next.id}`],
				rollbackToken: `${next.id}@${next.version}:${randomUUID()}`,
			};
			manager.setInstallReport(report);
			manager.setRollbackSnapshot(report.rollbackToken, {
				appId: next.id,
				previous,
			});
			return { ok: true, report };
		},
	};
}

export function createAppInstallRollbackService(
	manager: AppManager,
): OSService<AppInstallRollbackRequest, { ok: true; restoredVersion?: string; uninstalled: boolean }> {
	return {
		name: "app.install.rollback",
		requiredPermissions: ["app:manage"],
		execute: async (req) => {
			const snapshot = manager.consumeRollbackSnapshot(req.rollbackToken);
			if (!snapshot || snapshot.appId !== req.appId) {
				throw new OSError("E_VALIDATION_FAILED", `Invalid rollback token: ${req.rollbackToken}`);
			}
			if (snapshot.previous) {
				manager.install(snapshot.previous);
				return {
					ok: true,
					restoredVersion: snapshot.previous.version,
					uninstalled: false,
				};
			}
			manager.uninstall(req.appId);
			return {
				ok: true,
				uninstalled: true,
			};
		},
	};
}

function buildManifestSigningPayload(manifest: AppManifestV1): string {
	const pages = [...manifest.entry.pages]
		.map((page) => ({
			id: page.id,
			route: page.route,
			name: page.name,
			description: page.description,
			path: page.path,
			tags: page.tags ?? [],
			default: page.default ?? false,
		}))
		.sort((a, b) => a.route.localeCompare(b.route));
	return JSON.stringify({
		id: manifest.id,
		name: manifest.name,
		version: manifest.version,
		pages,
		permissions: [...manifest.permissions].sort(),
	});
}

export function createAppInstallV1Service(
	manager: AppManager,
	securityService: SecurityService,
): OSService<AppInstallV1Request, { ok: true; report: AppInstallDeltaReport }> {
	const baseInstall = createAppInstallService(manager);
	return {
		name: "app.install.v1",
		requiredPermissions: ["app:manage"],
		execute: async (req, ctx) => {
			if (req.requireSignature) {
				if (!req.manifest.signing?.signature) {
					throw new OSError("E_VALIDATION_FAILED", `Manifest signing signature is required: ${req.manifest.id}`);
				}
				if (!req.signingSecret) {
					throw new OSError("E_VALIDATION_FAILED", "Signing secret is required when requireSignature=true");
				}
				const payload = buildManifestSigningPayload(req.manifest);
				const verified = securityService.verify(payload, req.signingSecret, req.manifest.signing.signature);
				if (!verified) {
					throw new OSError("E_POLICY_DENIED", `Invalid manifest signature: ${req.manifest.id}@${req.manifest.version}`);
				}
			}
			return baseInstall.execute(
				{
					manifest: req.manifest,
					quota: req.quota,
					force: req.force,
				},
				ctx,
			);
		},
	};
}

export function createAppUpgradeService(
	manager: AppManager,
	hooks?: AppServiceHooks,
): OSService<AppUpgradeRequest, { ok: true }> {
	return {
		name: "app.upgrade",
		requiredPermissions: ["app:manage"],
		execute: async (req) => {
			manager.upgrade(req.manifest);
			hooks?.onUpgrade?.(req.manifest);
			return { ok: true };
		},
	};
}

export function createAppSetStateService(manager: AppManager): OSService<AppSetStateRequest, { state: AppLifecycleState }> {
	return {
		name: "app.state.set",
		requiredPermissions: ["app:manage"],
		execute: async (req) => ({
			state: manager.setState(req.appId, req.state),
		}),
	};
}

export function createAppListService(manager: AppManager): OSService<AppListRequest, { apps: AppManifest[] }> {
	return {
		name: "app.list",
		requiredPermissions: ["app:read"],
		execute: async () => ({
			apps: manager.registry.list(),
		}),
	};
}

export function createAppUninstallService(
	manager: AppManager,
	hooks?: AppServiceHooks,
): OSService<AppManageRequest, { ok: true }> {
	return {
		name: "app.uninstall",
		requiredPermissions: ["app:manage"],
		execute: async (req) => {
			manager.uninstall(req.appId);
			hooks?.onUninstall?.(req.appId);
			return { ok: true };
		},
	};
}

export function createAppDisableService(manager: AppManager): OSService<AppManageRequest, { ok: true }> {
	return {
		name: "app.disable",
		requiredPermissions: ["app:manage"],
		execute: async (req) => {
			manager.disable(req.appId);
			return { ok: true };
		},
	};
}

export function createAppEnableService(manager: AppManager): OSService<AppManageRequest, { ok: true }> {
	return {
		name: "app.enable",
		requiredPermissions: ["app:manage"],
		execute: async (req) => {
			manager.enable(req.appId);
			return { ok: true };
		},
	};
}

export function createAppPageRenderService(
	manager: AppManager,
	renderer: AppPageRenderer,
): OSService<
	{ route: string },
	{
		appId: string;
		page: AppPageEntry;
		prompt: string;
		tools: Array<{ name: string; description?: string; parameters?: unknown }>;
		dataViews?: Array<{ title: string; format: string; fields?: string[] }>;
		metadata?: Record<string, string>;
	}
> {
	return createRouteRenderService("app.page.render", manager, renderer);
}

export function createRenderService(
	manager: AppManager,
	renderer: AppPageRenderer,
): OSService<
	{ route: string },
	{
		appId: string;
		page: AppPageEntry;
		prompt: string;
		tools: Array<{ name: string; description?: string; parameters?: unknown }>;
		dataViews?: Array<{ title: string; format: string; fields?: string[] }>;
		metadata?: Record<string, string>;
	}
> {
	return createRouteRenderService("render", manager, renderer);
}

function createRouteRenderService(
	name: "app.page.render" | "render",
	manager: AppManager,
	renderer: AppPageRenderer,
): OSService<
	{ route: string },
	{
		appId: string;
		page: AppPageEntry;
		prompt: string;
		tools: Array<{ name: string; description?: string; parameters?: unknown }>;
		dataViews?: Array<{ title: string; format: string; fields?: string[] }>;
		metadata?: Record<string, string>;
	}
> {
	return {
		name,
		requiredPermissions: ["app:read"],
		execute: async (req, ctx) => {
			const resolved = manager.routes.resolve(req.route);
			if (!manager.isEnabled(resolved.appId)) {
				manager.routes.recordRender(req.route, {
					success: false,
					error: `App is disabled: ${resolved.appId}`,
				});
				throw new OSError("E_APP_NOT_REGISTERED", `App is disabled: ${resolved.appId}`);
			}
			try {
				const rendered = await renderer.render({
					appId: resolved.appId,
					page: resolved.page,
					context: {
						appId: ctx.appId,
						sessionId: ctx.sessionId,
						permissions: ctx.permissions,
						workingDirectory: ctx.workingDirectory,
					},
				});
				manager.routes.recordRender(req.route, { success: true });
				return {
					appId: resolved.appId,
					page: resolved.page,
					prompt: rendered.prompt,
					tools: rendered.tools,
					dataViews: rendered.dataViews,
					metadata: rendered.metadata,
				};
			} catch (error) {
				manager.routes.recordRender(req.route, {
					success: false,
					error: error instanceof Error ? error.message : String(error),
				});
				throw error;
			}
		},
	};
}

export function createAppStartService(
	manager: AppManager,
	renderer: AppPageRenderer,
): OSService<
	AppStartRequest,
	{
		appId: string;
		route: string;
		page: AppPageEntry;
		prompt: string;
		tools: Array<{ name: string; description?: string; parameters?: unknown }>;
		dataViews?: Array<{ title: string; format: string; fields?: string[] }>;
		metadata?: Record<string, string>;
	}
> {
	return {
		name: "app.start",
		requiredPermissions: ["app:read"],
		execute: async (req, ctx) => {
			const manifest = manager.registry.get(req.appId);
			if (!manager.isEnabled(req.appId)) {
				throw new OSError("E_APP_NOT_REGISTERED", `App is disabled: ${req.appId}`);
			}
			const route = req.route ?? manifest.entry.pages.find((page) => page.default)?.route ?? manifest.entry.pages[0]?.route;
			if (!route) {
				throw new OSError("E_VALIDATION_FAILED", `No page route found for app: ${req.appId}`);
			}
			const resolved = manager.routes.resolve(route);
			if (resolved.appId !== req.appId) {
				throw new OSError("E_VALIDATION_FAILED", `Route ${route} does not belong to app ${req.appId}`);
			}
			ensureRunningState(manager, req.appId);
			try {
				const rendered = await renderer.render({
					appId: resolved.appId,
					page: resolved.page,
					context: {
						appId: ctx.appId,
						sessionId: ctx.sessionId,
						permissions: ctx.permissions,
						workingDirectory: ctx.workingDirectory,
					},
				});
				manager.routes.recordRender(route, { success: true });
				return {
					appId: resolved.appId,
					route,
					page: resolved.page,
					prompt: rendered.prompt,
					tools: rendered.tools,
					dataViews: rendered.dataViews,
					metadata: rendered.metadata,
				};
			} catch (error) {
				manager.routes.recordRender(route, {
					success: false,
					error: error instanceof Error ? error.message : String(error),
				});
				throw error;
			}
		},
	};
}

function ensureRunningState(manager: AppManager, appId: string): void {
	const current = manager.lifecycle.getState(appId);
	if (current === "running") return;
	if (current === "suspended") {
		manager.setState(appId, "running");
		return;
	}
	if (current === "installed" || current === "stopped") {
		manager.setState(appId, "resolved");
	}
	if (manager.lifecycle.getState(appId) === "resolved") {
		manager.setState(appId, "active");
	}
	if (manager.lifecycle.getState(appId) === "active") {
		manager.setState(appId, "running");
	}
}

export function createRuntimeToolsValidateService(
	manager: AppManager,
): OSService<
	{
		route: string;
		tools: Array<{
			name: string;
			parameters?: unknown;
			requiredPermissions?: string[];
		}>;
	},
	{
		valid: boolean;
		issues: string[];
	}
> {
	return {
		name: "runtime.tools.validate",
		requiredPermissions: ["app:read"],
		execute: async (req) => {
			const resolved = manager.routes.resolve(req.route);
			const manifest = manager.registry.get(resolved.appId);
			const grantedPermissions = new Set(manifest.permissions);
			const issues: string[] = [];
			const seen = new Set<string>();
			for (const tool of req.tools) {
				if (!tool.name?.trim()) {
					issues.push("tool.name is required");
				} else if (seen.has(tool.name)) {
					issues.push(`duplicate tool name: ${tool.name}`);
				} else {
					seen.add(tool.name);
				}
				if (tool.parameters !== undefined) {
					const isObjectSchema =
						typeof tool.parameters === "object" && tool.parameters !== null && !Array.isArray(tool.parameters);
					if (!isObjectSchema) {
						issues.push(`invalid parameters schema: ${tool.name || "unknown"}`);
					}
				}
				for (const permission of tool.requiredPermissions ?? []) {
					if (!grantedPermissions.has(permission)) {
						issues.push(`permission mismatch: ${tool.name || "unknown"} requires ${permission}`);
					}
				}
			}
			return {
				valid: issues.length === 0,
				issues,
			};
		},
	};
}

export function createRuntimeRiskConfirmService(): OSService<
	{
		riskLevel: "low" | "medium" | "high";
		approved?: boolean;
		approver?: string;
		approvalExpiresAt?: string;
	},
	{
		allowed: boolean;
		reason?: string;
	}
> {
	return {
		name: "runtime.risk.confirm",
		requiredPermissions: ["app:read"],
		execute: async (req) => {
			if (req.riskLevel === "low") {
				return { allowed: true };
			}
			if (!req.approved) {
				return { allowed: false, reason: "approval_required" };
			}
			if (!req.approver?.trim()) {
				return { allowed: false, reason: "approver_required" };
			}
			if (req.riskLevel === "high") {
				if (!req.approvalExpiresAt) {
					return { allowed: false, reason: "approval_expires_at_required" };
				}
				const expires = Date.parse(req.approvalExpiresAt);
				if (Number.isNaN(expires) || expires <= Date.now()) {
					return { allowed: false, reason: "approval_expired" };
				}
			}
			return { allowed: true };
		},
	};
}

export type { AppManifest } from "./manifest.js";
export type { AppLifecycleState } from "./lifecycle.js";
export type { AppQuota } from "./quota.js";

function cloneManifest(manifest: AppManifestV1): AppManifestV1 {
	return JSON.parse(JSON.stringify(manifest)) as AppManifestV1;
}
