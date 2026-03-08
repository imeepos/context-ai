import { APP_SERVICE_DEFINITIONS } from "./service-catalog/app.js";
import { createServiceCatalog } from "./service-catalog/definition.js";
import { FILE_SERVICE_DEFINITIONS } from "./service-catalog/file.js";
import { PLATFORM_SERVICE_DEFINITIONS } from "./service-catalog/platform.js";
import { SYSTEM_SERVICE_DEFINITIONS } from "./service-catalog/system.js";
import type { CreateOSServiceCatalogInput } from "./service-catalog/types.js";
import { WORKFLOW_SERVICE_DEFINITIONS } from "./service-catalog/workflow.js";

export type { CreateOSServiceCatalogInput, OSServiceFactoryRecord } from "./service-catalog/types.js";
export { createServiceCatalog, defineInjectableOSService } from "./service-catalog/definition.js";

export const OS_SERVICE_CATALOG_DEFINITIONS = [
	...FILE_SERVICE_DEFINITIONS,
	...APP_SERVICE_DEFINITIONS,
	...WORKFLOW_SERVICE_DEFINITIONS,
	...PLATFORM_SERVICE_DEFINITIONS,
	...SYSTEM_SERVICE_DEFINITIONS,
] as const;

export function createOSServiceCatalog(input: CreateOSServiceCatalogInput) {
	return createServiceCatalog(input, OS_SERVICE_CATALOG_DEFINITIONS);
}

export function getOSServiceCatalogDefinitionNames(): string[] {
	return OS_SERVICE_CATALOG_DEFINITIONS.map((definition) => definition.name);
}

export type OSServiceCatalog = ReturnType<typeof createOSServiceCatalog>;
