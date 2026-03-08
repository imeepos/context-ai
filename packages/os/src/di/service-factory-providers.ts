import { Injector, type Provider } from "@context-ai/core";
import { OS_SERVICE_CATALOG_DEFINITIONS } from "./service-definitions.js";
import type { ServiceCatalogDefinitions } from "./service-catalog/definition.js";
import { OS_SERVICE_FACTORIES } from "./tokens.js";

export function createOSServiceFactoryProviders(
	definitions: ServiceCatalogDefinitions = OS_SERVICE_CATALOG_DEFINITIONS,
): Provider[] {
	return definitions.flatMap((definition) => [
		...definition.providers,
		{
			provide: OS_SERVICE_FACTORIES,
			multi: "record" as const,
			key: definition.name,
			useFactory: (injector: Injector) => () => injector.get(definition.useClass),
			deps: [Injector],
		},
	]);
}
