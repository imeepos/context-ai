import type { Provider } from "@context-ai/core";
import type { AppPageRenderContext, AppPageSystemRuntime } from "../app-manager/index.js";
import type { AppPageEntry } from "../app-manager/manifest.js";
import {
	createSystemInputView,
	createSystemRuntimeExecute,
	createSystemRuntimeView,
} from "../system-runtime-bridge.js";
import {
	OS_SYSTEM_RUNTIME,
	PAGE_ENTRY,
	PAGE_RENDER_CONTEXT,
	PAGE_REQUEST,
	PAGE_ROUTE,
	PAGE_SESSION_ID,
	PAGE_SYSTEM_INPUT,
	PAGE_SYSTEM_RUNTIME,
	PAGE_TRACE_ID,
	SYSTEM_EXECUTOR,
} from "./tokens.js";

export interface CreatePageProvidersInput {
	traceId: string;
	request: unknown;
	route: string;
	page: AppPageEntry;
	context: AppPageRenderContext;
}

export function createPageProviders(input: CreatePageProvidersInput): Provider[] {
	return [
		{ provide: PAGE_TRACE_ID, useValue: input.traceId },
		{ provide: PAGE_SESSION_ID, useValue: input.context.sessionId },
		{ provide: PAGE_REQUEST, useValue: input.request },
		{ provide: PAGE_ROUTE, useValue: input.route },
		{ provide: PAGE_ENTRY, useValue: input.page },
		{
			provide: PAGE_RENDER_CONTEXT,
			useValue: {
				...input.context,
				traceId: input.traceId,
			},
		},
		{
			provide: SYSTEM_EXECUTOR,
			useFactory: (
				systemRuntime: AppPageSystemRuntime,
				renderContext: AppPageRenderContext,
			) =>
				createSystemRuntimeView(
					createSystemRuntimeExecute((service, request, context) =>
						systemRuntime.execute(service, request, context ?? renderContext),
					),
					() => systemRuntime.listServices?.() ?? [],
				),
			deps: [OS_SYSTEM_RUNTIME, PAGE_RENDER_CONTEXT],
		},
		{
			provide: PAGE_SYSTEM_RUNTIME,
			useExisting: SYSTEM_EXECUTOR,
		},
		{
			provide: PAGE_SYSTEM_INPUT,
			useFactory: (systemRuntime: AppPageSystemRuntime) =>
				createSystemInputView(systemRuntime.execute, systemRuntime.listServices?.() ?? []),
			deps: [SYSTEM_EXECUTOR],
		},
	];
}
