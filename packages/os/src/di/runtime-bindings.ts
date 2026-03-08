import {
	OS_APP_MANAGER,
	OS_APP_PAGE_RENDERER,
	OS_APP_SERVICE_HOOKS,
	OS_FILE_SERVICE,
	OS_HOST_ADAPTERS,
	OS_KERNEL,
	OS_MEDIA,
	OS_MODEL,
	OS_NET,
	OS_NOTIFICATION,
	OS_PACKAGE,
	OS_PATH_POLICY,
	OS_POLICY_ENGINE,
	OS_RESOURCE_GOVERNOR,
	OS_ROLLBACK_HOOKS,
	OS_SCHEDULER,
	OS_SECURITY,
	OS_SERVICE_TOKENS,
	OS_SHELL_SERVICE,
	OS_STORE,
	OS_SYSTEM_RUNTIME,
	OS_SYSTEM_TASK_MANIFEST,
	OS_TENANT_QUOTA_GOVERNOR,
	OS_UI,
} from "./tokens.js";
import type { InjectionTokenType } from "@context-ai/core";
import type { OSRootRuntime } from "./root-runtime.js";
import type { OSRootServices } from "./root-services.js";

interface RuntimeBinding<T = unknown> {
	provide: InjectionTokenType<T>;
	select(runtime: OSRootRuntime): T;
}

interface PublicRuntimeBinding<Key extends keyof OSRootServices> extends RuntimeBinding<OSRootServices[Key]> {
	key: Key;
}

function bindRuntime<T>(provide: InjectionTokenType<T>, select: RuntimeBinding<T>["select"]): RuntimeBinding<T> {
	return { provide, select };
}

function bindPublicRuntime<Key extends keyof OSRootServices>(
	key: Key,
	provide: InjectionTokenType<OSRootServices[Key]>,
	select: PublicRuntimeBinding<Key>["select"],
): PublicRuntimeBinding<Key> {
	return { key, provide, select };
}

export const PUBLIC_OS_RUNTIME_BINDINGS = [
	bindPublicRuntime("kernel", OS_KERNEL, (runtime) => runtime.kernel),
	bindPublicRuntime("appManager", OS_APP_MANAGER, (runtime) => runtime.appManager),
	bindPublicRuntime("fileService", OS_FILE_SERVICE, (runtime) => runtime.fileService),
	bindPublicRuntime("shellService", OS_SHELL_SERVICE, (runtime) => runtime.shellService),
	bindPublicRuntime("netService", OS_NET, (runtime) => runtime.netService),
	bindPublicRuntime("storeService", OS_STORE, (runtime) => runtime.storeService),
	bindPublicRuntime("securityService", OS_SECURITY, (runtime) => runtime.securityService),
	bindPublicRuntime("schedulerService", OS_SCHEDULER, (runtime) => runtime.schedulerService),
	bindPublicRuntime("notificationService", OS_NOTIFICATION, (runtime) => runtime.notificationService),
	bindPublicRuntime("mediaService", OS_MEDIA, (runtime) => runtime.mediaService),
	bindPublicRuntime("uiService", OS_UI, (runtime) => runtime.uiService),
	bindPublicRuntime("modelService", OS_MODEL, (runtime) => runtime.modelService),
	bindPublicRuntime("packageService", OS_PACKAGE, (runtime) => runtime.packageService),
	bindPublicRuntime("hostAdapters", OS_HOST_ADAPTERS, (runtime) => runtime.hostAdapters),
	bindPublicRuntime("tenantQuotaGovernor", OS_TENANT_QUOTA_GOVERNOR, (runtime) => runtime.tenantQuotaGovernor),
] as const satisfies ReadonlyArray<PublicRuntimeBinding<keyof OSRootServices>>;

const INTERNAL_OS_RUNTIME_BINDINGS = [
	bindRuntime(OS_PATH_POLICY, (runtime) => runtime.pathPolicy),
	bindRuntime(OS_POLICY_ENGINE, (runtime) => runtime.policy),
	bindRuntime(OS_RESOURCE_GOVERNOR, (runtime) => runtime.resourceGovernor),
	bindRuntime(OS_SYSTEM_RUNTIME, (runtime) => runtime.appPageSystemRuntime),
	bindRuntime(OS_APP_PAGE_RENDERER, (runtime) => runtime.appPageRenderer),
	bindRuntime(OS_APP_SERVICE_HOOKS, (runtime) => runtime.appServiceHooks),
	bindRuntime(OS_ROLLBACK_HOOKS, (runtime) => runtime.rollbackHooks),
	bindRuntime(OS_SYSTEM_TASK_MANIFEST, (runtime) => runtime.systemTaskManifest),
	bindRuntime(OS_SERVICE_TOKENS, (runtime) => runtime.serviceTokens),
] as const satisfies ReadonlyArray<RuntimeBinding>;

export const OS_RUNTIME_TOKEN_BINDINGS = [
	...PUBLIC_OS_RUNTIME_BINDINGS,
	...INTERNAL_OS_RUNTIME_BINDINGS,
] as const satisfies ReadonlyArray<RuntimeBinding>;
