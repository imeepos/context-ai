import type { OSService } from "../../types/os.js";
import { createOSServiceClass } from "../../os-service-class.js";
import { APP_START } from "../../tokens.js";
import type {
	AppStartRequest,
	AppStartResponse,
	AppPageRenderer,
	AppPageSystemRuntime,
	AppPageRenderInput,
	AppPageRenderContext,
} from "../types.js";
import type { AppManager } from "../manager.js";
import { OSError } from "../../kernel/errors.js";
import { createSystemInputExecute, createSystemInputView } from "../../system-runtime-bridge.js";

function createPageSystemRuntime(
	systemRuntime: AppPageSystemRuntime | undefined,
	renderContext: AppPageRenderContext,
): AppPageRenderInput["system"] {
	return createSystemInputView(
		createSystemInputExecute((service, request, context) => {
			if (!systemRuntime) {
				throw new OSError(
					"E_SERVICE_NOT_FOUND",
					`App page system runtime is not configured for service call: ${service}`,
				);
			}
			return systemRuntime.execute(service, request, context ?? renderContext);
		}),
		systemRuntime?.listServices?.() ?? [],
	);
}

function ensureRunningState(manager: AppManager, appId: string): void {
	const current = manager.lifecycle.getState(appId);
	if (current === "running") return;
	if (current === "suspended") {
		manager.setState(appId, "running");
		return;
	}
	if (current === "installed" || current === "stopped") {
		manager.setState(appId, "resolved");
	}
	if (manager.lifecycle.getState(appId) === "resolved") {
		manager.setState(appId, "active");
	}
	if (manager.lifecycle.getState(appId) === "active") {
		manager.setState(appId, "running");
	}
}

export async function executeAppStart(
	manager: AppManager,
	renderer: AppPageRenderer,
	systemRuntime: AppPageSystemRuntime | undefined,
	req: AppStartRequest,
	ctx: AppPageRenderContext,
): Promise<AppStartResponse> {
	const manifest = manager.registry.get(req.appId);
	if (!manager.isEnabled(req.appId)) {
		throw new OSError("E_APP_NOT_REGISTERED", `App is disabled: ${req.appId}`);
	}
	const route = req.route ?? manifest.entry.pages.find((page) => page.default)?.route ?? manifest.entry.pages[0]?.route;
	if (!route) {
		throw new OSError("E_VALIDATION_FAILED", `No page route found for app: ${req.appId}`);
	}
	const resolved = manager.routes.resolve(route);
	if (resolved.appId !== req.appId) {
		throw new OSError("E_VALIDATION_FAILED", `Route ${route} does not belong to app ${req.appId}`);
	}
	try {
		const renderContext: AppPageRenderContext = {
			appId: resolved.appId,
			sessionId: ctx.sessionId,
			permissions: ctx.permissions,
			workingDirectory: ctx.workingDirectory,
			traceId: ctx.traceId,
		};
		const rendered = await renderer.render({
			appId: resolved.appId,
			page: resolved.page,
			context: renderContext,
			system: createPageSystemRuntime(systemRuntime, renderContext),
		});
		ensureRunningState(manager, req.appId);
		manager.routes.recordRender(route, { success: true });
		return {
			appId: resolved.appId,
			route,
			page: resolved.page,
			prompt: rendered.prompt,
			tools: rendered.tools,
			dataViews: rendered.dataViews,
			metadata: rendered.metadata,
		};
	} catch (error) {
		manager.routes.recordRender(route, {
			success: false,
			error: error instanceof Error ? error.message : String(error),
		});
		throw error;
	}
}

export const AppStartOSService = createOSServiceClass(APP_START, {
	requiredPermissions: ["app:read"],
	execute: ([manager, renderer, systemRuntime]: [AppManager, AppPageRenderer, AppPageSystemRuntime | undefined], req, ctx) =>
		executeAppStart(manager, renderer, systemRuntime, req, ctx),
});

export function createAppStartService(
	manager: AppManager,
	renderer: AppPageRenderer,
	systemRuntime?: AppPageSystemRuntime,
): OSService<AppStartRequest, AppStartResponse> {
	return new AppStartOSService(manager, renderer, systemRuntime);
}
