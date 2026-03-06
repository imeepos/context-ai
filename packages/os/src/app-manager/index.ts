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
	private readonly installReports = new Map<string, AppInstallReportState>();
	private readonly rollbackSnapshots = new Map<
		string,
		{
			appId: string;
			previous?: AppManifestV1;
			previousQuota?: AppQuota;
			createdAt: string;
			expiresAt: string;
		}
	>();
	private static readonly MAX_ROLLBACK_SNAPSHOTS_PER_APP = 20;
	private static readonly DEFAULT_ROLLBACK_TTL_MS = 24 * 60 * 60 * 1000;
	private rollbackTokenTtlMs = AppManager.DEFAULT_ROLLBACK_TTL_MS;

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

	setInstallReport(report: AppInstallDeltaReport, lastAction: "install" | "rollback" = "install"): void {
		this.installReports.set(report.appId, {
			report,
			lastAction,
			updatedAt: new Date().toISOString(),
		});
	}

	getInstallReport(appId: string): AppInstallDeltaReport | undefined {
		return this.installReports.get(appId)?.report;
	}

	getInstallReportState(appId: string): AppInstallReportState | undefined {
		const state = this.installReports.get(appId);
		if (!state) return undefined;
		return {
			report: {
				...state.report,
			},
			lastAction: state.lastAction,
			updatedAt: state.updatedAt,
		};
	}

	setRollbackSnapshot(
		rollbackToken: string,
		snapshot: {
			appId: string;
			previous?: AppManifestV1;
			previousQuota?: AppQuota;
			createdAt?: string;
			expiresAt?: string;
		},
	): void {
		const createdAt = snapshot.createdAt ?? new Date().toISOString();
		const expiresAt = snapshot.expiresAt ?? new Date(Date.now() + this.rollbackTokenTtlMs).toISOString();
		this.rollbackSnapshots.set(rollbackToken, {
			appId: snapshot.appId,
			previous: snapshot.previous ? cloneManifest(snapshot.previous) : undefined,
			previousQuota: snapshot.previousQuota ? { ...snapshot.previousQuota } : undefined,
			createdAt,
			expiresAt,
		});
		this.pruneRollbackSnapshots(snapshot.appId);
	}

	consumeRollbackSnapshot(
		rollbackToken: string,
		options?: { appId?: string },
	): { appId: string; previous?: AppManifestV1; previousQuota?: AppQuota } | undefined {
		const snapshot = this.rollbackSnapshots.get(rollbackToken);
		if (!snapshot) return undefined;
		const expiresAt = Date.parse(snapshot.expiresAt);
		if (!Number.isNaN(expiresAt) && expiresAt <= Date.now()) {
			this.rollbackSnapshots.delete(rollbackToken);
			return undefined;
		}
		if (options?.appId && snapshot.appId !== options.appId) {
			return undefined;
		}
		this.rollbackSnapshots.delete(rollbackToken);
		return {
			appId: snapshot.appId,
			previous: snapshot.previous ? cloneManifest(snapshot.previous) : undefined,
			previousQuota: snapshot.previousQuota ? { ...snapshot.previousQuota } : undefined,
		};
	}

	setRollbackTokenTTL(ms: number): void {
		if (!Number.isFinite(ms) || ms <= 0) {
			throw new OSError("E_VALIDATION_FAILED", `Invalid rollback token TTL: ${ms}`);
		}
		this.rollbackTokenTtlMs = Math.floor(ms);
	}

	exportRollbackState(): {
		snapshots: Array<{
			token: string;
			appId: string;
			previous?: AppManifestV1;
			previousQuota?: AppQuota;
			createdAt: string;
			expiresAt: string;
		}>;
		installReports: AppInstallReportState[];
	} {
		return {
			snapshots: [...this.rollbackSnapshots.entries()].map(([token, snapshot]) => ({
				token,
				appId: snapshot.appId,
				previous: snapshot.previous ? cloneManifest(snapshot.previous) : undefined,
				previousQuota: snapshot.previousQuota ? { ...snapshot.previousQuota } : undefined,
				createdAt: snapshot.createdAt,
				expiresAt: snapshot.expiresAt,
			})),
			installReports: [...this.installReports.values()].map((state) => ({
				report: { ...state.report },
				lastAction: state.lastAction,
				updatedAt: state.updatedAt,
			})),
		};
	}

	importRollbackState(input: {
		snapshots: Array<{
			token: string;
			appId: string;
			previous?: AppManifestV1;
			previousQuota?: AppQuota;
			createdAt: string;
			expiresAt: string;
		}>;
		installReports: AppInstallReportState[];
	}): void {
		if (!input || typeof input !== "object") {
			throw new OSError("E_VALIDATION_FAILED", "Invalid rollback state: object required");
		}
		if (!Array.isArray(input.snapshots)) {
			throw new OSError("E_VALIDATION_FAILED", "Invalid rollback state: snapshots must be array");
		}
		if (!Array.isArray(input.installReports)) {
			throw new OSError("E_VALIDATION_FAILED", "Invalid rollback state: installReports must be array");
		}
		const snapshots = (input.snapshots ?? []).map((snapshot) => {
			validateRollbackSnapshot(snapshot);
			return {
				token: snapshot.token,
				appId: snapshot.appId,
				previous: snapshot.previous,
				previousQuota: snapshot.previousQuota,
				createdAt: snapshot.createdAt,
				expiresAt: snapshot.expiresAt,
			};
		});
		const snapshotTokenSet = new Set<string>();
		for (const snapshot of snapshots) {
			if (snapshotTokenSet.has(snapshot.token)) {
				throw new OSError("E_VALIDATION_FAILED", `Invalid rollback state: duplicate snapshot token ${snapshot.token}`);
			}
			snapshotTokenSet.add(snapshot.token);
		}
		const reports = (input.installReports ?? []).map((state) => {
			validateInstallReportState(state);
			return {
				report: { ...state.report },
				lastAction: state.lastAction,
				updatedAt: state.updatedAt,
			};
		});
		const reportAppIdSet = new Set<string>();
		for (const state of reports) {
			if (reportAppIdSet.has(state.report.appId)) {
				throw new OSError(
					"E_VALIDATION_FAILED",
					`Invalid rollback state: duplicate install report appId ${state.report.appId}`,
				);
			}
			reportAppIdSet.add(state.report.appId);
		}

		this.rollbackSnapshots.clear();
		this.installReports.clear();
		for (const snapshot of snapshots) {
			this.setRollbackSnapshot(snapshot.token, snapshot);
		}
		for (const reportState of reports) {
			this.installReports.set(reportState.report.appId, reportState);
		}
	}

	listRollbackSnapshots(appId?: string): Array<{
		token: string;
		appId: string;
		createdAt: string;
		expiresAt: string;
	}> {
		return [...this.rollbackSnapshots.entries()]
			.filter(([, snapshot]) => !appId || snapshot.appId === appId)
			.map(([token, snapshot]) => ({
				token,
				appId: snapshot.appId,
				createdAt: snapshot.createdAt,
				expiresAt: snapshot.expiresAt,
			}));
	}

	garbageCollectExpiredRollbackSnapshots(now = Date.now()): { scanned: number; removed: number } {
		const entries = [...this.rollbackSnapshots.entries()];
		let removed = 0;
		for (const [token, snapshot] of entries) {
			const expiresAt = Date.parse(snapshot.expiresAt);
			if (!Number.isNaN(expiresAt) && expiresAt <= now) {
				this.rollbackSnapshots.delete(token);
				removed += 1;
			}
		}
		return {
			scanned: entries.length,
			removed,
		};
	}

	private pruneRollbackSnapshots(appId: string): void {
		const tokensForApp = [...this.rollbackSnapshots.entries()]
			.filter(([, snapshot]) => snapshot.appId === appId)
			.map(([token]) => token);
		const overflow = tokensForApp.length - AppManager.MAX_ROLLBACK_SNAPSHOTS_PER_APP;
		if (overflow <= 0) return;
		for (const token of tokensForApp.slice(0, overflow)) {
			this.rollbackSnapshots.delete(token);
		}
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

export interface AppInstallReportState {
	report: AppInstallDeltaReport;
	lastAction: "install" | "rollback";
	updatedAt: string;
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
	onRollback?: (input: {
		appId: string;
		rollbackToken: string;
		restoredVersion?: string;
		uninstalled: boolean;
	}) => void;
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
			const previousQuota = manager.quota.getQuota(next.id);
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
				previousQuota,
			});
			return { ok: true, report };
		},
	};
}

export function createAppInstallRollbackService(
	manager: AppManager,
	hooks?: AppServiceHooks,
): OSService<AppInstallRollbackRequest, { ok: true; restoredVersion?: string; uninstalled: boolean }> {
	return {
		name: "app.install.rollback",
		requiredPermissions: ["app:manage"],
		execute: async (req) => {
			const snapshot = manager.consumeRollbackSnapshot(req.rollbackToken, { appId: req.appId });
			if (!snapshot) {
				throw new OSError("E_VALIDATION_FAILED", `Invalid rollback token: ${req.rollbackToken}`);
			}
			if (snapshot.previous) {
				manager.install(snapshot.previous);
				manager.quota.reset(req.appId);
				if (snapshot.previousQuota) {
					manager.quota.setQuota(req.appId, snapshot.previousQuota);
				}
				manager.setInstallReport({
					appId: snapshot.previous.id,
					version: snapshot.previous.version,
					addedPages: snapshot.previous.entry.pages.map((page) => page.route),
					addedPolicies: [...snapshot.previous.permissions],
					addedObservability: [
						`audit:${snapshot.previous.id}`,
						`metrics:${snapshot.previous.id}`,
						`events:${snapshot.previous.id}`,
					],
					rollbackToken: req.rollbackToken,
				}, "rollback");
				hooks?.onInstall?.(snapshot.previous);
				hooks?.onRollback?.({
					appId: req.appId,
					rollbackToken: req.rollbackToken,
					restoredVersion: snapshot.previous.version,
					uninstalled: false,
				});
				return {
					ok: true,
					restoredVersion: snapshot.previous.version,
					uninstalled: false,
				};
			}
			manager.uninstall(req.appId);
			hooks?.onUninstall?.(req.appId);
			hooks?.onRollback?.({
				appId: req.appId,
				rollbackToken: req.rollbackToken,
				uninstalled: true,
			});
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
	hooks?: AppServiceHooks,
): OSService<AppInstallV1Request, { ok: true; report: AppInstallDeltaReport }> {
	const baseInstall = createAppInstallService(manager, hooks);
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

function validateIsoTimestamp(value: string, field: string): void {
	if (typeof value !== "string" || Number.isNaN(Date.parse(value))) {
		throw new OSError("E_VALIDATION_FAILED", `Invalid rollback state: ${field} must be ISO datetime string`);
	}
}

function validateRollbackSnapshot(snapshot: {
	token: string;
	appId: string;
	createdAt: string;
	expiresAt: string;
	previous?: AppManifestV1;
	previousQuota?: AppQuota;
}): void {
	if (!snapshot || typeof snapshot !== "object") {
		throw new OSError("E_VALIDATION_FAILED", "Invalid rollback state: snapshot object required");
	}
	if (typeof snapshot.token !== "string" || snapshot.token.trim().length === 0) {
		throw new OSError("E_VALIDATION_FAILED", "Invalid rollback state: snapshot.token required");
	}
	if (typeof snapshot.appId !== "string" || snapshot.appId.trim().length === 0) {
		throw new OSError("E_VALIDATION_FAILED", "Invalid rollback state: snapshot.appId required");
	}
	validateIsoTimestamp(snapshot.createdAt, "snapshot.createdAt");
	validateIsoTimestamp(snapshot.expiresAt, "snapshot.expiresAt");
	if (Date.parse(snapshot.expiresAt) <= Date.parse(snapshot.createdAt)) {
		throw new OSError("E_VALIDATION_FAILED", "Invalid rollback state: snapshot.expiresAt must be after createdAt");
	}
	if (snapshot.previous) {
		normalizeManifest(snapshot.previous);
	}
	if (snapshot.previousQuota) {
		const { maxTokens, maxToolCalls } = snapshot.previousQuota;
		if (!Number.isFinite(maxTokens) || maxTokens <= 0 || !Number.isFinite(maxToolCalls) || maxToolCalls <= 0) {
			throw new OSError("E_VALIDATION_FAILED", "Invalid rollback state: snapshot.previousQuota invalid");
		}
	}
}

function validateInstallReportState(state: AppInstallReportState): void {
	if (!state || typeof state !== "object" || !state.report) {
		throw new OSError("E_VALIDATION_FAILED", "Invalid rollback state: install report object required");
	}
	if (state.lastAction !== "install" && state.lastAction !== "rollback") {
		throw new OSError("E_VALIDATION_FAILED", "Invalid rollback state: install report lastAction invalid");
	}
	validateIsoTimestamp(state.updatedAt, "installReport.updatedAt");
	const report = state.report;
	if (typeof report.appId !== "string" || report.appId.trim().length === 0) {
		throw new OSError("E_VALIDATION_FAILED", "Invalid rollback state: report.appId required");
	}
	if (typeof report.version !== "string" || report.version.trim().length === 0) {
		throw new OSError("E_VALIDATION_FAILED", "Invalid rollback state: report.version required");
	}
	if (!Array.isArray(report.addedPages) || !Array.isArray(report.addedPolicies) || !Array.isArray(report.addedObservability)) {
		throw new OSError("E_VALIDATION_FAILED", "Invalid rollback state: report arrays required");
	}
	if (typeof report.rollbackToken !== "string" || report.rollbackToken.trim().length === 0) {
		throw new OSError("E_VALIDATION_FAILED", "Invalid rollback state: report.rollbackToken required");
	}
}
