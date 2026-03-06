import { isAbsolute, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import {
	AppManager,
	type AppPageRenderInput,
	type AppPageRenderContext,
	type AppPageSystemRuntime,
	type Page,
	createAppDisableService,
	createAppEnableService,
	createAppInstallV1Service,
	createAppInstallService,
	createAppInstallRollbackService,
	createAppListService,
	createAppPageRenderService,
	createRenderService,
	createAppStartService,
	createRuntimeRiskConfirmService,
	createRuntimeToolsValidateService,
	createAppSetStateService,
	createAppUninstallService,
	createAppUpgradeService,
} from "./app-manager/index.js";
import {
	FileService,
	createFileEditService,
	createFileFindService,
	createFileGrepService,
	createFileListService,
	createFileReadService,
	createFileWriteService,
} from "./file-service/index.js";
import { HostAdapterRegistry, createHostAdapterExecuteService } from "./host-adapter/index.js";
import { LLMOSKernel, createLLMOSKernel } from "./kernel/index.js";
import {
	AppAuthorizationGovernor,
	AppQuotaGovernor,
	CompositeResourceGovernor,
	TenantQuotaGovernor,
} from "./kernel/resource-governor.js";
import { MediaService, createMediaInspectService } from "./media-service/index.js";
import { ModelService, createModelGenerateService } from "./model-service/index.js";
import { NetService, createNetRequestService } from "./net-service/index.js";
import {
	NotificationService,
	createNotificationListService,
	createNotificationAckService,
	createNotificationAckAllService,
	createNotificationCleanupService,
	createNotificationChannelConfigureService,
	createNotificationChannelStatsService,
	createNotificationPolicyUpdateService,
	createNotificationMuteListService,
	createNotificationMuteService,
	createNotificationSendService,
	createNotificationStatsService,
	createNotificationUnmuteService,
} from "./notification-service/index.js";
import { PackageService, createPackageInstallService, createPackageListService } from "./package-service/index.js";
import {
	SchedulerService,
	createSchedulerCancelService,
	createSchedulerFailuresClearService,
	createSchedulerFailuresReplayService,
	createSchedulerListService,
	createSchedulerScheduleIntervalService,
	createSchedulerScheduleOnceService,
	createSchedulerStateExportService,
	createSchedulerStateImportService,
	createSchedulerStatePersistService,
	createSchedulerStateRecoverService,
	StoreSchedulerStateAdapter,
} from "./scheduler-service/index.js";
import { SecurityService, createSecurityRedactService } from "./security-service/index.js";
import {
	ShellService,
	createShellEnvListService,
	createShellEnvSetService,
	createShellEnvUnsetService,
	createShellExecuteService,
} from "./shell-service/index.js";
import { StoreService, createStoreGetService, createStoreSetService, type StoreValue } from "./store-service/index.js";
import {
	createSystemTaskManifest,
	createTaskDecomposeService,
	createTaskLoopService,
	createTaskSubmitService,
} from "./task-runtime/index.js";
import {
	createPlannerComposeToolsService,
	createPlannerSelectAppsService,
	createRunnerExecutePlanService,
} from "./planner/index.js";
import {
	createSystemAuditService,
	createSystemAlertsService,
	createSystemAlertsClearService,
	createSystemAlertsExportService,
	createSystemAlertsStatsService,
	createSystemAlertsTopicsService,
	createSystemAlertsUnackedService,
	createSystemAlertsPolicyService,
	createSystemAlertsTrendsService,
	createSystemAlertsSLOService,
	createSystemAlertsIncidentsService,
	createSystemAlertsDigestService,
	createSystemAlertsReportService,
	createSystemAlertsReportCompactService,
	createSystemAlertsFlappingService,
	createSystemAlertsTimelineService,
	createSystemAlertsHotspotsService,
	createSystemAlertsRecommendationsService,
	createSystemAlertsFeedService,
	createSystemAlertsBacklogService,
	createSystemAlertsBreachesService,
	createSystemAlertsHealthService,
	createSystemAlertsAutoRemediatePlanService,
	createSystemAlertsAutoRemediateExecuteService,
	createSystemAlertsAutoRemediateAuditService,
	createSystemCapabilitiesService,
	createSystemCapabilitiesListService,
	createSystemDependenciesService,
	createSystemRoutesService,
	createSystemRoutesStatsService,
	createSystemAppInstallReportService,
	createSystemAppDeltaService,
	createSystemAppRollbackStateExportService,
	createSystemAppRollbackStateImportService,
	createSystemAppRollbackStatePersistService,
	createSystemAppRollbackStateRecoverService,
	createSystemAppRollbackStatsService,
	createSystemAppRollbackGCService,
	createSystemAppRollbackAuditService,
	createSystemErrorsService,
	createSystemErrorsExportService,
	createSystemErrorsKeysRotateService,
	createSystemErrorsKeysListService,
	createSystemErrorsKeysActivateService,
	createSystemEventsService,
	createSystemHealthService,
	createSystemMetricsService,
	createSystemNetCircuitService,
	createSystemNetCircuitResetService,
	createSystemPolicyEvaluateService,
	createSystemPolicyService,
	createSystemSchedulerFailuresService,
	createSystemSnapshotService,
	createSystemPolicyUpdateService,
	createSystemPolicyVersionCreateService,
	createSystemPolicyVersionListService,
	createSystemPolicyVersionRollbackService,
	createSystemPolicySimulateBatchService,
	createSystemPolicyGuardApplyService,
	createSystemSLOService,
	createSystemSLORulesUpsertService,
	createSystemSLORulesListService,
	createSystemSLORulesEvaluateService,
	createSystemAuditExportService,
	createSystemAuditKeysRotateService,
	createSystemAuditKeysListService,
	createSystemAuditKeysActivateService,
	createSystemQuotaService,
	createSystemQuotaAdjustService,
	createSystemQuotaPolicyUpsertService,
	createSystemQuotaPolicyListService,
	createSystemQuotaPolicyApplyService,
	createSystemQuotaHotspotsService,
	createSystemQuotaHotspotsIsolateService,
	createSystemChaosRunService,
	createSystemChaosBaselineCaptureService,
	createSystemChaosBaselineVerifyService,
	createSystemGovernanceStateExportService,
	createSystemGovernanceStateImportService,
	createSystemGovernanceStatePersistService,
	createSystemGovernanceStateRecoverService,
	createSystemTopologyService,
} from "./system-service/index.js";
import {
	APP_DISABLE,
	APP_ENABLE,
	APP_INSTALL,
	APP_INSTALL_ROLLBACK,
	APP_INSTALL_V1,
	APP_LIST,
	APP_PAGE_RENDER,
	APP_START,
	APP_STATE_SET,
	APP_UNINSTALL,
	APP_UPGRADE,
	FILE_EDIT,
	FILE_FIND,
	FILE_GREP,
	FILE_LIST,
	FILE_READ,
	FILE_WRITE,
	HOST_EXECUTE,
	MEDIA_INSPECT,
	MODEL_GENERATE,
	NET_REQUEST,
	NOTIFICATION_ACK,
	NOTIFICATION_ACK_ALL,
	NOTIFICATION_CHANNEL_CONFIGURE,
	NOTIFICATION_CHANNEL_STATS,
	NOTIFICATION_CLEANUP,
	NOTIFICATION_LIST,
	NOTIFICATION_MUTE,
	NOTIFICATION_MUTE_LIST,
	NOTIFICATION_POLICY_UPDATE,
	NOTIFICATION_SEND,
	NOTIFICATION_STATS,
	NOTIFICATION_UNMUTE,
	PACKAGE_INSTALL,
	PACKAGE_LIST,
	PLANNER_COMPOSE_TOOLS,
	PLANNER_SELECT_APPS,
	RENDER,
	RUNTIME_RISK_CONFIRM,
	RUNTIME_TOOLS_VALIDATE,
	SCHEDULER_CANCEL,
	SCHEDULER_FAILURES_CLEAR,
	SCHEDULER_FAILURES_REPLAY,
	SCHEDULER_LIST,
	SCHEDULER_SCHEDULE_INTERVAL,
	SCHEDULER_SCHEDULE_ONCE,
	SCHEDULER_STATE_EXPORT,
	SCHEDULER_STATE_IMPORT,
	SCHEDULER_STATE_PERSIST,
	SCHEDULER_STATE_RECOVER,
	SECURITY_REDACT,
	SHELL_ENV_LIST,
	SHELL_ENV_SET,
	SHELL_ENV_UNSET,
	SHELL_EXECUTE,
	RUNNER_EXECUTE_PLAN,
	STORE_GET,
	STORE_SET,
	TASK_DECOMPOSE,
	TASK_LOOP,
	TASK_SUBMIT,
	UI_RENDER,
} from "./tokens.js";
import * as TOKENS from "./tokens.js";
import type {
	OSService,
	PathPolicyRule,
	ServiceRequest,
	ServiceResponse,
	Token,
} from "./types/os.js";
import { UIService, createUIRenderService } from "./ui-service/index.js";
import { PolicyEngine } from "./kernel/policy-engine.js";

export interface DefaultLLMOS<TTokens extends Record<string, Token<unknown, unknown>> = Record<string, Token<unknown, unknown>>> {
	kernel: LLMOSKernel;
	appManager: AppManager;
	fileService: FileService;
	shellService: ShellService;
	netService: NetService;
	storeService: StoreService;
	securityService: SecurityService;
	schedulerService: SchedulerService;
	notificationService: NotificationService;
	mediaService: MediaService;
	uiService: UIService;
	modelService: ModelService;
	packageService: PackageService;
	hostAdapters: HostAdapterRegistry;
	tenantQuotaGovernor: TenantQuotaGovernor;
	serviceTokens: TTokens;
}

export interface CreateDefaultLLMOSOptions {
	pathPolicy?: PathPolicyRule;
	packageSigningSecret?: string;
	netJournalLimit?: number;
	notificationDedupeWindowMs?: number;
	notificationRateLimit?: {
		limit: number;
		windowMs: number;
	};
	notificationRetentionLimit?: number;
	enabledServices?: Partial<Record<string, boolean>>;
}

type AppPageModule = {
	entryPage?: Page;
	getContext?: Page;
	createContext?: Page;
	default?: Page;
};

export function createDefaultLLMOS(options: CreateDefaultLLMOSOptions = {}) {
	const policy = new PolicyEngine({
		pathRule: options.pathPolicy ?? { allow: [], deny: [] },
	});
	const appManager = new AppManager();
	const tenantQuotaGovernor = new TenantQuotaGovernor();
	const resourceGovernor = new CompositeResourceGovernor([
		new AppAuthorizationGovernor(
			(appId) => appManager.registry.has(appId),
			(appId, permission) => appManager.permissions.has(appId, permission),
			(appId) => appManager.isEnabled(appId),
		),
		new AppQuotaGovernor((appId, delta) => appManager.quota.consume(appId, delta)),
		tenantQuotaGovernor,
	]);
	const kernel = createLLMOSKernel({ policyEngine: policy, resourceGovernor });
	const fileService = new FileService(policy);
	const shellService = new ShellService(policy);
	const securityService = new SecurityService();
	const storeService = new StoreService();
	const netService = new NetService(policy, securityService, async (entry) => {
		const key = "net.journal";
		const journalLimit = options.netJournalLimit ?? 1000;
		const existing = (storeService.get(key) as StoreValue[] | undefined) ?? [];
		const serializedEntry: StoreValue = {
			url: entry.url,
			method: entry.method,
			status: entry.status ?? null,
			success: entry.success,
			appId: entry.appId,
			sessionId: entry.sessionId,
			error: entry.error ?? null,
			timestamp: entry.timestamp,
		};
		const next = [...existing, serializedEntry];
		storeService.set(key, next.slice(-journalLimit));
	});
	const schedulerService = new SchedulerService(
		kernel.events,
		{
			storage: new StoreSchedulerStateAdapter(storeService),
			autoPersist: true,
		},
	);
	const notificationService = new NotificationService(kernel.events, {
		dedupeWindowMs: options.notificationDedupeWindowMs,
		rateLimit: options.notificationRateLimit,
		retentionLimit: options.notificationRetentionLimit,
	});
	const mediaService = new MediaService();
	const uiService = new UIService();
	const modelService = new ModelService();
	const packageService = new PackageService({
		signingSecret: options.packageSigningSecret,
		security: securityService,
	});
	const hostAdapters = new HostAdapterRegistry();
	function executeAppPageService<Request, Response, Name extends string>(
		service: Token<Request, Response, Name>,
		request: Request,
		context: AppPageRenderContext,
	): Promise<Response>;
	function executeAppPageService<Request, Response>(
		service: string,
		request: Request,
		context: AppPageRenderContext,
	): Promise<Response>;
	function executeAppPageService(
		service: string,
		request: unknown,
		context: AppPageRenderContext,
	): Promise<unknown> {
		return kernel.execute(service, request, context);
	}
	const appPageSystemRuntime: AppPageSystemRuntime = {
		execute: executeAppPageService,
		listServices: () => kernel.services.list(),
	};
	const systemTaskPagePath = fileURLToPath(new URL("./task-runtime/system-task.page.js", import.meta.url));
	const systemTaskManifest = createSystemTaskManifest(systemTaskPagePath);
	appManager.install(systemTaskManifest);
	kernel.capabilities.set(systemTaskManifest.id, systemTaskManifest.permissions);
	const appPageRenderer = {
		render: async ({
			page,
			appId,
			context,
		}: AppPageRenderInput) => {
			const resolvedPath = isAbsolute(page.path)
				? page.path
				: resolve(context.workingDirectory, page.path);
			const pageModule = (await import(pathToFileURL(resolvedPath).href)) as AppPageModule;
			const contextFactory: Page | undefined =
				typeof pageModule.entryPage === "function"
					? pageModule.entryPage
					: typeof pageModule.getContext === "function"
						? pageModule.getContext
						: typeof pageModule.createContext === "function"
							? pageModule.createContext
							: typeof pageModule.default === "function"
								? pageModule.default
								: undefined;
			if (!contextFactory) {
				throw new Error(
					`Invalid app page module: ${resolvedPath}. Expected one of exports: entryPage/getContext/createContext/default`,
				);
			}
			const ctpNode = await contextFactory({
				appId,
				page,
				context,
				system: {
					execute: executeAppPageService,
					services: kernel.services.list(),
				}
			});
			const { render: renderCTP } = await import("@context-ai/ctp");
			const rendered = await renderCTP(ctpNode);
			return {
				prompt: rendered.prompt,
				tools: (rendered.tools ?? []).map((tool) => ({
					name: tool.name,
					description: tool.description,
					parameters: tool.parameters,
				})),
				dataViews: (rendered.dataViews ?? []).map((dataView) => ({
					title: dataView.title ?? "Untitled",
					format: dataView.format,
					fields: dataView.fields,
				})),
				metadata: {
					route: page.route,
					path: page.path,
					...Object.fromEntries(
						Object.entries(rendered.metadata ?? {}).map(([key, value]) => [key, String(value)]),
					),
				},
			};
		},
	};

	modelService.register({
		name: "echo",
		generate: async (request) => `echo:${request.prompt}`,
	});

	const isEnabled = (serviceName: string): boolean => options.enabledServices?.[serviceName] ?? true;

	const SERVICES = {
	[FILE_READ]: () => createFileReadService(fileService),
	[FILE_WRITE]: () => createFileWriteService(fileService),
	[FILE_LIST]: () => createFileListService(fileService),
	[FILE_FIND]: () => createFileFindService(fileService),
	[FILE_GREP]: () => createFileGrepService(fileService),
	[FILE_EDIT]: () => createFileEditService(fileService),
	[APP_INSTALL]: () =>
		createAppInstallService(appManager, {
			onInstall: (manifest) => {
				kernel.capabilities.set(manifest.id, manifest.permissions);
			},
		}),
	[APP_INSTALL_ROLLBACK]: () =>
		createAppInstallRollbackService(appManager, {
			onInstall: (manifest) => {
				kernel.capabilities.set(manifest.id, manifest.permissions);
			},
			onUninstall: (appId) => {
				kernel.capabilities.remove(appId);
			},
			onRollback: (input) => {
				kernel.events.publish("system.app.rollback", input);
				notificationService.send({
					topic: "system.app.rollback",
					severity: "warning",
					message: input.uninstalled
						? `app rollback removed ${input.appId} token=${input.rollbackToken}`
						: `app rollback restored ${input.appId}@${input.restoredVersion} token=${input.rollbackToken}`,
				});
			},
		}),
	[APP_INSTALL_V1]: () =>
		createAppInstallV1Service(appManager, securityService, {
			onInstall: (manifest) => {
				kernel.capabilities.set(manifest.id, manifest.permissions);
			},
		}),
	[APP_STATE_SET]: () => createAppSetStateService(appManager),
	[APP_LIST]: () => createAppListService(appManager),
	[APP_PAGE_RENDER]: () =>
		createAppPageRenderService(appManager, appPageRenderer, appPageSystemRuntime),
	[RENDER]: () => createRenderService(appManager, appPageRenderer, appPageSystemRuntime),
	[APP_START]: () => createAppStartService(appManager, appPageRenderer, appPageSystemRuntime),
	[RUNTIME_TOOLS_VALIDATE]: () => createRuntimeToolsValidateService(appManager),
	[RUNTIME_RISK_CONFIRM]: () => createRuntimeRiskConfirmService(),
	[TASK_SUBMIT]: () =>
		createTaskSubmitService(appManager, appPageRenderer, modelService, appPageSystemRuntime),
	[TASK_DECOMPOSE]: () => createTaskDecomposeService(),
	[TASK_LOOP]: () =>
		createTaskLoopService(appManager, appPageRenderer, modelService, appPageSystemRuntime),
	[PLANNER_SELECT_APPS]: () => createPlannerSelectAppsService(appManager),
	[PLANNER_COMPOSE_TOOLS]: () => createPlannerComposeToolsService(appManager, appPageRenderer),
	[RUNNER_EXECUTE_PLAN]: () => createRunnerExecutePlanService(appManager, appPageRenderer, modelService),
	[APP_UPGRADE]: () =>
		createAppUpgradeService(appManager, {
			onUpgrade: (manifest) => {
				kernel.capabilities.set(manifest.id, manifest.permissions);
			},
		}),
	[APP_UNINSTALL]: () =>
		createAppUninstallService(appManager, {
			onUninstall: (appId) => {
				kernel.capabilities.remove(appId);
			},
		}),
	[APP_DISABLE]: () => createAppDisableService(appManager),
	[APP_ENABLE]: () => createAppEnableService(appManager),
	[SHELL_EXECUTE]: () => createShellExecuteService(shellService),
	[SHELL_ENV_SET]: () => createShellEnvSetService(shellService),
	[SHELL_ENV_UNSET]: () => createShellEnvUnsetService(shellService),
	[SHELL_ENV_LIST]: () => createShellEnvListService(shellService),
	[SECURITY_REDACT]: () => createSecurityRedactService(securityService),
	[STORE_SET]: () => createStoreSetService(storeService),
	[STORE_GET]: () => createStoreGetService(storeService),
	[NET_REQUEST]: () => createNetRequestService(netService),
	[SCHEDULER_SCHEDULE_ONCE]: () => createSchedulerScheduleOnceService(schedulerService),
	[SCHEDULER_SCHEDULE_INTERVAL]: () => createSchedulerScheduleIntervalService(schedulerService),
	[SCHEDULER_CANCEL]: () => createSchedulerCancelService(schedulerService),
	[SCHEDULER_LIST]: () => createSchedulerListService(schedulerService),
	[SCHEDULER_FAILURES_CLEAR]: () => createSchedulerFailuresClearService(schedulerService),
	[SCHEDULER_FAILURES_REPLAY]: () => createSchedulerFailuresReplayService(schedulerService),
	[SCHEDULER_STATE_EXPORT]: () => createSchedulerStateExportService(schedulerService),
	[SCHEDULER_STATE_IMPORT]: () => createSchedulerStateImportService(schedulerService),
	[SCHEDULER_STATE_PERSIST]: () => createSchedulerStatePersistService(schedulerService),
	[SCHEDULER_STATE_RECOVER]: () => createSchedulerStateRecoverService(schedulerService),
	[NOTIFICATION_SEND]: () => createNotificationSendService(notificationService),
	[NOTIFICATION_ACK]: () => createNotificationAckService(notificationService),
	[NOTIFICATION_ACK_ALL]: () => createNotificationAckAllService(notificationService),
	[NOTIFICATION_CLEANUP]: () => createNotificationCleanupService(notificationService),
	[NOTIFICATION_POLICY_UPDATE]: () => createNotificationPolicyUpdateService(notificationService),
	[NOTIFICATION_CHANNEL_CONFIGURE]: () =>
		createNotificationChannelConfigureService(notificationService),
	[NOTIFICATION_CHANNEL_STATS]: () => createNotificationChannelStatsService(notificationService),
	[NOTIFICATION_LIST]: () => createNotificationListService(notificationService),
	[NOTIFICATION_MUTE]: () => createNotificationMuteService(notificationService),
	[NOTIFICATION_MUTE_LIST]: () => createNotificationMuteListService(notificationService),
	[NOTIFICATION_UNMUTE]: () => createNotificationUnmuteService(notificationService),
	[NOTIFICATION_STATS]: () => createNotificationStatsService(notificationService),
	[MEDIA_INSPECT]: () => createMediaInspectService(mediaService),
	[UI_RENDER]: () => createUIRenderService(uiService),
	[MODEL_GENERATE]: () => createModelGenerateService(modelService),
	[PACKAGE_INSTALL]: () => createPackageInstallService(packageService),
	[PACKAGE_LIST]: () => createPackageListService(packageService),
	[HOST_EXECUTE]: () => createHostAdapterExecuteService(hostAdapters),
	[TOKENS.SYSTEM_HEALTH]: () => createSystemHealthService(kernel),
	[TOKENS.SYSTEM_DEPENDENCIES]: () => createSystemDependenciesService(kernel),
	[TOKENS.SYSTEM_ROUTES]: () => createSystemRoutesService(appManager),
	[TOKENS.SYSTEM_ROUTES_STATS]: () => createSystemRoutesStatsService(appManager),
	[TOKENS.SYSTEM_APP_INSTALL_REPORT]: () => createSystemAppInstallReportService(appManager),
	[TOKENS.SYSTEM_APP_DELTA]: () => createSystemAppDeltaService(appManager),
	[TOKENS.SYSTEM_APP_ROLLBACK_STATE_EXPORT]: () => createSystemAppRollbackStateExportService(appManager),
	[TOKENS.SYSTEM_APP_ROLLBACK_STATE_IMPORT]: () => createSystemAppRollbackStateImportService(appManager),
	[TOKENS.SYSTEM_APP_ROLLBACK_STATE_PERSIST]: () =>
		createSystemAppRollbackStatePersistService(appManager, storeService),
	[TOKENS.SYSTEM_APP_ROLLBACK_STATE_RECOVER]: () =>
		createSystemAppRollbackStateRecoverService(appManager, storeService),
	[TOKENS.SYSTEM_APP_ROLLBACK_STATS]: () => createSystemAppRollbackStatsService(appManager),
	[TOKENS.SYSTEM_APP_ROLLBACK_GC]: () => createSystemAppRollbackGCService(appManager),
	[TOKENS.SYSTEM_APP_ROLLBACK_AUDIT]: () => createSystemAppRollbackAuditService(kernel),
	[TOKENS.SYSTEM_METRICS]: () => createSystemMetricsService(kernel),
	[TOKENS.SYSTEM_AUDIT]: () => createSystemAuditService(kernel),
	[TOKENS.SYSTEM_GOVERNANCE_STATE_EXPORT]: () => createSystemGovernanceStateExportService(),
	[TOKENS.SYSTEM_GOVERNANCE_STATE_IMPORT]: () => createSystemGovernanceStateImportService(),
	[TOKENS.SYSTEM_GOVERNANCE_STATE_PERSIST]: () => createSystemGovernanceStatePersistService(storeService),
	[TOKENS.SYSTEM_GOVERNANCE_STATE_RECOVER]: () => createSystemGovernanceStateRecoverService(storeService),
	[TOKENS.SYSTEM_AUDIT_KEYS_ROTATE]: () => createSystemAuditKeysRotateService(),
	[TOKENS.SYSTEM_AUDIT_KEYS_LIST]: () => createSystemAuditKeysListService(),
	[TOKENS.SYSTEM_AUDIT_KEYS_ACTIVATE]: () => createSystemAuditKeysActivateService(),
	[TOKENS.SYSTEM_TOPOLOGY]: () => createSystemTopologyService(kernel),
	[TOKENS.SYSTEM_EVENTS]: () => createSystemEventsService(kernel),
	[TOKENS.SYSTEM_CAPABILITIES]: () => createSystemCapabilitiesService(kernel),
	[TOKENS.SYSTEM_CAPABILITIES_LIST]: () => createSystemCapabilitiesListService(kernel),
	[TOKENS.SYSTEM_POLICY]: () => createSystemPolicyService(kernel),
	[TOKENS.SYSTEM_POLICY_EVALUATE]: () => createSystemPolicyEvaluateService(kernel),
	[TOKENS.SYSTEM_POLICY_UPDATE]: () => createSystemPolicyUpdateService(kernel),
	[TOKENS.SYSTEM_POLICY_VERSION_CREATE]: () => createSystemPolicyVersionCreateService(kernel),
	[TOKENS.SYSTEM_POLICY_VERSION_LIST]: () => createSystemPolicyVersionListService(kernel),
	[TOKENS.SYSTEM_POLICY_VERSION_ROLLBACK]: () => createSystemPolicyVersionRollbackService(kernel),
	[TOKENS.SYSTEM_POLICY_SIMULATE_BATCH]: () => createSystemPolicySimulateBatchService(kernel),
	[TOKENS.SYSTEM_POLICY_GUARD_APPLY]: () => createSystemPolicyGuardApplyService(kernel),
	[TOKENS.SYSTEM_NET_CIRCUIT]: () => createSystemNetCircuitService(netService),
	[TOKENS.SYSTEM_NET_CIRCUIT_RESET]: () => createSystemNetCircuitResetService(netService),
	[TOKENS.SYSTEM_SCHEDULER_FAILURES]: () => createSystemSchedulerFailuresService(schedulerService),
	[TOKENS.SYSTEM_ALERTS]: () => createSystemAlertsService(notificationService),
	[TOKENS.SYSTEM_ALERTS_CLEAR]: () => createSystemAlertsClearService(notificationService),
	[TOKENS.SYSTEM_ALERTS_EXPORT]: () => createSystemAlertsExportService(notificationService),
	[TOKENS.SYSTEM_ALERTS_STATS]: () => createSystemAlertsStatsService(notificationService),
	[TOKENS.SYSTEM_ALERTS_TOPICS]: () => createSystemAlertsTopicsService(notificationService),
	[TOKENS.SYSTEM_ALERTS_UNACKED]: () => createSystemAlertsUnackedService(notificationService),
	[TOKENS.SYSTEM_ALERTS_POLICY]: () => createSystemAlertsPolicyService(notificationService),
	[TOKENS.SYSTEM_ALERTS_TRENDS]: () => createSystemAlertsTrendsService(notificationService),
	[TOKENS.SYSTEM_ALERTS_SLO]: () => createSystemAlertsSLOService(notificationService),
	[TOKENS.SYSTEM_ALERTS_INCIDENTS]: () => createSystemAlertsIncidentsService(notificationService),
	[TOKENS.SYSTEM_ALERTS_DIGEST]: () => createSystemAlertsDigestService(notificationService),
	[TOKENS.SYSTEM_ALERTS_REPORT]: () => createSystemAlertsReportService(notificationService),
	[TOKENS.SYSTEM_ALERTS_REPORT_COMPACT]: () =>
		createSystemAlertsReportCompactService(notificationService),
	[TOKENS.SYSTEM_ALERTS_FLAPPING]: () => createSystemAlertsFlappingService(notificationService),
	[TOKENS.SYSTEM_ALERTS_TIMELINE]: () => createSystemAlertsTimelineService(notificationService),
	[TOKENS.SYSTEM_ALERTS_HOTSPOTS]: () => createSystemAlertsHotspotsService(notificationService),
	[TOKENS.SYSTEM_ALERTS_RECOMMENDATIONS]: () =>
		createSystemAlertsRecommendationsService(notificationService),
	[TOKENS.SYSTEM_ALERTS_FEED]: () => createSystemAlertsFeedService(notificationService),
	[TOKENS.SYSTEM_ALERTS_BACKLOG]: () => createSystemAlertsBacklogService(notificationService),
	[TOKENS.SYSTEM_ALERTS_BREACHES]: () => createSystemAlertsBreachesService(notificationService),
	[TOKENS.SYSTEM_ALERTS_HEALTH]: () => createSystemAlertsHealthService(notificationService),
	[TOKENS.SYSTEM_ALERTS_AUTO_REMEDIATE_PLAN]: () =>
		createSystemAlertsAutoRemediatePlanService(notificationService, schedulerService, netService),
	[TOKENS.SYSTEM_ALERTS_AUTO_REMEDIATE_EXECUTE]: () =>
		createSystemAlertsAutoRemediateExecuteService(notificationService, schedulerService, netService),
	[TOKENS.SYSTEM_ALERTS_AUTO_REMEDIATE_AUDIT]: () => createSystemAlertsAutoRemediateAuditService(),
	[TOKENS.SYSTEM_SLO]: () => createSystemSLOService(kernel, notificationService),
	[TOKENS.SYSTEM_SLO_RULES_UPSERT]: () => createSystemSLORulesUpsertService(),
	[TOKENS.SYSTEM_SLO_RULES_LIST]: () => createSystemSLORulesListService(),
	[TOKENS.SYSTEM_SLO_RULES_EVALUATE]: () =>
		createSystemSLORulesEvaluateService(kernel, notificationService),
	[TOKENS.SYSTEM_AUDIT_EXPORT]: () => createSystemAuditExportService(kernel, securityService),
	[TOKENS.SYSTEM_QUOTA]: () => createSystemQuotaService(tenantQuotaGovernor),
	[TOKENS.SYSTEM_QUOTA_ADJUST]: () => createSystemQuotaAdjustService(tenantQuotaGovernor),
	[TOKENS.SYSTEM_QUOTA_POLICY_UPSERT]: () => createSystemQuotaPolicyUpsertService(),
	[TOKENS.SYSTEM_QUOTA_POLICY_LIST]: () => createSystemQuotaPolicyListService(),
	[TOKENS.SYSTEM_QUOTA_POLICY_APPLY]: () => createSystemQuotaPolicyApplyService(tenantQuotaGovernor),
	[TOKENS.SYSTEM_QUOTA_HOTSPOTS]: () => createSystemQuotaHotspotsService(tenantQuotaGovernor),
	[TOKENS.SYSTEM_QUOTA_HOTSPOTS_ISOLATE]: () =>
		createSystemQuotaHotspotsIsolateService(tenantQuotaGovernor),
	[TOKENS.SYSTEM_CHAOS_RUN]: () => createSystemChaosRunService(kernel, notificationService, schedulerService),
	[TOKENS.SYSTEM_CHAOS_BASELINE_CAPTURE]: () => createSystemChaosBaselineCaptureService(kernel),
	[TOKENS.SYSTEM_CHAOS_BASELINE_VERIFY]: () => createSystemChaosBaselineVerifyService(kernel),
	[TOKENS.SYSTEM_SNAPSHOT]: () =>
		createSystemSnapshotService(kernel, {
			netService,
			schedulerService,
		}),
	[TOKENS.SYSTEM_ERRORS]: () => createSystemErrorsService(kernel),
	[TOKENS.SYSTEM_ERRORS_EXPORT]: () => createSystemErrorsExportService(kernel, securityService),
	[TOKENS.SYSTEM_ERRORS_KEYS_ROTATE]: () => createSystemErrorsKeysRotateService(),
	[TOKENS.SYSTEM_ERRORS_KEYS_LIST]: () => createSystemErrorsKeysListService(),
	[TOKENS.SYSTEM_ERRORS_KEYS_ACTIVATE]: () => createSystemErrorsKeysActivateService(),
} as const satisfies Record<string, () => OSService<unknown, unknown, string>>;

	type ServiceCatalog = typeof SERVICES;
	type ServiceToken<Name extends keyof ServiceCatalog> = Token<
		ServiceRequest<ReturnType<ServiceCatalog[Name]>>,
		ServiceResponse<ReturnType<ServiceCatalog[Name]>>,
		Extract<Name, string>
	>;

	const serviceToken = <Name extends keyof ServiceCatalog>(serviceName: Name): ServiceToken<Name> =>
		serviceName as ServiceToken<Name>;

	const registerWhenEnabled = <Name extends keyof ServiceCatalog>(serviceName: Name): ServiceToken<Name> => {
		if (isEnabled(serviceName as string)) {
			const factory = SERVICES[serviceName] as () => OSService<unknown, unknown, string>;
			kernel.registerService(factory());
		}
		return serviceToken(serviceName);
	};

	const SERVICE_TOKENS = Object.fromEntries(
		(Object.keys(SERVICES) as Array<keyof ServiceCatalog>).map((serviceName) => [serviceName, registerWhenEnabled(serviceName)]),
	) as { [Name in keyof ServiceCatalog]: ServiceToken<Name> };

	kernel.events.subscribe<{
		service: string;
		traceId: string;
		error: string;
		errorCode: string;
	}>("kernel.service.failed", (event) => {
		notificationService.send({
			topic: "system.alert",
			message: `[${event.payload.errorCode}] ${event.payload.service}: ${event.payload.error} (trace=${event.payload.traceId})`,
		});
	});

	kernel.events.subscribe<{
		id: string;
		attempt: number;
		error: string;
	}>("scheduler.task.failed", (event) => {
		notificationService.send({
			topic: "system.alert",
			message: `scheduler task failed: ${event.payload.id} attempt=${event.payload.attempt} error=${event.payload.error}`,
		});
	});

	kernel.events.subscribe<{
		service: string;
		appId: string;
		traceId: string;
	}>("kernel.service.executed", (event) => {
		if (
			event.payload.service !== SERVICE_TOKENS["app.install"] &&
			event.payload.service !== SERVICE_TOKENS["app.install.v1"]
		) {
			return;
		}
		notificationService.send({
			topic: "system.app.install",
			severity: "info",
			message: `app installed by ${event.payload.appId} via ${event.payload.service} trace=${event.payload.traceId}`,
		});
	});

	return {
		kernel,
		appManager,
		fileService,
		shellService,
		netService,
		storeService,
		securityService,
		schedulerService,
		notificationService,
		mediaService,
		uiService,
		modelService,
		packageService,
		hostAdapters,
		tenantQuotaGovernor,
		serviceTokens: SERVICE_TOKENS,
	};
}

export type DefaultServiceTokens = ReturnType<typeof createDefaultLLMOS>["serviceTokens"];



