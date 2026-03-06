import type { AppManifest } from "./manifest.js";
import { validateManifest } from "./manifest.js";
import { OSError } from "../kernel/errors.js";

export class AppRegistry {
	private readonly manifests = new Map<string, AppManifest>();

	has(appId: string): boolean {
		return this.manifests.has(appId);
	}

	install(manifest: AppManifest): void {
		validateManifest(manifest);
		this.manifests.set(manifest.id, manifest);
	}

	uninstall(appId: string): void {
		this.manifests.delete(appId);
	}

	get(appId: string): AppManifest {
		const manifest = this.manifests.get(appId);
		if (!manifest) throw new OSError("E_APP_NOT_REGISTERED", `App not found: ${appId}`);
		return manifest;
	}

	list(): AppManifest[] {
		return [...this.manifests.values()];
	}
}
