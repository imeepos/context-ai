import type {
	AppPageRenderer,
	AppPageSystemRuntime,
	AppServiceHooks,
} from "../../app-manager/index.js";
import type { OSService } from "../../types/os.js";
import type { OSRootServices } from "../root-services.js";

type ServiceCatalogServices = Pick<
	OSRootServices,
	| "appManager"
	| "fileService"
	| "shellService"
	| "securityService"
	| "storeService"
	| "netService"
	| "schedulerService"
	| "notificationService"
	| "mediaService"
	| "uiService"
	| "modelService"
	| "packageService"
	| "hostAdapters"
	| "kernel"
	| "tenantQuotaGovernor"
>;

export interface CreateOSServiceCatalogInput extends ServiceCatalogServices {
	appPageRenderer: AppPageRenderer;
	appPageSystemRuntime: AppPageSystemRuntime;
	appServiceHooks: AppServiceHooks;
	rollbackHooks: AppServiceHooks;
}

export type OSServiceFactoryRecord = Record<string, () => OSService<unknown, unknown, string>>;
