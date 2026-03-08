import { isAbsolute, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import type { AppPageRenderContext, Page } from "../app-manager/index.js";
import type { AppPageEntry } from "../app-manager/manifest.js";

type AppPageModule = {
	entryPage?: Page;
	getContext?: Page;
	createContext?: Page;
	default?: Page;
};

export interface LoadedAppPageModule {
	resolvedPath: string;
	contextFactory: Page;
}

function resolveContextFactory(pageModule: AppPageModule): Page | undefined {
	if (typeof pageModule.entryPage === "function") {
		return pageModule.entryPage;
	}
	if (typeof pageModule.getContext === "function") {
		return pageModule.getContext;
	}
	if (typeof pageModule.createContext === "function") {
		return pageModule.createContext;
	}
	if (typeof pageModule.default === "function") {
		return pageModule.default;
	}
	return undefined;
}

export async function loadAppPageModule(
	page: AppPageEntry,
	context: AppPageRenderContext,
): Promise<LoadedAppPageModule> {
	const resolvedPath = isAbsolute(page.path)
		? page.path
		: resolve(context.workingDirectory, page.path);
	const pageModule = (await import(pathToFileURL(resolvedPath).href)) as AppPageModule;
	const contextFactory = resolveContextFactory(pageModule);
	if (!contextFactory) {
		throw new Error(
			`Invalid app page module: ${resolvedPath}. Expected one of exports: entryPage/getContext/createContext/default`,
		);
	}
	return {
		resolvedPath,
		contextFactory,
	};
}
