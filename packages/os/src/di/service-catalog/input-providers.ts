import type { Provider } from "@context-ai/core";
import { createValueProviders } from "../provider-builders.js";
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
	OS_ROLLBACK_HOOKS,
	OS_SCHEDULER,
	OS_SECURITY,
	OS_SHELL_SERVICE,
	OS_STORE,
	OS_SYSTEM_RUNTIME,
	OS_TENANT_QUOTA_GOVERNOR,
	OS_UI,
} from "../tokens.js";
import type { CreateOSServiceCatalogInput } from "./types.js";

export function createOSServiceCatalogInputProviders(input: CreateOSServiceCatalogInput): Provider[] {
	return createValueProviders([
		{ provide: OS_APP_MANAGER, useValue: input.appManager },
		{ provide: OS_FILE_SERVICE, useValue: input.fileService },
		{ provide: OS_SHELL_SERVICE, useValue: input.shellService },
		{ provide: OS_SECURITY, useValue: input.securityService },
		{ provide: OS_STORE, useValue: input.storeService },
		{ provide: OS_NET, useValue: input.netService },
		{ provide: OS_SCHEDULER, useValue: input.schedulerService },
		{ provide: OS_NOTIFICATION, useValue: input.notificationService },
		{ provide: OS_MEDIA, useValue: input.mediaService },
		{ provide: OS_UI, useValue: input.uiService },
		{ provide: OS_MODEL, useValue: input.modelService },
		{ provide: OS_PACKAGE, useValue: input.packageService },
		{ provide: OS_HOST_ADAPTERS, useValue: input.hostAdapters },
		{ provide: OS_KERNEL, useValue: input.kernel },
		{ provide: OS_TENANT_QUOTA_GOVERNOR, useValue: input.tenantQuotaGovernor },
		{ provide: OS_APP_PAGE_RENDERER, useValue: input.appPageRenderer },
		{ provide: OS_SYSTEM_RUNTIME, useValue: input.appPageSystemRuntime },
		{ provide: OS_APP_SERVICE_HOOKS, useValue: input.appServiceHooks },
		{ provide: OS_ROLLBACK_HOOKS, useValue: input.rollbackHooks },
	]);
}
