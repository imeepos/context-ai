import type { AppManifest, AppManifestV1 } from "./manifest.js";
import { normalizeManifest, validateManifest } from "./manifest.js";
import { OSError } from "../kernel/errors.js";

export class AppRegistry {
	private readonly manifests = new Map<string, AppManifestV1>();

	has(appId: string): boolean {
		return this.manifests.has(appId);
	}

	install(manifest: AppManifest): void {
		validateManifest(manifest);
		const normalized = normalizeManifest(manifest);
		this.manifests.set(normalized.id, normalized);
	}

	uninstall(appId: string): void {
		this.manifests.delete(appId);
	}

	get(appId: string): AppManifestV1 {
		const manifest = this.manifests.get(appId);
		if (!manifest) throw new OSError("E_APP_NOT_REGISTERED", `App not found: ${appId}`);
		return manifest;
	}

	list(): AppManifestV1[] {
		return [...this.manifests.values()];
	}
}
