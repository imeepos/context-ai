import type { Injector, OnDestroy } from "@context-ai/core";
import type { AppManifestV1 } from "../app-manager/manifest.js";
import { createAppInjector } from "./create-app-injector.js";

export class AppRuntimeRegistry implements OnDestroy {
	private readonly injectors = new Map<string, Injector>();

	constructor(private readonly osInjector: Injector) {}

	has(appId: string): boolean {
		return this.injectors.has(appId);
	}

	get(appId: string): Injector {
		const injector = this.injectors.get(appId);
		if (!injector) {
			throw new Error(`App injector not found: ${appId}`);
		}
		return injector;
	}

	ensure(manifest: AppManifestV1): Injector {
		return this.injectors.get(manifest.id) ?? this.create(manifest);
	}

	create(manifest: AppManifestV1): Injector {
		this.destroy(manifest.id);
		const injector = createAppInjector(this.osInjector, manifest);
		this.injectors.set(manifest.id, injector);
		return injector;
	}

	destroy(appId: string): void {
		const injector = this.injectors.get(appId);
		if (!injector) {
			return;
		}
		this.injectors.delete(appId);
		void injector.destroy();
	}

	async destroyAll(): Promise<void> {
		const injectors = [...this.injectors.values()];
		this.injectors.clear();
		for (const injector of injectors) {
			await injector.destroy();
		}
	}

	async onDestroy(): Promise<void> {
		await this.destroyAll();
	}
}
