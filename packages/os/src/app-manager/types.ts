import type { AppLifecycleState } from "./lifecycle.js";
import type { AppManifest, AppManifestV1, AppPageEntry } from "./manifest.js";
import type { AppQuota } from "./quota.js";
import type { Token } from "../types/os.js";

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
	render(input: AppPageRenderInput): Promise<{
		prompt: string;
		tools: Array<{ name: string; description?: string; parameters?: unknown }>;
		dataViews?: Array<{ title: string; format: string; fields?: string[] }>;
		metadata?: Record<string, string>;
	}>;
}

export interface AppPageRenderContext {
	appId: string;
	sessionId: string;
	permissions: string[];
	workingDirectory: string;
	traceId?: string;
}

export interface AppPageSystemRuntime {
	execute<Request, Response, Name extends string>(
		service: Token<Request, Response, Name>,
		request: Request,
		context: AppPageRenderContext,
	): Promise<Response>;
	execute<Request, Response>(service: string, request: Request, context: AppPageRenderContext): Promise<Response>;
	listServices?(): string[];
}

export interface AppPageRenderInput {
	appId: string;
	page: AppPageEntry;
	context: AppPageRenderContext;
	system: {
		execute<Request, Response, Name extends string>(
			service: Token<Request, Response, Name>,
			request: Request,
			context: AppPageRenderContext,
		): Promise<Response>;
		services: string[];
	};
}

export type PageResult = import("@context-ai/ctp").JSXElement | (() => import("@context-ai/ctp").JSXElement | Promise<import("@context-ai/ctp").JSXElement>);

export type Page = (input: AppPageRenderInput) => PageResult | Promise<PageResult>;

export type RouteRenderRequest = { route: string };

export type RouteRenderResponse = {
	appId: string;
	page: AppPageEntry;
	prompt: string;
	tools: Array<{ name: string; description?: string; parameters?: unknown }>;
	dataViews?: Array<{ title: string; format: string; fields?: string[] }>;
	metadata?: Record<string, string>;
};

export type AppStartResponse = RouteRenderResponse & { route: string };

export type RuntimeToolsValidateRequest = {
	route: string;
	tools: Array<{
		name: string;
		parameters?: unknown;
		requiredPermissions?: string[];
	}>;
};

export type RuntimeToolsValidateResponse = {
	valid: boolean;
	issues: string[];
};

export type RuntimeRiskConfirmRequest = {
	riskLevel: "low" | "medium" | "high";
	approved?: boolean;
	approver?: string;
	approvalExpiresAt?: string;
};

export type RuntimeRiskConfirmResponse = {
	allowed: boolean;
	reason?: string;
};

export interface RollbackSnapshot {
	appId: string;
	previous?: AppManifestV1;
	previousQuota?: AppQuota;
	createdAt: string;
	expiresAt: string;
}

export interface RollbackSnapshotEntry extends RollbackSnapshot {
	token: string;
}

export interface ExportedRollbackState {
	snapshots: RollbackSnapshotEntry[];
	installReports: AppInstallReportState[];
}

export interface ImportRollbackStateInput {
	snapshots: Array<{
		token: string;
		appId: string;
		previous?: AppManifestV1;
		previousQuota?: AppQuota;
		createdAt: string;
		expiresAt: string;
	}>;
	installReports: AppInstallReportState[];
}
