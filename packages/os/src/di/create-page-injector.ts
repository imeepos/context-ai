import { randomUUID } from "node:crypto";
import { createInjector, type Injector } from "@context-ai/core";
import type { AppPageRenderContext } from "../app-manager/index.js";
import type { AppPageEntry } from "../app-manager/manifest.js";
import { createPageProviders } from "./page-providers.js";

export interface CreatePageInjectorInput {
	request: unknown;
	route: string;
	page: AppPageEntry;
	context: AppPageRenderContext;
}

export function createPageInjector(
	appInjector: Injector,
	input: CreatePageInjectorInput,
): Injector {
	return createInjector(
		createPageProviders({
			...input,
			traceId: input.context.traceId ?? randomUUID(),
		}),
		appInjector,
		"feature",
	);
}
