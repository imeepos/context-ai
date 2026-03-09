import type {
    AppInstallDeltaReport,
    AppInstallRequest,
    AppInstallRollbackRequest,
    AppInstallV1Request,
    AppLifecycleState,
    AppListRequest,
    AppManageRequest,
    AppManifest,
    AppSetStateRequest,
    AppStartRequest,
    AppUpgradeRequest,
} from "../app-manager/index.js";
import type { AppPageEntry } from "../app-manager/manifest.js";
import type { HostAdapterRequest } from "../host-adapter/index.js";
import type { MediaInspectRequest, MediaInspectResult } from "../media-service/index.js";
import type { ModelGenerateRequest, ModelGenerateResponse } from "../model-service/index.js";
import type { AppPackage, PackageInstallRequest } from "../package-service/index.js";
import type { UIRenderRequest, UIRenderResult } from "../ui-service/index.js";
import { token } from "./shared.js";

// App Manager Response Types
export interface AppInstallResponse {
    ok: true;
    report: AppInstallDeltaReport;
}

export interface AppInstallRollbackResponse {
    ok: true;
    restoredVersion?: string;
    uninstalled: boolean;
}

export interface AppUpgradeResponse {
    ok: true;
}

export interface AppSetStateResponse {
    state: AppLifecycleState;
}

export interface AppListResponse {
    apps: AppManifest[];
}

export interface AppManageResponse {
    ok: true;
}

// Runtime Types
export interface RenderToolDescriptor {
    name: string;
    description?: string;
    parameters?: unknown;
}

export interface RenderDataViewDescriptor {
    title: string;
    format: string;
    fields?: string[];
}

export interface RouteRenderRequest {
    route: string;
}

export interface RouteRenderResponse {
    appId: string;
    page: AppPageEntry;
    prompt: string;
    tools: RenderToolDescriptor[];
    dataViews?: RenderDataViewDescriptor[];
    metadata?: Record<string, string>;
}

export interface AppStartResponse extends RouteRenderResponse {
    route: string;
}

export interface RuntimeToolsValidateRequest {
    route: string;
    tools: Array<{
        name: string;
        parameters?: unknown;
        requiredPermissions?: string[];
    }>;
}

export interface RuntimeToolsValidateResponse {
    valid: boolean;
    issues: string[];
}

export interface RuntimeRiskConfirmRequest {
    riskLevel: "low" | "medium" | "high";
    approved?: boolean;
    approver?: string;
    approvalExpiresAt?: string;
}

export interface RuntimeRiskConfirmResponse {
    allowed: boolean;
    reason?: string;
}

// Package Service Response Types
export interface PackageInstallResponse {
    ok: true;
}

export interface PackageListResponse {
    packages: AppPackage[];
}

// Host Service Response Types
export interface HostExecuteResponse {
    result: unknown;
}

// App Management Tokens
export const APP_INSTALL = token<
    AppInstallRequest,
    AppInstallResponse,
    "app.install"
>("app.install");

export const APP_INSTALL_ROLLBACK = token<AppInstallRollbackRequest, AppInstallRollbackResponse, "app.install.rollback">("app.install.rollback");

export const APP_INSTALL_V1 = token<
    AppInstallV1Request,
    AppInstallResponse,
    "app.install.v1"
>("app.install.v1");

export const APP_UPGRADE = token<
    AppUpgradeRequest,
    AppUpgradeResponse,
    "app.upgrade"
>("app.upgrade");

export const APP_STATE_SET = token<
    AppSetStateRequest,
    AppSetStateResponse,
    "app.state.set"
>("app.state.set");

export const APP_LIST = token<
    AppListRequest,
    AppListResponse,
    "app.list"
>("app.list");

export const APP_UNINSTALL = token<
    AppManageRequest,
    AppManageResponse,
    "app.uninstall"
>("app.uninstall");

export const APP_DISABLE = token<
    AppManageRequest,
    AppManageResponse,
    "app.disable"
>("app.disable");

export const APP_ENABLE = token<
    AppManageRequest,
    AppManageResponse,
    "app.enable"
>("app.enable");

export const APP_PAGE_RENDER = token<
    RouteRenderRequest,
    RouteRenderResponse,
    "app.page.render"
>("app.page.render");

export const RENDER = token<
    RouteRenderRequest,
    RouteRenderResponse,
    "render"
>("render");

export const APP_START = token<
    AppStartRequest,
    AppStartResponse,
    "app.start"
>("app.start");

// Runtime Tokens
export const RUNTIME_TOOLS_VALIDATE = token<RuntimeToolsValidateRequest, RuntimeToolsValidateResponse, "runtime.tools.validate">(
    "runtime.tools.validate",
);

export const RUNTIME_RISK_CONFIRM = token<RuntimeRiskConfirmRequest, RuntimeRiskConfirmResponse, "runtime.risk.confirm">("runtime.risk.confirm");

// Package Tokens
export const PACKAGE_INSTALL = token<PackageInstallRequest, PackageInstallResponse, "package.install">("package.install");

export const PACKAGE_LIST = token<Record<string, never>, PackageListResponse, "package.list">("package.list");

// Host Tokens
export const HOST_EXECUTE = token<HostAdapterRequest, HostExecuteResponse, "host.execute">("host.execute");

// Media Tokens
export const MEDIA_INSPECT = token<MediaInspectRequest, MediaInspectResult, "media.inspect">("media.inspect");

// UI Tokens
export const UI_RENDER = token<UIRenderRequest, UIRenderResult, "ui.render">("ui.render");

// Model Tokens
export const MODEL_GENERATE = token<ModelGenerateRequest, ModelGenerateResponse, "model.generate">("model.generate");
