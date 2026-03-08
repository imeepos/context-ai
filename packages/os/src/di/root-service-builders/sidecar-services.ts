import { HostAdapterRegistry } from "../../host-adapter/index.js";
import { MediaService } from "../../media-service/index.js";
import { ModelService } from "../../model-service/index.js";
import { PackageService } from "../../package-service/index.js";
import type { SecurityService } from "../../security-service/index.js";
import { UIService } from "../../ui-service/index.js";
import type { CreateDefaultLLMOSOptions } from "../../llm-os.types.js";

export interface OSRootSidecarServices {
	mediaService: MediaService;
	uiService: UIService;
	modelService: ModelService;
	packageService: PackageService;
	hostAdapters: HostAdapterRegistry;
}

export function createOSRootSidecarServices(
	securityService: SecurityService,
	options: CreateDefaultLLMOSOptions = {},
): OSRootSidecarServices {
	return {
		mediaService: new MediaService(),
		uiService: new UIService(),
		modelService: new ModelService(),
		packageService: new PackageService({
			signingSecret: options.packageSigningSecret,
			security: securityService,
		}),
		hostAdapters: new HostAdapterRegistry(),
	};
}
