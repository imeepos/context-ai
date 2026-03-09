import type { OSService } from "../../types/os.js";
import { createOSServiceClass } from "../../os-service-class.js";
import { APP_PAGE_RENDER, RENDER } from "../../tokens.js";
import type {
	RouteRenderRequest,
	RouteRenderResponse,
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

function createRouteRenderService(
	name: typeof APP_PAGE_RENDER | typeof RENDER,
	manager: AppManager,
	renderer: AppPageRenderer,
	systemRuntime?: AppPageSystemRuntime,
): OSService<RouteRenderRequest, RouteRenderResponse> {
	return {
		name,
		requiredPermissions: ["app:read"],
		execute: async (req, ctx) => {
			const resolved = manager.routes.resolve(req.route);
			if (!manager.isEnabled(resolved.appId)) {
				manager.routes.recordRender(req.route, {
					success: false,
					error: `App is disabled: ${resolved.appId}`,
				});
				throw new OSError("E_APP_NOT_REGISTERED", `App is disabled: ${resolved.appId}`);
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
				manager.routes.recordRender(req.route, { success: true });
				return {
					appId: resolved.appId,
					page: resolved.page,
					prompt: rendered.prompt,
					tools: rendered.tools,
					dataViews: rendered.dataViews,
					metadata: rendered.metadata,
				};
			} catch (error) {
				manager.routes.recordRender(req.route, {
					success: false,
					error: error instanceof Error ? error.message : String(error),
				});
				throw error;
			}
		},
	};
}

export const AppPageRenderOSService = createOSServiceClass(APP_PAGE_RENDER, {
	requiredPermissions: ["app:read"],
	execute: ([manager, renderer, systemRuntime]: [AppManager, AppPageRenderer, AppPageSystemRuntime | undefined], req, ctx) =>
		createRouteRenderService(APP_PAGE_RENDER, manager, renderer, systemRuntime).execute(req, ctx),
});

export function createAppPageRenderService(
	manager: AppManager,
	renderer: AppPageRenderer,
	systemRuntime?: AppPageSystemRuntime,
): OSService<RouteRenderRequest, RouteRenderResponse> {
	return new AppPageRenderOSService(manager, renderer, systemRuntime);
}

export const RenderOSService = createOSServiceClass(RENDER, {
	requiredPermissions: ["app:read"],
	execute: ([manager, renderer, systemRuntime]: [AppManager, AppPageRenderer, AppPageSystemRuntime | undefined], req, ctx) =>
		createRouteRenderService(RENDER, manager, renderer, systemRuntime).execute(req, ctx),
});

export function createRenderService(
	manager: AppManager,
	renderer: AppPageRenderer,
	systemRuntime?: AppPageSystemRuntime,
): OSService<RouteRenderRequest, RouteRenderResponse> {
	return new RenderOSService(manager, renderer, systemRuntime);
}
