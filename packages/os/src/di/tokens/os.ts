import type { AppManager, AppPageRenderer, AppPageSystemRuntime, AppServiceHooks } from "../../app-manager/index.js";
import type { FileService } from "../../file-service/index.js";
import type { HostAdapterRegistry } from "../../host-adapter/index.js";
import type { LLMOSKernel } from "../../kernel/index.js";
import type { PolicyEngine } from "../../kernel/policy-engine.js";
import type {
	AppAuthorizationGovernor,
	AppQuotaGovernor,
	CompositeResourceGovernor,
	TenantQuotaGovernor,
} from "../../kernel/resource-governor.js";
import type { MediaService } from "../../media-service/index.js";
import type { ModelService } from "../../model-service/index.js";
import type { NetService } from "../../net-service/index.js";
import type { NotificationService } from "../../notification-service/index.js";
import type { PackageService } from "../../package-service/index.js";
import type { SchedulerService } from "../../scheduler-service/index.js";
import type { SecurityService } from "../../security-service/index.js";
import type { ShellService } from "../../shell-service/index.js";
import type { StoreService } from "../../store-service/index.js";
import type { PathPolicyRule } from "../../types/os.js";
import type { UIService } from "../../ui-service/index.js";
import { defineToken } from "./shared.js";

export const OS_PATH_POLICY = defineToken<PathPolicyRule>("os.path-policy");
export const OS_POLICY_ENGINE = defineToken<PolicyEngine>("os.policy-engine");
export const OS_APP_MANAGER = defineToken<AppManager>("os.app-manager");
export const OS_TENANT_QUOTA_GOVERNOR = defineToken<TenantQuotaGovernor>("os.tenant-quota-governor");
export const OS_APP_AUTHORIZATION_GOVERNOR = defineToken<AppAuthorizationGovernor>("os.app-authorization-governor");
export const OS_APP_QUOTA_GOVERNOR = defineToken<AppQuotaGovernor>("os.app-quota-governor");
export const OS_RESOURCE_GOVERNOR = defineToken<CompositeResourceGovernor>("os.resource-governor");
export const OS_KERNEL = defineToken<LLMOSKernel>("os.kernel");
export const OS_FILE_SERVICE = defineToken<FileService>("os.file-service");
export const OS_SHELL_SERVICE = defineToken<ShellService>("os.shell-service");
export const OS_SECURITY = defineToken<SecurityService>("os.security");
export const OS_STORE = defineToken<StoreService>("os.store");
export const OS_NET = defineToken<NetService>("os.net");
export const OS_SCHEDULER = defineToken<SchedulerService>("os.scheduler");
export const OS_NOTIFICATION = defineToken<NotificationService>("os.notification");
export const OS_MEDIA = defineToken<MediaService>("os.media");
export const OS_UI = defineToken<UIService>("os.ui");
export const OS_MODEL = defineToken<ModelService>("os.model");
export const OS_PACKAGE = defineToken<PackageService>("os.package");
export const OS_HOST_ADAPTERS = defineToken<HostAdapterRegistry>("os.host-adapters");
export const OS_APP_PAGE_RENDERER = defineToken<AppPageRenderer>("os.app-page-renderer");
export const OS_SYSTEM_RUNTIME = defineToken<AppPageSystemRuntime>("os.system-runtime");
export const OS_APP_SERVICE_HOOKS = defineToken<AppServiceHooks>("os.app-service-hooks");
export const OS_ROLLBACK_HOOKS = defineToken<AppServiceHooks>("os.rollback-hooks");
