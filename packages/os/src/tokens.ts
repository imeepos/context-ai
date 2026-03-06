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
} from "./app-manager/index.js";
import type { AppPageEntry } from "./app-manager/manifest.js";
import type {
    FileEditRequest,
    FileFindRequest,
    FileGrepRequest,
    FileListRequest,
    FileReadRequest,
    FileWriteRequest,
} from "./file-service/index.js";
import type { HostAdapterRequest } from "./host-adapter/index.js";
import type { MediaInspectRequest, MediaInspectResult } from "./media-service/index.js";
import type { ModelGenerateRequest, ModelGenerateResponse } from "./model-service/index.js";
import type { NetRequest, NetResponse } from "./net-service/index.js";
import type {
    MuteTopicRequest,
    NotificationAckAllRequest,
    NotificationAckRequest,
    NotificationChannelsConfig,
    NotificationCleanupRequest,
    NotificationListRequest,
    NotificationMuteRecord,
    NotificationPolicyPatch,
    NotificationRecord,
    NotificationStats,
    NotifyRequest,
} from "./notification-service/index.js";
import type { AppPackage, PackageInstallRequest } from "./package-service/index.js";
import type {
    PlannerComposeToolsRequest,
    PlannerComposeToolsResponse,
    PlannerSelectAppsRequest,
    PlannerSelectAppsResponse,
    RunnerExecutePlanRequest,
    RunnerExecutePlanResponse,
} from "./planner/index.js";
import type {
    ShellEnvListRequest,
    ShellEnvSetRequest,
    ShellEnvUnsetRequest,
    ShellExecuteRequest,
    ShellExecutionResult,
} from "./shell-service/index.js";
import type { RedactRequest } from "./security-service/index.js";
import type {
    CancelTaskRequest,
    ClearSchedulerFailuresRequest,
    ListTasksRequest,
    ReplaySchedulerFailureRequest,
    ScheduleIntervalRequest,
    ScheduleOnceRequest,
    SchedulerFailureRecord,
    SchedulerPersistedTask,
} from "./scheduler-service/index.js";
import type { StoreGetRequest, StoreSetRequest, StoreValue } from "./store-service/index.js";
import type {
    TaskDecomposeRequest,
    TaskDecomposeResponse,
    TaskLoopRequest,
    TaskLoopResponse,
    TaskSubmitRequest,
    TaskSubmitResponse,
} from "./task-runtime/index.js";
import type { UIRenderRequest, UIRenderResult } from "./ui-service/index.js";
import type * as SystemService from "./system-service/index.js";
import type {
    OSService,
    ServiceRequest,
    ServiceResponse,
    Token,
} from "./types/os.js";

export type { Token } from "./types/os.js";



export const token =
    <Request, Response, Name extends string>(name: Name): Token<Request, Response, Name> =>
        name as Token<Request, Response, Name>;

type RequestOf<TFactory extends (...args: never[]) => OSService<unknown, unknown, string>> = ServiceRequest<ReturnType<TFactory>>;
type ResponseOf<TFactory extends (...args: never[]) => OSService<unknown, unknown, string>> = ServiceResponse<ReturnType<TFactory>>;


export interface FileReadResponse {
    content: string;
}

export interface FileWriteResponse {
    ok: true;
}

export interface FileListResponse {
    entries: string[];
}

export interface FileFindResponse {
    paths: string[];
}

export interface FileGrepMatch {
    line: number;
    text: string;
}

export interface FileGrepResponse {
    matches: FileGrepMatch[];
}

export interface FileEditResponse {
    changed: boolean;
}

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

export interface ShellAckResponse {
    ok: true;
}

export interface ShellEnvListResponse {
    env: NodeJS.ProcessEnv;
}

export interface StoreSetResponse {
    ok: true;
}

export interface StoreGetResponse {
    value: StoreValue | undefined;
}

export interface SecurityRedactResponse {
    output: string;
}

export interface SchedulerCancelResponse {
    cancelled: boolean;
}

export interface SchedulerListResponse {
    taskIds: string[];
}

export interface SchedulerScheduleResponse {
    scheduled: true;
}

export interface SchedulerStateExportResponse {
    tasks: SchedulerPersistedTask[];
    failures: SchedulerFailureRecord[];
}

export interface SchedulerStateImportRequest {
    tasks?: SchedulerPersistedTask[];
    failures?: SchedulerFailureRecord[];
}

export interface SchedulerStateImportResponse {
    restoredTasks: number;
    restoredFailures: number;
}

export interface SchedulerStatePersistResponse {
    persisted: boolean;
    tasks: number;
    failures: number;
}

export interface SchedulerStateRecoverResponse {
    recovered: boolean;
    restoredTasks: number;
    restoredFailures: number;
}

export interface SchedulerFailuresClearResponse {
    cleared: number;
}

export interface SchedulerFailuresReplayResponse {
    replayed: boolean;
}

export interface NotificationSendResponse {
    sent: boolean;
}

export interface NotificationListResponse {
    notifications: NotificationRecord[];
}

export interface NotificationMuteResponse {
    muted: true;
}

export interface NotificationUnmuteRequest {
    topic: string;
}

export interface NotificationUnmuteResponse {
    unmuted: boolean;
}

export interface NotificationMuteListResponse {
    mutes: NotificationMuteRecord[];
}

export interface NotificationStatsResponse {
    stats: NotificationStats;
}

export interface NotificationAckResponse {
    acknowledged: number;
}

export interface NotificationCleanupResponse {
    notifications: number;
    mutes: number;
}

export interface NotificationPolicyResponse {
    policy: {
        dedupeWindowMs: number;
        rateLimit?: {
            limit: number;
            windowMs: number;
        };
        retentionLimit?: number;
    };
}

export interface NotificationChannelConfigureResponse {
    configured: string[];
}

export interface NotificationChannelStatsResponse {
    channels: Record<
        string,
        {
            success: number;
            failure: number;
            retried: number;
        }
    >;
}

export interface PackageInstallResponse {
    ok: true;
}

export interface PackageListResponse {
    packages: AppPackage[];
}

export interface HostExecuteResponse {
    result: unknown;
}

export const FILE_READ = token<
    FileReadRequest,
    FileReadResponse,
    "file.read"
>("file.read");

export const FILE_WRITE = token<
    FileWriteRequest,
    FileWriteResponse,
    "file.write"
>("file.write");

export const FILE_LIST = token<
    FileListRequest,
    FileListResponse,
    "file.list"
>("file.list");

export const FILE_FIND = token<
    FileFindRequest,
    FileFindResponse,
    "file.find"
>("file.find");

export const FILE_GREP = token<
    FileGrepRequest,
    FileGrepResponse,
    "file.grep"
>("file.grep");

export const FILE_EDIT = token<
    FileEditRequest,
    FileEditResponse,
    "file.edit"
>("file.edit");

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

export const RUNTIME_TOOLS_VALIDATE = token<RuntimeToolsValidateRequest, RuntimeToolsValidateResponse, "runtime.tools.validate">(
    "runtime.tools.validate",
);

export const RUNTIME_RISK_CONFIRM = token<RuntimeRiskConfirmRequest, RuntimeRiskConfirmResponse, "runtime.risk.confirm">("runtime.risk.confirm");

export const SHELL_EXECUTE = token<
    ShellExecuteRequest,
    ShellExecutionResult,
    "shell.execute"
>("shell.execute");

export const SHELL_ENV_SET = token<
    ShellEnvSetRequest,
    ShellAckResponse,
    "shell.env.set"
>("shell.env.set");

export const SHELL_ENV_UNSET = token<
    ShellEnvUnsetRequest,
    ShellAckResponse,
    "shell.env.unset"
>("shell.env.unset");

export const SHELL_ENV_LIST = token<
    ShellEnvListRequest,
    ShellEnvListResponse,
    "shell.env.list"
>("shell.env.list");

export const STORE_SET = token<
    StoreSetRequest,
    StoreSetResponse,
    "store.set"
>("store.set");

export const STORE_GET = token<
    StoreGetRequest,
    StoreGetResponse,
    "store.get"
>("store.get");

export const NET_REQUEST = token<
    NetRequest,
    NetResponse,
    "net.request"
>("net.request");

export const TASK_SUBMIT = token<
    TaskSubmitRequest,
    TaskSubmitResponse,
    "task.submit"
>("task.submit");

export const TASK_DECOMPOSE = token<
    TaskDecomposeRequest,
    TaskDecomposeResponse,
    "task.decompose"
>("task.decompose");

export const TASK_LOOP = token<
    TaskLoopRequest,
    TaskLoopResponse,
    "task.loop"
>("task.loop");

export const PLANNER_SELECT_APPS = token<PlannerSelectAppsRequest, PlannerSelectAppsResponse, "planner.selectApps">("planner.selectApps");

export const PLANNER_COMPOSE_TOOLS = token<PlannerComposeToolsRequest, PlannerComposeToolsResponse, "planner.composeTools">(
    "planner.composeTools",
);

export const RUNNER_EXECUTE_PLAN = token<RunnerExecutePlanRequest, RunnerExecutePlanResponse, "runner.executePlan">("runner.executePlan");

export const SECURITY_REDACT = token<RedactRequest, SecurityRedactResponse, "security.redact">("security.redact");

export const SCHEDULER_CANCEL = token<CancelTaskRequest, SchedulerCancelResponse, "scheduler.cancel">("scheduler.cancel");

export const SCHEDULER_LIST = token<ListTasksRequest, SchedulerListResponse, "scheduler.list">("scheduler.list");

export const SCHEDULER_SCHEDULE_ONCE = token<ScheduleOnceRequest, SchedulerScheduleResponse, "scheduler.scheduleOnce">("scheduler.scheduleOnce");

export const SCHEDULER_SCHEDULE_INTERVAL = token<ScheduleIntervalRequest, SchedulerScheduleResponse, "scheduler.scheduleInterval">(
    "scheduler.scheduleInterval",
);

export const SCHEDULER_STATE_EXPORT = token<Record<string, never>, SchedulerStateExportResponse, "scheduler.state.export">(
    "scheduler.state.export",
);

export const SCHEDULER_STATE_IMPORT = token<SchedulerStateImportRequest, SchedulerStateImportResponse, "scheduler.state.import">(
    "scheduler.state.import",
);

export const SCHEDULER_STATE_PERSIST = token<Record<string, never>, SchedulerStatePersistResponse, "scheduler.state.persist">(
    "scheduler.state.persist",
);

export const SCHEDULER_STATE_RECOVER = token<Record<string, never>, SchedulerStateRecoverResponse, "scheduler.state.recover">(
    "scheduler.state.recover",
);

export const SCHEDULER_FAILURES_CLEAR = token<ClearSchedulerFailuresRequest, SchedulerFailuresClearResponse, "scheduler.failures.clear">(
    "scheduler.failures.clear",
);

export const SCHEDULER_FAILURES_REPLAY = token<ReplaySchedulerFailureRequest, SchedulerFailuresReplayResponse, "scheduler.failures.replay">(
    "scheduler.failures.replay",
);

export const NOTIFICATION_SEND = token<NotifyRequest, NotificationSendResponse, "notification.send">("notification.send");

export const NOTIFICATION_LIST = token<NotificationListRequest, NotificationListResponse, "notification.list">("notification.list");

export const NOTIFICATION_MUTE = token<MuteTopicRequest, NotificationMuteResponse, "notification.mute">("notification.mute");

export const NOTIFICATION_UNMUTE = token<NotificationUnmuteRequest, NotificationUnmuteResponse, "notification.unmute">(
    "notification.unmute",
);

export const NOTIFICATION_MUTE_LIST = token<Record<string, never>, NotificationMuteListResponse, "notification.mute.list">(
    "notification.mute.list",
);

export const NOTIFICATION_STATS = token<Record<string, never>, NotificationStatsResponse, "notification.stats">(
    "notification.stats",
);

export const NOTIFICATION_ACK = token<NotificationAckRequest, NotificationAckResponse, "notification.ack">("notification.ack");

export const NOTIFICATION_ACK_ALL = token<NotificationAckAllRequest, NotificationAckResponse, "notification.ackAll">(
    "notification.ackAll",
);

export const NOTIFICATION_CLEANUP = token<NotificationCleanupRequest, NotificationCleanupResponse, "notification.cleanup">(
    "notification.cleanup",
);

export const NOTIFICATION_POLICY_UPDATE = token<NotificationPolicyPatch, NotificationPolicyResponse, "notification.policy.update">(
    "notification.policy.update",
);

export const NOTIFICATION_CHANNEL_CONFIGURE = token<NotificationChannelsConfig, NotificationChannelConfigureResponse, "notification.channel.configure">(
    "notification.channel.configure",
);

export const NOTIFICATION_CHANNEL_STATS = token<Record<string, never>, NotificationChannelStatsResponse, "notification.channel.stats">(
    "notification.channel.stats",
);

export const MODEL_GENERATE = token<ModelGenerateRequest, ModelGenerateResponse, "model.generate">("model.generate");

export const PACKAGE_INSTALL = token<PackageInstallRequest, PackageInstallResponse, "package.install">("package.install");

export const PACKAGE_LIST = token<Record<string, never>, PackageListResponse, "package.list">("package.list");

export const HOST_EXECUTE = token<HostAdapterRequest, HostExecuteResponse, "host.execute">("host.execute");

export const MEDIA_INSPECT = token<MediaInspectRequest, MediaInspectResult, "media.inspect">("media.inspect");

export const UI_RENDER = token<UIRenderRequest, UIRenderResult, "ui.render">("ui.render");

export const SYSTEM_HEALTH = token<RequestOf<typeof SystemService.createSystemHealthService>, ResponseOf<typeof SystemService.createSystemHealthService>, "system.health">("system.health");
export const SYSTEM_DEPENDENCIES = token<RequestOf<typeof SystemService.createSystemDependenciesService>, ResponseOf<typeof SystemService.createSystemDependenciesService>, "system.dependencies">("system.dependencies");
export const SYSTEM_ROUTES = token<RequestOf<typeof SystemService.createSystemRoutesService>, ResponseOf<typeof SystemService.createSystemRoutesService>, "system.routes">("system.routes");
export const SYSTEM_ROUTES_STATS = token<RequestOf<typeof SystemService.createSystemRoutesStatsService>, ResponseOf<typeof SystemService.createSystemRoutesStatsService>, "system.routes.stats">("system.routes.stats");
export const SYSTEM_APP_INSTALL_REPORT = token<RequestOf<typeof SystemService.createSystemAppInstallReportService>, ResponseOf<typeof SystemService.createSystemAppInstallReportService>, "system.app.install.report">("system.app.install.report");
export const SYSTEM_APP_DELTA = token<RequestOf<typeof SystemService.createSystemAppDeltaService>, ResponseOf<typeof SystemService.createSystemAppDeltaService>, "system.app.delta">("system.app.delta");
export const SYSTEM_APP_ROLLBACK_STATE_EXPORT = token<RequestOf<typeof SystemService.createSystemAppRollbackStateExportService>, ResponseOf<typeof SystemService.createSystemAppRollbackStateExportService>, "system.app.rollback.state.export">("system.app.rollback.state.export");
export const SYSTEM_APP_ROLLBACK_STATE_IMPORT = token<RequestOf<typeof SystemService.createSystemAppRollbackStateImportService>, ResponseOf<typeof SystemService.createSystemAppRollbackStateImportService>, "system.app.rollback.state.import">("system.app.rollback.state.import");
export const SYSTEM_APP_ROLLBACK_STATE_PERSIST = token<RequestOf<typeof SystemService.createSystemAppRollbackStatePersistService>, ResponseOf<typeof SystemService.createSystemAppRollbackStatePersistService>, "system.app.rollback.state.persist">("system.app.rollback.state.persist");
export const SYSTEM_APP_ROLLBACK_STATE_RECOVER = token<RequestOf<typeof SystemService.createSystemAppRollbackStateRecoverService>, ResponseOf<typeof SystemService.createSystemAppRollbackStateRecoverService>, "system.app.rollback.state.recover">("system.app.rollback.state.recover");
export const SYSTEM_APP_ROLLBACK_STATS = token<RequestOf<typeof SystemService.createSystemAppRollbackStatsService>, ResponseOf<typeof SystemService.createSystemAppRollbackStatsService>, "system.app.rollback.stats">("system.app.rollback.stats");
export const SYSTEM_APP_ROLLBACK_GC = token<RequestOf<typeof SystemService.createSystemAppRollbackGCService>, ResponseOf<typeof SystemService.createSystemAppRollbackGCService>, "system.app.rollback.gc">("system.app.rollback.gc");
export const SYSTEM_APP_ROLLBACK_AUDIT = token<RequestOf<typeof SystemService.createSystemAppRollbackAuditService>, ResponseOf<typeof SystemService.createSystemAppRollbackAuditService>, "system.app.rollback.audit">("system.app.rollback.audit");
export const SYSTEM_METRICS = token<RequestOf<typeof SystemService.createSystemMetricsService>, ResponseOf<typeof SystemService.createSystemMetricsService>, "system.metrics">("system.metrics");
export const SYSTEM_AUDIT = token<RequestOf<typeof SystemService.createSystemAuditService>, ResponseOf<typeof SystemService.createSystemAuditService>, "system.audit">("system.audit");
export const SYSTEM_GOVERNANCE_STATE_EXPORT = token<RequestOf<typeof SystemService.createSystemGovernanceStateExportService>, ResponseOf<typeof SystemService.createSystemGovernanceStateExportService>, "system.governance.state.export">("system.governance.state.export");
export const SYSTEM_GOVERNANCE_STATE_IMPORT = token<RequestOf<typeof SystemService.createSystemGovernanceStateImportService>, ResponseOf<typeof SystemService.createSystemGovernanceStateImportService>, "system.governance.state.import">("system.governance.state.import");
export const SYSTEM_GOVERNANCE_STATE_PERSIST = token<RequestOf<typeof SystemService.createSystemGovernanceStatePersistService>, ResponseOf<typeof SystemService.createSystemGovernanceStatePersistService>, "system.governance.state.persist">("system.governance.state.persist");
export const SYSTEM_GOVERNANCE_STATE_RECOVER = token<RequestOf<typeof SystemService.createSystemGovernanceStateRecoverService>, ResponseOf<typeof SystemService.createSystemGovernanceStateRecoverService>, "system.governance.state.recover">("system.governance.state.recover");
export const SYSTEM_AUDIT_KEYS_ROTATE = token<RequestOf<typeof SystemService.createSystemAuditKeysRotateService>, ResponseOf<typeof SystemService.createSystemAuditKeysRotateService>, "system.audit.keys.rotate">("system.audit.keys.rotate");
export const SYSTEM_AUDIT_KEYS_LIST = token<RequestOf<typeof SystemService.createSystemAuditKeysListService>, ResponseOf<typeof SystemService.createSystemAuditKeysListService>, "system.audit.keys.list">("system.audit.keys.list");
export const SYSTEM_AUDIT_KEYS_ACTIVATE = token<RequestOf<typeof SystemService.createSystemAuditKeysActivateService>, ResponseOf<typeof SystemService.createSystemAuditKeysActivateService>, "system.audit.keys.activate">("system.audit.keys.activate");
export const SYSTEM_TOPOLOGY = token<RequestOf<typeof SystemService.createSystemTopologyService>, ResponseOf<typeof SystemService.createSystemTopologyService>, "system.topology">("system.topology");
export const SYSTEM_EVENTS = token<RequestOf<typeof SystemService.createSystemEventsService>, ResponseOf<typeof SystemService.createSystemEventsService>, "system.events">("system.events");
export const SYSTEM_CAPABILITIES = token<RequestOf<typeof SystemService.createSystemCapabilitiesService>, ResponseOf<typeof SystemService.createSystemCapabilitiesService>, "system.capabilities">("system.capabilities");
export const SYSTEM_CAPABILITIES_LIST = token<RequestOf<typeof SystemService.createSystemCapabilitiesListService>, ResponseOf<typeof SystemService.createSystemCapabilitiesListService>, "system.capabilities.list">("system.capabilities.list");
export const SYSTEM_POLICY = token<RequestOf<typeof SystemService.createSystemPolicyService>, ResponseOf<typeof SystemService.createSystemPolicyService>, "system.policy">("system.policy");
export const SYSTEM_POLICY_EVALUATE = token<RequestOf<typeof SystemService.createSystemPolicyEvaluateService>, ResponseOf<typeof SystemService.createSystemPolicyEvaluateService>, "system.policy.evaluate">("system.policy.evaluate");
export const SYSTEM_POLICY_UPDATE = token<RequestOf<typeof SystemService.createSystemPolicyUpdateService>, ResponseOf<typeof SystemService.createSystemPolicyUpdateService>, "system.policy.update">("system.policy.update");
export const SYSTEM_POLICY_VERSION_CREATE = token<RequestOf<typeof SystemService.createSystemPolicyVersionCreateService>, ResponseOf<typeof SystemService.createSystemPolicyVersionCreateService>, "system.policy.version.create">("system.policy.version.create");
export const SYSTEM_POLICY_VERSION_LIST = token<RequestOf<typeof SystemService.createSystemPolicyVersionListService>, ResponseOf<typeof SystemService.createSystemPolicyVersionListService>, "system.policy.version.list">("system.policy.version.list");
export const SYSTEM_POLICY_VERSION_ROLLBACK = token<RequestOf<typeof SystemService.createSystemPolicyVersionRollbackService>, ResponseOf<typeof SystemService.createSystemPolicyVersionRollbackService>, "system.policy.version.rollback">("system.policy.version.rollback");
export const SYSTEM_POLICY_SIMULATE_BATCH = token<RequestOf<typeof SystemService.createSystemPolicySimulateBatchService>, ResponseOf<typeof SystemService.createSystemPolicySimulateBatchService>, "system.policy.simulate.batch">("system.policy.simulate.batch");
export const SYSTEM_POLICY_GUARD_APPLY = token<RequestOf<typeof SystemService.createSystemPolicyGuardApplyService>, ResponseOf<typeof SystemService.createSystemPolicyGuardApplyService>, "system.policy.guard.apply">("system.policy.guard.apply");
export const SYSTEM_NET_CIRCUIT = token<RequestOf<typeof SystemService.createSystemNetCircuitService>, ResponseOf<typeof SystemService.createSystemNetCircuitService>, "system.net.circuit">("system.net.circuit");
export const SYSTEM_NET_CIRCUIT_RESET = token<RequestOf<typeof SystemService.createSystemNetCircuitResetService>, ResponseOf<typeof SystemService.createSystemNetCircuitResetService>, "system.net.circuit.reset">("system.net.circuit.reset");
export const SYSTEM_SCHEDULER_FAILURES = token<RequestOf<typeof SystemService.createSystemSchedulerFailuresService>, ResponseOf<typeof SystemService.createSystemSchedulerFailuresService>, "system.scheduler.failures">("system.scheduler.failures");
export const SYSTEM_ALERTS = token<RequestOf<typeof SystemService.createSystemAlertsService>, ResponseOf<typeof SystemService.createSystemAlertsService>, "system.alerts">("system.alerts");
export const SYSTEM_ALERTS_CLEAR = token<RequestOf<typeof SystemService.createSystemAlertsClearService>, ResponseOf<typeof SystemService.createSystemAlertsClearService>, "system.alerts.clear">("system.alerts.clear");
export const SYSTEM_ALERTS_EXPORT = token<RequestOf<typeof SystemService.createSystemAlertsExportService>, ResponseOf<typeof SystemService.createSystemAlertsExportService>, "system.alerts.export">("system.alerts.export");
export const SYSTEM_ALERTS_STATS = token<RequestOf<typeof SystemService.createSystemAlertsStatsService>, ResponseOf<typeof SystemService.createSystemAlertsStatsService>, "system.alerts.stats">("system.alerts.stats");
export const SYSTEM_ALERTS_TOPICS = token<RequestOf<typeof SystemService.createSystemAlertsTopicsService>, ResponseOf<typeof SystemService.createSystemAlertsTopicsService>, "system.alerts.topics">("system.alerts.topics");
export const SYSTEM_ALERTS_UNACKED = token<RequestOf<typeof SystemService.createSystemAlertsUnackedService>, ResponseOf<typeof SystemService.createSystemAlertsUnackedService>, "system.alerts.unacked">("system.alerts.unacked");
export const SYSTEM_ALERTS_POLICY = token<RequestOf<typeof SystemService.createSystemAlertsPolicyService>, ResponseOf<typeof SystemService.createSystemAlertsPolicyService>, "system.alerts.policy">("system.alerts.policy");
export const SYSTEM_ALERTS_TRENDS = token<RequestOf<typeof SystemService.createSystemAlertsTrendsService>, ResponseOf<typeof SystemService.createSystemAlertsTrendsService>, "system.alerts.trends">("system.alerts.trends");
export const SYSTEM_ALERTS_SLO = token<RequestOf<typeof SystemService.createSystemAlertsSLOService>, ResponseOf<typeof SystemService.createSystemAlertsSLOService>, "system.alerts.slo">("system.alerts.slo");
export const SYSTEM_ALERTS_INCIDENTS = token<RequestOf<typeof SystemService.createSystemAlertsIncidentsService>, ResponseOf<typeof SystemService.createSystemAlertsIncidentsService>, "system.alerts.incidents">("system.alerts.incidents");
export const SYSTEM_ALERTS_DIGEST = token<RequestOf<typeof SystemService.createSystemAlertsDigestService>, ResponseOf<typeof SystemService.createSystemAlertsDigestService>, "system.alerts.digest">("system.alerts.digest");
export const SYSTEM_ALERTS_REPORT = token<RequestOf<typeof SystemService.createSystemAlertsReportService>, ResponseOf<typeof SystemService.createSystemAlertsReportService>, "system.alerts.report">("system.alerts.report");
export const SYSTEM_ALERTS_REPORT_COMPACT = token<RequestOf<typeof SystemService.createSystemAlertsReportCompactService>, ResponseOf<typeof SystemService.createSystemAlertsReportCompactService>, "system.alerts.report.compact">("system.alerts.report.compact");
export const SYSTEM_ALERTS_FLAPPING = token<RequestOf<typeof SystemService.createSystemAlertsFlappingService>, ResponseOf<typeof SystemService.createSystemAlertsFlappingService>, "system.alerts.flapping">("system.alerts.flapping");
export const SYSTEM_ALERTS_TIMELINE = token<RequestOf<typeof SystemService.createSystemAlertsTimelineService>, ResponseOf<typeof SystemService.createSystemAlertsTimelineService>, "system.alerts.timeline">("system.alerts.timeline");
export const SYSTEM_ALERTS_HOTSPOTS = token<RequestOf<typeof SystemService.createSystemAlertsHotspotsService>, ResponseOf<typeof SystemService.createSystemAlertsHotspotsService>, "system.alerts.hotspots">("system.alerts.hotspots");
export const SYSTEM_ALERTS_RECOMMENDATIONS = token<RequestOf<typeof SystemService.createSystemAlertsRecommendationsService>, ResponseOf<typeof SystemService.createSystemAlertsRecommendationsService>, "system.alerts.recommendations">("system.alerts.recommendations");
export const SYSTEM_ALERTS_FEED = token<RequestOf<typeof SystemService.createSystemAlertsFeedService>, ResponseOf<typeof SystemService.createSystemAlertsFeedService>, "system.alerts.feed">("system.alerts.feed");
export const SYSTEM_ALERTS_BACKLOG = token<RequestOf<typeof SystemService.createSystemAlertsBacklogService>, ResponseOf<typeof SystemService.createSystemAlertsBacklogService>, "system.alerts.backlog">("system.alerts.backlog");
export const SYSTEM_ALERTS_BREACHES = token<RequestOf<typeof SystemService.createSystemAlertsBreachesService>, ResponseOf<typeof SystemService.createSystemAlertsBreachesService>, "system.alerts.breaches">("system.alerts.breaches");
export const SYSTEM_ALERTS_HEALTH = token<RequestOf<typeof SystemService.createSystemAlertsHealthService>, ResponseOf<typeof SystemService.createSystemAlertsHealthService>, "system.alerts.health">("system.alerts.health");
export const SYSTEM_ALERTS_AUTO_REMEDIATE_PLAN = token<RequestOf<typeof SystemService.createSystemAlertsAutoRemediatePlanService>, ResponseOf<typeof SystemService.createSystemAlertsAutoRemediatePlanService>, "system.alerts.auto-remediate.plan">("system.alerts.auto-remediate.plan");
export const SYSTEM_ALERTS_AUTO_REMEDIATE_EXECUTE = token<RequestOf<typeof SystemService.createSystemAlertsAutoRemediateExecuteService>, ResponseOf<typeof SystemService.createSystemAlertsAutoRemediateExecuteService>, "system.alerts.auto-remediate.execute">("system.alerts.auto-remediate.execute");
export const SYSTEM_ALERTS_AUTO_REMEDIATE_AUDIT = token<RequestOf<typeof SystemService.createSystemAlertsAutoRemediateAuditService>, ResponseOf<typeof SystemService.createSystemAlertsAutoRemediateAuditService>, "system.alerts.auto-remediate.audit">("system.alerts.auto-remediate.audit");
export const SYSTEM_SLO = token<RequestOf<typeof SystemService.createSystemSLOService>, ResponseOf<typeof SystemService.createSystemSLOService>, "system.slo">("system.slo");
export const SYSTEM_SLO_RULES_UPSERT = token<RequestOf<typeof SystemService.createSystemSLORulesUpsertService>, ResponseOf<typeof SystemService.createSystemSLORulesUpsertService>, "system.slo.rules.upsert">("system.slo.rules.upsert");
export const SYSTEM_SLO_RULES_LIST = token<RequestOf<typeof SystemService.createSystemSLORulesListService>, ResponseOf<typeof SystemService.createSystemSLORulesListService>, "system.slo.rules.list">("system.slo.rules.list");
export const SYSTEM_SLO_RULES_EVALUATE = token<RequestOf<typeof SystemService.createSystemSLORulesEvaluateService>, ResponseOf<typeof SystemService.createSystemSLORulesEvaluateService>, "system.slo.rules.evaluate">("system.slo.rules.evaluate");
export const SYSTEM_AUDIT_EXPORT = token<RequestOf<typeof SystemService.createSystemAuditExportService>, ResponseOf<typeof SystemService.createSystemAuditExportService>, "system.audit.export">("system.audit.export");
export const SYSTEM_QUOTA = token<RequestOf<typeof SystemService.createSystemQuotaService>, ResponseOf<typeof SystemService.createSystemQuotaService>, "system.quota">("system.quota");
export const SYSTEM_QUOTA_ADJUST = token<RequestOf<typeof SystemService.createSystemQuotaAdjustService>, ResponseOf<typeof SystemService.createSystemQuotaAdjustService>, "system.quota.adjust">("system.quota.adjust");
export const SYSTEM_QUOTA_POLICY_UPSERT = token<RequestOf<typeof SystemService.createSystemQuotaPolicyUpsertService>, ResponseOf<typeof SystemService.createSystemQuotaPolicyUpsertService>, "system.quota.policy.upsert">("system.quota.policy.upsert");
export const SYSTEM_QUOTA_POLICY_LIST = token<RequestOf<typeof SystemService.createSystemQuotaPolicyListService>, ResponseOf<typeof SystemService.createSystemQuotaPolicyListService>, "system.quota.policy.list">("system.quota.policy.list");
export const SYSTEM_QUOTA_POLICY_APPLY = token<RequestOf<typeof SystemService.createSystemQuotaPolicyApplyService>, ResponseOf<typeof SystemService.createSystemQuotaPolicyApplyService>, "system.quota.policy.apply">("system.quota.policy.apply");
export const SYSTEM_QUOTA_HOTSPOTS = token<RequestOf<typeof SystemService.createSystemQuotaHotspotsService>, ResponseOf<typeof SystemService.createSystemQuotaHotspotsService>, "system.quota.hotspots">("system.quota.hotspots");
export const SYSTEM_QUOTA_HOTSPOTS_ISOLATE = token<RequestOf<typeof SystemService.createSystemQuotaHotspotsIsolateService>, ResponseOf<typeof SystemService.createSystemQuotaHotspotsIsolateService>, "system.quota.hotspots.isolate">("system.quota.hotspots.isolate");
export const SYSTEM_CHAOS_RUN = token<RequestOf<typeof SystemService.createSystemChaosRunService>, ResponseOf<typeof SystemService.createSystemChaosRunService>, "system.chaos.run">("system.chaos.run");
export const SYSTEM_CHAOS_BASELINE_CAPTURE = token<RequestOf<typeof SystemService.createSystemChaosBaselineCaptureService>, ResponseOf<typeof SystemService.createSystemChaosBaselineCaptureService>, "system.chaos.baseline.capture">("system.chaos.baseline.capture");
export const SYSTEM_CHAOS_BASELINE_VERIFY = token<RequestOf<typeof SystemService.createSystemChaosBaselineVerifyService>, ResponseOf<typeof SystemService.createSystemChaosBaselineVerifyService>, "system.chaos.baseline.verify">("system.chaos.baseline.verify");
export const SYSTEM_SNAPSHOT = token<RequestOf<typeof SystemService.createSystemSnapshotService>, ResponseOf<typeof SystemService.createSystemSnapshotService>, "system.snapshot">("system.snapshot");
export const SYSTEM_ERRORS = token<RequestOf<typeof SystemService.createSystemErrorsService>, ResponseOf<typeof SystemService.createSystemErrorsService>, "system.errors">("system.errors");
export const SYSTEM_ERRORS_EXPORT = token<RequestOf<typeof SystemService.createSystemErrorsExportService>, ResponseOf<typeof SystemService.createSystemErrorsExportService>, "system.errors.export">("system.errors.export");
export const SYSTEM_ERRORS_KEYS_ROTATE = token<RequestOf<typeof SystemService.createSystemErrorsKeysRotateService>, ResponseOf<typeof SystemService.createSystemErrorsKeysRotateService>, "system.errors.keys.rotate">("system.errors.keys.rotate");
export const SYSTEM_ERRORS_KEYS_LIST = token<RequestOf<typeof SystemService.createSystemErrorsKeysListService>, ResponseOf<typeof SystemService.createSystemErrorsKeysListService>, "system.errors.keys.list">("system.errors.keys.list");
export const SYSTEM_ERRORS_KEYS_ACTIVATE = token<RequestOf<typeof SystemService.createSystemErrorsKeysActivateService>, ResponseOf<typeof SystemService.createSystemErrorsKeysActivateService>, "system.errors.keys.activate">("system.errors.keys.activate");
