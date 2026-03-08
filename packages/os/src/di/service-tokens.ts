import type {
	ServiceCatalogDefinition,
	ServiceCatalogDefinitions,
	ServiceCatalogService,
} from "./service-catalog/definition.js";
import type { ServiceRequest, ServiceResponse, Token } from "../types/os.js";

export type ServiceTokenOfDefinition<Definition extends ServiceCatalogDefinition> = Token<
	ServiceRequest<ServiceCatalogService<Definition>>,
	ServiceResponse<ServiceCatalogService<Definition>>,
	Extract<Definition["name"], string>
>;

export type ServiceTokensOfDefinitions<Definitions extends ServiceCatalogDefinitions> = {
	[Definition in Definitions[number] as Extract<Definition["name"], string>]: ServiceTokenOfDefinition<Definition>;
};

export function createServiceTokens<Definitions extends ServiceCatalogDefinitions>(
	definitions: Definitions,
): ServiceTokensOfDefinitions<Definitions> {
	const token = <Definition extends Definitions[number]>(
		definition: Definition,
	): ServiceTokenOfDefinition<Definition> => definition.name as ServiceTokenOfDefinition<Definition>;

	return Object.fromEntries(
		definitions.map((definition) => [definition.name, token(definition)]),
	) as ServiceTokensOfDefinitions<Definitions>;
}
