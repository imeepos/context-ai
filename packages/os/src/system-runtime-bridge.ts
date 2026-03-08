import type {
	AppPageRenderContext,
	AppPageRenderInput,
	AppPageSystemRuntime,
} from "./app-manager/index.js";

export function createSystemRuntimeExecute(
	executor: (service: string, request: unknown, context: AppPageRenderContext) => Promise<unknown>,
): AppPageSystemRuntime["execute"] {
	return ((service: string, request: unknown, context: AppPageRenderContext) =>
		executor(service, request, context)) as AppPageSystemRuntime["execute"];
}

export function createSystemInputExecute(
	executor: (service: string, request: unknown, context?: AppPageRenderContext) => Promise<unknown>,
): AppPageRenderInput["system"]["execute"] {
	return ((service: string, request: unknown, context?: AppPageRenderContext) =>
		executor(service, request, context)) as AppPageRenderInput["system"]["execute"];
}

export function createSystemRuntimeView(
	execute: AppPageSystemRuntime["execute"],
	listServices?: () => string[],
): AppPageSystemRuntime {
	return {
		execute,
		listServices,
	};
}

export function createSystemInputView(
	execute: AppPageRenderInput["system"]["execute"],
	services: string[],
): AppPageRenderInput["system"] {
	return {
		execute,
		services,
	};
}
