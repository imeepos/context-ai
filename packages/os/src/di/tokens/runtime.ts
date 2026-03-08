import type { Injector } from "@context-ai/core";
import type { AppManifestV1 } from "../../app-manager/manifest.js";
import type { CreateDefaultLLMOSOptions } from "../../llm-os.types.js";
import type { AppRuntimeRegistry } from "../app-runtime-registry.js";
import type { OSRootRuntime } from "../root-runtime.js";
import { defineRecordToken, defineToken, type OSServiceFactory } from "./shared.js";

export const OS_OPTIONS = defineToken<CreateDefaultLLMOSOptions>("os.options");
export const OS_INJECTOR = defineToken<Injector>("os.injector");
export const OS_ROOT_RUNTIME = defineToken<OSRootRuntime>("os.root-runtime");
export const OS_APP_RUNTIME_REGISTRY = defineToken<AppRuntimeRegistry>("os.app-runtime-registry");
export const OS_SYSTEM_TASK_MANIFEST = defineToken<AppManifestV1>("os.system-task-manifest");
export const OS_SERVICE_FACTORIES = defineRecordToken<OSServiceFactory>("os.service-factories");
export const OS_SERVICE_TOKENS = defineToken<OSRootRuntime["serviceTokens"]>("os.service-tokens");
