import {
	AppManager,
	createAppDisableService,
	createAppEnableService,
	createAppInstallService,
	createAppListService,
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
	createSystemErrorsService,
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
import type { OSService, PathPolicyRule } from "./types/os.js";
import { UIService, createUIRenderService } from "./ui-service/index.js";
import { PolicyEngine } from "./kernel/policy-engine.js";

export interface DefaultLLMOS {
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

export function createDefaultLLMOS(options: CreateDefaultLLMOSOptions = {}): DefaultLLMOS {
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

	modelService.register({
		name: "echo",
		generate: async (request) => `echo:${request.prompt}`,
	});

	const isEnabled = (serviceName: string): boolean => options.enabledServices?.[serviceName] ?? true;
	const registerWhenEnabled = (name: string, factory: () => OSService<unknown, unknown>) => {
		if (isEnabled(name)) {
			kernel.registerService(factory());
		}
	};

	registerWhenEnabled("file.read", () => createFileReadService(fileService));
	registerWhenEnabled("file.write", () => createFileWriteService(fileService));
	registerWhenEnabled("file.list", () => createFileListService(fileService));
	registerWhenEnabled("file.find", () => createFileFindService(fileService));
	registerWhenEnabled("file.grep", () => createFileGrepService(fileService));
	registerWhenEnabled("file.edit", () => createFileEditService(fileService));
	registerWhenEnabled("app.install", () =>
		createAppInstallService(appManager, {
			onInstall: (manifest) => {
				kernel.capabilities.set(manifest.id, manifest.permissions);
			},
		}),
	);
	registerWhenEnabled("app.state.set", () => createAppSetStateService(appManager));
	registerWhenEnabled("app.list", () => createAppListService(appManager));
	registerWhenEnabled("app.upgrade", () =>
		createAppUpgradeService(appManager, {
			onUpgrade: (manifest) => {
				kernel.capabilities.set(manifest.id, manifest.permissions);
			},
		}),
	);
	registerWhenEnabled("app.uninstall", () =>
		createAppUninstallService(appManager, {
			onUninstall: (appId) => {
				kernel.capabilities.remove(appId);
			},
		}),
	);
	registerWhenEnabled("app.disable", () => createAppDisableService(appManager));
	registerWhenEnabled("app.enable", () => createAppEnableService(appManager));
	registerWhenEnabled("shell.execute", () => createShellExecuteService(shellService));
	registerWhenEnabled("shell.env.set", () => createShellEnvSetService(shellService));
	registerWhenEnabled("shell.env.unset", () => createShellEnvUnsetService(shellService));
	registerWhenEnabled("shell.env.list", () => createShellEnvListService(shellService));
	registerWhenEnabled("security.redact", () => createSecurityRedactService(securityService));
	registerWhenEnabled("store.set", () => createStoreSetService(storeService));
	registerWhenEnabled("store.get", () => createStoreGetService(storeService));
	registerWhenEnabled("net.request", () => createNetRequestService(netService));
	registerWhenEnabled("scheduler.scheduleOnce", () => createSchedulerScheduleOnceService(schedulerService));
	registerWhenEnabled("scheduler.scheduleInterval", () => createSchedulerScheduleIntervalService(schedulerService));
	registerWhenEnabled("scheduler.cancel", () => createSchedulerCancelService(schedulerService));
	registerWhenEnabled("scheduler.list", () => createSchedulerListService(schedulerService));
	registerWhenEnabled("scheduler.failures.clear", () => createSchedulerFailuresClearService(schedulerService));
	registerWhenEnabled("scheduler.failures.replay", () => createSchedulerFailuresReplayService(schedulerService));
	registerWhenEnabled("scheduler.state.export", () => createSchedulerStateExportService(schedulerService));
	registerWhenEnabled("scheduler.state.import", () => createSchedulerStateImportService(schedulerService));
	registerWhenEnabled("scheduler.state.persist", () => createSchedulerStatePersistService(schedulerService));
	registerWhenEnabled("scheduler.state.recover", () => createSchedulerStateRecoverService(schedulerService));
	registerWhenEnabled("notification.send", () => createNotificationSendService(notificationService));
	registerWhenEnabled("notification.ack", () => createNotificationAckService(notificationService));
	registerWhenEnabled("notification.ackAll", () => createNotificationAckAllService(notificationService));
	registerWhenEnabled("notification.cleanup", () => createNotificationCleanupService(notificationService));
	registerWhenEnabled("notification.policy.update", () => createNotificationPolicyUpdateService(notificationService));
	registerWhenEnabled("notification.channel.configure", () =>
		createNotificationChannelConfigureService(notificationService),
	);
	registerWhenEnabled("notification.channel.stats", () => createNotificationChannelStatsService(notificationService));
	registerWhenEnabled("notification.list", () => createNotificationListService(notificationService));
	registerWhenEnabled("notification.mute", () => createNotificationMuteService(notificationService));
	registerWhenEnabled("notification.mute.list", () => createNotificationMuteListService(notificationService));
	registerWhenEnabled("notification.unmute", () => createNotificationUnmuteService(notificationService));
	registerWhenEnabled("notification.stats", () => createNotificationStatsService(notificationService));
	registerWhenEnabled("media.inspect", () => createMediaInspectService(mediaService));
	registerWhenEnabled("ui.render", () => createUIRenderService(uiService));
	registerWhenEnabled("model.generate", () => createModelGenerateService(modelService));
	registerWhenEnabled("package.install", () => createPackageInstallService(packageService));
	registerWhenEnabled("package.list", () => createPackageListService(packageService));
	registerWhenEnabled("host.execute", () => createHostAdapterExecuteService(hostAdapters));
	registerWhenEnabled("system.health", () => createSystemHealthService(kernel));
	registerWhenEnabled("system.dependencies", () => createSystemDependenciesService(kernel));
	registerWhenEnabled("system.metrics", () => createSystemMetricsService(kernel));
	registerWhenEnabled("system.audit", () => createSystemAuditService(kernel));
	registerWhenEnabled("system.governance.state.export", () => createSystemGovernanceStateExportService());
	registerWhenEnabled("system.governance.state.import", () => createSystemGovernanceStateImportService());
	registerWhenEnabled("system.governance.state.persist", () => createSystemGovernanceStatePersistService(storeService));
	registerWhenEnabled("system.governance.state.recover", () => createSystemGovernanceStateRecoverService(storeService));
	registerWhenEnabled("system.audit.keys.rotate", () => createSystemAuditKeysRotateService());
	registerWhenEnabled("system.audit.keys.list", () => createSystemAuditKeysListService());
	registerWhenEnabled("system.audit.keys.activate", () => createSystemAuditKeysActivateService());
	registerWhenEnabled("system.topology", () => createSystemTopologyService(kernel));
	registerWhenEnabled("system.events", () => createSystemEventsService(kernel));
	registerWhenEnabled("system.capabilities", () => createSystemCapabilitiesService(kernel));
	registerWhenEnabled("system.capabilities.list", () => createSystemCapabilitiesListService(kernel));
	registerWhenEnabled("system.policy", () => createSystemPolicyService(kernel));
	registerWhenEnabled("system.policy.evaluate", () => createSystemPolicyEvaluateService(kernel));
	registerWhenEnabled("system.policy.update", () => createSystemPolicyUpdateService(kernel));
	registerWhenEnabled("system.policy.version.create", () => createSystemPolicyVersionCreateService(kernel));
	registerWhenEnabled("system.policy.version.list", () => createSystemPolicyVersionListService(kernel));
	registerWhenEnabled("system.policy.version.rollback", () => createSystemPolicyVersionRollbackService(kernel));
	registerWhenEnabled("system.policy.simulate.batch", () => createSystemPolicySimulateBatchService(kernel));
	registerWhenEnabled("system.policy.guard.apply", () => createSystemPolicyGuardApplyService(kernel));
	registerWhenEnabled("system.net.circuit", () => createSystemNetCircuitService(netService));
	registerWhenEnabled("system.net.circuit.reset", () => createSystemNetCircuitResetService(netService));
	registerWhenEnabled("system.scheduler.failures", () => createSystemSchedulerFailuresService(schedulerService));
	registerWhenEnabled("system.alerts", () => createSystemAlertsService(notificationService));
	registerWhenEnabled("system.alerts.clear", () => createSystemAlertsClearService(notificationService));
	registerWhenEnabled("system.alerts.export", () => createSystemAlertsExportService(notificationService));
	registerWhenEnabled("system.alerts.stats", () => createSystemAlertsStatsService(notificationService));
	registerWhenEnabled("system.alerts.topics", () => createSystemAlertsTopicsService(notificationService));
	registerWhenEnabled("system.alerts.unacked", () => createSystemAlertsUnackedService(notificationService));
	registerWhenEnabled("system.alerts.policy", () => createSystemAlertsPolicyService(notificationService));
	registerWhenEnabled("system.alerts.trends", () => createSystemAlertsTrendsService(notificationService));
	registerWhenEnabled("system.alerts.slo", () => createSystemAlertsSLOService(notificationService));
	registerWhenEnabled("system.alerts.incidents", () => createSystemAlertsIncidentsService(notificationService));
	registerWhenEnabled("system.alerts.digest", () => createSystemAlertsDigestService(notificationService));
	registerWhenEnabled("system.alerts.report", () => createSystemAlertsReportService(notificationService));
	registerWhenEnabled("system.alerts.report.compact", () =>
		createSystemAlertsReportCompactService(notificationService),
	);
	registerWhenEnabled("system.alerts.flapping", () => createSystemAlertsFlappingService(notificationService));
	registerWhenEnabled("system.alerts.timeline", () => createSystemAlertsTimelineService(notificationService));
	registerWhenEnabled("system.alerts.hotspots", () => createSystemAlertsHotspotsService(notificationService));
	registerWhenEnabled("system.alerts.recommendations", () =>
		createSystemAlertsRecommendationsService(notificationService),
	);
	registerWhenEnabled("system.alerts.feed", () => createSystemAlertsFeedService(notificationService));
	registerWhenEnabled("system.alerts.backlog", () => createSystemAlertsBacklogService(notificationService));
	registerWhenEnabled("system.alerts.breaches", () => createSystemAlertsBreachesService(notificationService));
	registerWhenEnabled("system.alerts.health", () => createSystemAlertsHealthService(notificationService));
	registerWhenEnabled("system.alerts.auto-remediate.plan", () =>
		createSystemAlertsAutoRemediatePlanService(notificationService, schedulerService, netService),
	);
	registerWhenEnabled("system.alerts.auto-remediate.execute", () =>
		createSystemAlertsAutoRemediateExecuteService(notificationService, schedulerService, netService),
	);
	registerWhenEnabled("system.alerts.auto-remediate.audit", () => createSystemAlertsAutoRemediateAuditService());
	registerWhenEnabled("system.slo", () => createSystemSLOService(kernel, notificationService));
	registerWhenEnabled("system.slo.rules.upsert", () => createSystemSLORulesUpsertService());
	registerWhenEnabled("system.slo.rules.list", () => createSystemSLORulesListService());
	registerWhenEnabled("system.slo.rules.evaluate", () =>
		createSystemSLORulesEvaluateService(kernel, notificationService),
	);
	registerWhenEnabled("system.audit.export", () => createSystemAuditExportService(kernel, securityService));
	registerWhenEnabled("system.quota", () => createSystemQuotaService(tenantQuotaGovernor));
	registerWhenEnabled("system.quota.adjust", () => createSystemQuotaAdjustService(tenantQuotaGovernor));
	registerWhenEnabled("system.quota.policy.upsert", () => createSystemQuotaPolicyUpsertService());
	registerWhenEnabled("system.quota.policy.list", () => createSystemQuotaPolicyListService());
	registerWhenEnabled("system.quota.policy.apply", () => createSystemQuotaPolicyApplyService(tenantQuotaGovernor));
	registerWhenEnabled("system.quota.hotspots", () => createSystemQuotaHotspotsService(tenantQuotaGovernor));
	registerWhenEnabled("system.quota.hotspots.isolate", () =>
		createSystemQuotaHotspotsIsolateService(tenantQuotaGovernor),
	);
	registerWhenEnabled("system.chaos.run", () => createSystemChaosRunService(kernel, notificationService, schedulerService));
	registerWhenEnabled("system.chaos.baseline.capture", () => createSystemChaosBaselineCaptureService(kernel));
	registerWhenEnabled("system.chaos.baseline.verify", () => createSystemChaosBaselineVerifyService(kernel));
	registerWhenEnabled("system.snapshot", () =>
		createSystemSnapshotService(kernel, {
			netService,
			schedulerService,
		}),
	);
	registerWhenEnabled("system.errors", () => createSystemErrorsService(kernel));

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
	};
}
