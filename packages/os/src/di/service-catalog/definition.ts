import {
	createInjector,
	type InjectionTokenType,
	type Provider,
	type Type,
} from "@context-ai/core";
import type { OSService } from "../../types/os.js";
import { createOSServiceCatalogInputProviders } from "./input-providers.js";
import type { CreateOSServiceCatalogInput } from "./types.js";

export interface InjectableServiceCatalogDefinition<
	Name extends string = string,
	Service extends OSService<unknown, unknown, string> = OSService<unknown, unknown, string>,
	ServiceClass extends Type<Service> = Type<Service>,
> {
	name: Name;
	useClass: ServiceClass;
	providers: ReadonlyArray<Provider>;
}

export type ServiceCatalogDefinition<
	Name extends string = string,
	Service extends OSService<unknown, unknown, string> = OSService<unknown, unknown, string>,
> = InjectableServiceCatalogDefinition<Name, Service>;

export type ServiceCatalogDefinitions = readonly ServiceCatalogDefinition[];

export type ServiceCatalogService<Definition extends ServiceCatalogDefinition> = Definition extends InjectableServiceCatalogDefinition<
	string,
	infer Service
>
	? Service
	: never;

export type ServiceCatalogFromDefinitions<Definitions extends ServiceCatalogDefinitions> = {
	[Definition in Definitions[number] as Extract<Definition["name"], string>]: () => ServiceCatalogService<Definition>;
};

type ResolvedDependencyTypes<Dependencies extends readonly InjectionTokenType<any>[]> = {
	[K in keyof Dependencies]: Dependencies[K] extends InjectionTokenType<infer Dependency> ? Dependency : never;
};

export function provideOSServiceClass<
	Service,
	Dependencies extends readonly InjectionTokenType<any>[],
>(
	useClass: new (...dependencies: ResolvedDependencyTypes<Dependencies>) => Service,
	dependencies: Dependencies,
): ReadonlyArray<Provider> {
	return [
		{
			provide: useClass,
			useFactory: (...resolvedDependencies: ResolvedDependencyTypes<Dependencies>) =>
				new useClass(...resolvedDependencies),
			deps: [...dependencies],
		},
	];
}

export function defineInjectableOSService<
	Name extends string,
	Service extends OSService<unknown, unknown, string>,
	Dependencies extends readonly InjectionTokenType<any>[],
>(
	name: Name,
	useClass: new (...dependencies: ResolvedDependencyTypes<Dependencies>) => Service,
	dependencies: Dependencies,
): InjectableServiceCatalogDefinition<Name, Service, Type<Service>> {
	return {
		name,
		useClass,
		providers: provideOSServiceClass(useClass, dependencies),
	};
}

function createInjectableService(
	definition: InjectableServiceCatalogDefinition,
	input: CreateOSServiceCatalogInput,
): OSService<unknown, unknown, string> {
	const injector = createInjector([
		...createOSServiceCatalogInputProviders(input),
		...definition.providers,
	]);
	return injector.get(definition.useClass);
}

export function createServiceCatalog<Definitions extends ServiceCatalogDefinitions>(
	input: CreateOSServiceCatalogInput,
	definitions: Definitions,
): ServiceCatalogFromDefinitions<Definitions> {
	return Object.fromEntries(
		definitions.map((definition) => [
			definition.name,
			() => createInjectableService(definition, input),
		]),
	) as ServiceCatalogFromDefinitions<Definitions>;
}
