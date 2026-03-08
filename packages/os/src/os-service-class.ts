import { Injectable } from "@context-ai/core";
import type { OSContext, OSService, RequestOfToken, ResponseOfToken, Token } from "./types/os.js";

type AnyServiceToken = Token<unknown, unknown, string>;

export type OSServiceClass<
	T extends AnyServiceToken,
	Dependencies extends unknown[] = [],
> = new (...dependencies: Dependencies) => OSService<RequestOfToken<T>, ResponseOfToken<T>>;

export interface CreateOSServiceClassOptions<
	T extends AnyServiceToken,
	Dependencies extends unknown[],
> {
	requiredPermissions?: string[];
	dependencies?: Array<Token<unknown, unknown>>;
	execute: (
		resolvedDependencies: Dependencies,
		req: RequestOfToken<T>,
		ctx: OSContext,
	) => Promise<ResponseOfToken<T>> | ResponseOfToken<T>;
}

export function createOSServiceClass<
	T extends AnyServiceToken,
	Dependencies extends unknown[],
>(
	token: T,
	options: CreateOSServiceClassOptions<T, Dependencies>,
): OSServiceClass<T, Dependencies> {
	const serviceToken = token as Token<RequestOfToken<T>, ResponseOfToken<T>, string>;
	const requiredPermissions = options.requiredPermissions;
	const dependencies = options.dependencies;
	const execute = options.execute;

	@Injectable({ providedIn: null })
	class GeneratedOSService implements OSService<RequestOfToken<T>, ResponseOfToken<T>> {
		readonly name = serviceToken;
		readonly requiredPermissions = requiredPermissions;
		readonly dependencies = dependencies;
		private readonly resolvedDependencies: Dependencies;

		constructor(...resolvedDependencies: Dependencies) {
			this.resolvedDependencies = resolvedDependencies;
		}

		async execute(req: RequestOfToken<T>, ctx: OSContext): Promise<ResponseOfToken<T>> {
			return await execute(this.resolvedDependencies, req, ctx);
		}
	}

	return GeneratedOSService;
}

export type DelegatingOSServiceClass<
	T extends AnyServiceToken,
	Dependencies extends unknown[],
> = OSServiceClass<T, Dependencies>;

export function createDelegatingOSServiceClass<
	T extends AnyServiceToken,
	Dependencies extends unknown[],
>(
	token: T,
	requiredPermissions: string[],
	factory: (...dependencies: Dependencies) => OSService<RequestOfToken<T>, ResponseOfToken<T>, string>,
	dependencies?: Array<Token<unknown, unknown>>,
): DelegatingOSServiceClass<T, Dependencies> {
	return createOSServiceClass(token, {
		requiredPermissions,
		dependencies,
		execute: (resolvedDependencies, req, ctx) => factory(...resolvedDependencies).execute(req, ctx),
	});
}
