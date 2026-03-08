import { fileURLToPath } from "node:url";
import type { AppManifestV1 } from "../app-manager/manifest.js";
import type { ModelService } from "../model-service/index.js";
import { createSystemTaskManifest } from "../task-runtime/index.js";

export function registerDefaultModels(modelService: ModelService): void {
	modelService.register({
		name: "echo",
		generate: async (request) => `echo:${request.prompt}`,
	});
}

export function createDefaultSystemTaskManifest(): AppManifestV1 {
	const systemTaskPagePath = fileURLToPath(new URL("../task-runtime/system-task.page.js", import.meta.url));
	return createSystemTaskManifest(systemTaskPagePath);
}
