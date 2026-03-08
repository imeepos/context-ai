import type {
	AppManager,
	AppPageRenderInput,
	AppPageRenderer,
	AppPageSystemRuntime,
} from "../app-manager/index.js";
import type { LLMOSKernel } from "../kernel/index.js";
import {
	createSystemRuntimeExecute,
	createSystemRuntimeView,
} from "../system-runtime-bridge.js";
import type { AppRuntimeRegistry } from "./app-runtime-registry.js";
import { createPageInjector } from "./create-page-injector.js";
import { loadAppPageModule } from "./page-module-loader.js";
import { toAppPageRenderResult } from "./page-render-output.js";
import { PAGE_RENDER_CONTEXT, PAGE_SYSTEM_INPUT } from "./tokens.js";

export function createAppPageSystemRuntime(kernel: LLMOSKernel): AppPageSystemRuntime {
	return createSystemRuntimeView(
		createSystemRuntimeExecute((service, request, context) => kernel.execute(service, request, context)),
		() => kernel.services.list(),
	);
}

export interface CreateAppPageRendererInput {
	appManager: AppManager;
	getAppRuntimeRegistry: () => AppRuntimeRegistry | undefined;
}

export function createAppPageRenderer(input: CreateAppPageRendererInput): AppPageRenderer {
	return {
		render: async ({ page, appId, context }: AppPageRenderInput) => {
			const appRuntimeRegistry = input.getAppRuntimeRegistry();
			if (!appRuntimeRegistry) {
				throw new Error("App runtime registry is not initialized");
			}
			const manifest = input.appManager.registry.get(appId);
			const appInjector = appRuntimeRegistry.ensure(manifest);
			const pageInjector = createPageInjector(appInjector, {
				request: { appId, route: page.route, pageId: page.id },
				route: page.route,
				page,
				context,
			});
			try {
				const { contextFactory } = await loadAppPageModule(page, context);
				const injectedContext = pageInjector.get(PAGE_RENDER_CONTEXT);
				const system = pageInjector.get(PAGE_SYSTEM_INPUT);
				const ctpNode = await contextFactory({
					appId,
					page,
					context: injectedContext,
					system,
				});
				const { render: renderCTP } = await import("@context-ai/ctp");
				const rendered = await renderCTP(ctpNode);
				return toAppPageRenderResult(page, rendered);
			} finally {
				await pageInjector.destroy();
			}
		},
	};
}
