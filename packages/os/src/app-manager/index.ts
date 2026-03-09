// Core exports
export { AppManager } from "./manager.js";

// Type exports
export type {
	AppInstallRequest,
	AppInstallDeltaReport,
	AppInstallReportState,
	AppInstallRollbackRequest,
	AppUpgradeRequest,
	AppInstallV1Request,
	AppSetStateRequest,
	AppManageRequest,
	AppStartRequest,
	AppListRequest,
	AppServiceHooks,
	AppPageRenderer,
	AppPageRenderContext,
	AppPageSystemRuntime,
	AppPageRenderInput,
	PageResult,
	Page,
	RouteRenderRequest,
	RouteRenderResponse,
	AppStartResponse,
	RuntimeToolsValidateRequest,
	RuntimeToolsValidateResponse,
	RuntimeRiskConfirmRequest,
	RuntimeRiskConfirmResponse,
	RollbackSnapshot,
	RollbackSnapshotEntry,
	ExportedRollbackState,
	ImportRollbackStateInput,
} from "./types.js";

// Re-export types from sub-modules
export type { AppManifest, AppManifestV1, AppPageEntry } from "./manifest.js";
export type { AppLifecycleState } from "./lifecycle.js";
export type { AppQuota } from "./quota.js";

// Service factories - Install
export {
	executeAppInstall,
	AppInstallOSService,
	createAppInstallService,
	AppInstallV1OSService,
	createAppInstallV1Service,
} from "./services/index.js";

// Service factories - Rollback
export {
	executeAppInstallRollback,
	AppInstallRollbackOSService,
	createAppInstallRollbackService,
} from "./services/index.js";

// Service factories - Upgrade
export {
	executeAppUpgrade,
	AppUpgradeOSService,
	createAppUpgradeService,
} from "./services/index.js";

// Service factories - Uninstall
export {
	executeAppUninstall,
	AppUninstallOSService,
	createAppUninstallService,
} from "./services/index.js";

// Service factories - State
export {
	AppSetStateOSService,
	createAppSetStateService,
	AppDisableOSService,
	createAppDisableService,
	AppEnableOSService,
	createAppEnableService,
} from "./services/index.js";

// Service factories - List
export {
	AppListOSService,
	createAppListService,
} from "./services/index.js";

// Service factories - Manage (runtime validation)
export {
	validateRuntimeTools,
	RuntimeToolsValidateOSService,
	createRuntimeToolsValidateService,
	confirmRuntimeRisk,
	RuntimeRiskConfirmOSService,
	createRuntimeRiskConfirmService,
} from "./services/index.js";

// Service factories - Render
export {
	AppPageRenderOSService,
	createAppPageRenderService,
	RenderOSService,
	createRenderService,
} from "./services/index.js";

// Service factories - Start
export {
	executeAppStart,
	AppStartOSService,
	createAppStartService,
} from "./services/index.js";

// Rollback utilities
export {
	RollbackManager,
	validateRollbackSnapshot,
	validateInstallReportState,
	MAX_ROLLBACK_SNAPSHOTS_PER_APP,
	DEFAULT_ROLLBACK_TTL_MS,
} from "./rollback.js";
