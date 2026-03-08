import { createInjector, type Injector } from "@context-ai/core";
import type { AppManager } from "../app-manager/index.js";
import type { AppManifestV1 } from "../app-manager/manifest.js";
import { OS_APP_MANAGER, CURRENT_APP_ID, CURRENT_APP_MANIFEST, CURRENT_APP_PERMISSIONS, CURRENT_APP_QUOTA } from "./tokens.js";

export function createAppInjector(osInjector: Injector, manifest: AppManifestV1): Injector {
	return createInjector(
		[
			{ provide: CURRENT_APP_ID, useValue: manifest.id },
			{ provide: CURRENT_APP_MANIFEST, useValue: manifest },
			{ provide: CURRENT_APP_PERMISSIONS, useValue: [...manifest.permissions] },
			{
				provide: CURRENT_APP_QUOTA,
				useFactory: (appManager: AppManager) => appManager.quota.getQuota(manifest.id),
				deps: [OS_APP_MANAGER],
			},
		],
		osInjector,
		"application",
	);
}
