import { HostAdapterExecuteOSService } from "../../host-adapter/index.js";
import { MediaInspectOSService } from "../../media-service/index.js";
import { ModelGenerateOSService } from "../../model-service/index.js";
import { PackageInstallOSService, PackageListOSService } from "../../package-service/index.js";
import {
	HOST_EXECUTE,
	MEDIA_INSPECT,
	MODEL_GENERATE,
	PACKAGE_INSTALL,
	PACKAGE_LIST,
	UI_RENDER,
} from "../../tokens.js";
import { UIRenderOSService } from "../../ui-service/index.js";
import { OS_HOST_ADAPTERS, OS_MEDIA, OS_MODEL, OS_PACKAGE, OS_UI } from "../tokens.js";
import { defineInjectableOSService } from "./definition.js";

export const PLATFORM_EXTENSION_SERVICE_DEFINITIONS = [
	defineInjectableOSService(MEDIA_INSPECT, MediaInspectOSService, [OS_MEDIA] as const),
	defineInjectableOSService(UI_RENDER, UIRenderOSService, [OS_UI] as const),
	defineInjectableOSService(MODEL_GENERATE, ModelGenerateOSService, [OS_MODEL] as const),
	defineInjectableOSService(PACKAGE_INSTALL, PackageInstallOSService, [OS_PACKAGE] as const),
	defineInjectableOSService(PACKAGE_LIST, PackageListOSService, [OS_PACKAGE] as const),
	defineInjectableOSService(HOST_EXECUTE, HostAdapterExecuteOSService, [OS_HOST_ADAPTERS] as const),
] as const;
