import type { AppPageRenderContext, AppPageRenderInput, AppPageSystemRuntime } from "../../app-manager/index.js";
import type { AppPageEntry } from "../../app-manager/manifest.js";
import { defineToken } from "./shared.js";

export const PAGE_TRACE_ID = defineToken<string>("os.page.trace-id");
export const PAGE_SESSION_ID = defineToken<string>("os.page.session-id");
export const PAGE_REQUEST = defineToken<unknown>("os.page.request");
export const PAGE_ROUTE = defineToken<string>("os.page.route");
export const PAGE_ENTRY = defineToken<AppPageEntry>("os.page.entry");
export const PAGE_RENDER_CONTEXT = defineToken<AppPageRenderContext>("os.page.render-context");
export const PAGE_SYSTEM_RUNTIME = defineToken<AppPageSystemRuntime>("os.page.system-runtime");
export const PAGE_SYSTEM_INPUT = defineToken<AppPageRenderInput["system"]>("os.page.system-input");
export const SYSTEM_EXECUTOR = defineToken<AppPageSystemRuntime>("os.system-executor");
