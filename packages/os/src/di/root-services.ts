import { createOSRootServiceFoundation } from "./root-service-builders/foundation.js";
import { createOSRootPlatformServices } from "./root-service-builders/platform.js";
export type { OSRootServiceFoundation } from "./root-service-builders/foundation.js";
export type { OSRootPlatformServices } from "./root-service-builders/platform.js";

import type { CreateDefaultLLMOSOptions } from "../llm-os.types.js";
import type { PathPolicyRule } from "../types/os.js";
import type { AppManager } from "../app-manager/index.js";
import type { FileService } from "../file-service/index.js";
import type { HostAdapterRegistry } from "../host-adapter/index.js";
import type { LLMOSKernel } from "../kernel/index.js";
import type { CompositeResourceGovernor, TenantQuotaGovernor } from "../kernel/resource-governor.js";
import type { PolicyEngine } from "../kernel/policy-engine.js";
import type { MediaService } from "../media-service/index.js";
import type { ModelService } from "../model-service/index.js";
import type { NetService } from "../net-service/index.js";
import type { NotificationService } from "../notification-service/index.js";
import type { PackageService } from "../package-service/index.js";
import type { SchedulerService } from "../scheduler-service/index.js";
import type { SecurityService } from "../security-service/index.js";
import type { ShellService } from "../shell-service/index.js";
import type { StoreService } from "../store-service/index.js";
import type { UIService } from "../ui-service/index.js";

export interface OSRootServices {
	pathPolicy: PathPolicyRule;
	appManager: AppManager;
	policy: PolicyEngine;
	tenantQuotaGovernor: TenantQuotaGovernor;
	resourceGovernor: CompositeResourceGovernor;
	kernel: LLMOSKernel;
	fileService: FileService;
	shellService: ShellService;
	securityService: SecurityService;
	storeService: StoreService;
	netService: NetService;
	schedulerService: SchedulerService;
	notificationService: NotificationService;
	mediaService: MediaService;
	uiService: UIService;
	modelService: ModelService;
	packageService: PackageService;
	hostAdapters: HostAdapterRegistry;
}

export function createOSRootServices(options: CreateDefaultLLMOSOptions = {}): OSRootServices {
	const foundation = createOSRootServiceFoundation(options);
	const platform = createOSRootPlatformServices(foundation, options);

	return {
		...foundation,
		...platform,
	};
}
