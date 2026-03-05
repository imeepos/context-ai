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
	createNotificationSendService,
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
	createSystemCapabilitiesService,
	createSystemCapabilitiesListService,
	createSystemDependenciesService,
	createSystemErrorsService,
	createSystemEventsService,
	createSystemHealthService,
	createSystemMetricsService,
	createSystemNetCircuitService,
	createSystemPolicyEvaluateService,
	createSystemPolicyService,
	createSystemSchedulerFailuresService,
	createSystemSnapshotService,
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
	const schedulerService = new SchedulerService(kernel.events);
	const notificationService = new NotificationService(kernel.events, {
		dedupeWindowMs: options.notificationDedupeWindowMs,
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
	registerWhenEnabled("notification.send", () => createNotificationSendService(notificationService));
	registerWhenEnabled("notification.list", () => createNotificationListService(notificationService));
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
	registerWhenEnabled("system.topology", () => createSystemTopologyService(kernel));
	registerWhenEnabled("system.events", () => createSystemEventsService(kernel));
	registerWhenEnabled("system.capabilities", () => createSystemCapabilitiesService(kernel));
	registerWhenEnabled("system.capabilities.list", () => createSystemCapabilitiesListService(kernel));
	registerWhenEnabled("system.policy", () => createSystemPolicyService(kernel));
	registerWhenEnabled("system.policy.evaluate", () => createSystemPolicyEvaluateService(kernel));
	registerWhenEnabled("system.net.circuit", () => createSystemNetCircuitService(netService));
	registerWhenEnabled("system.scheduler.failures", () => createSystemSchedulerFailuresService(schedulerService));
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
