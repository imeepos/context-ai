import { OSError } from "../kernel/errors.js";
import { createOSServiceClass } from "../os-service-class.js";
import { MODEL_GENERATE } from "../tokens.js";
import type { OSService } from "../types/os.js";

export interface ModelGenerateRequest {
	model: string;
	prompt: string;
	temperature?: number;
}

export interface ModelGenerateResponse {
	model: string;
	output: string;
}

export interface ModelProvider {
	name: string;
	generate(request: ModelGenerateRequest): Promise<string>;
}

export class ModelService {
	private readonly providers = new Map<string, ModelProvider>();

	register(provider: ModelProvider): void {
		this.providers.set(provider.name, provider);
	}

	async generate(request: ModelGenerateRequest): Promise<ModelGenerateResponse> {
		const provider = this.providers.get(request.model);
		if (!provider) throw new OSError("E_SERVICE_NOT_FOUND", `Model provider not found: ${request.model}`);
		const output = await provider.generate(request);
		return {
			model: request.model,
			output,
		};
	}
}

export const ModelGenerateOSService = createOSServiceClass(MODEL_GENERATE, {
	requiredPermissions: ["model:invoke"],
	execute: ([modelService]: [ModelService], req) => modelService.generate(req),
});

export function createModelGenerateService(modelService: ModelService): OSService<ModelGenerateRequest, ModelGenerateResponse> {
	return new ModelGenerateOSService(modelService);
}
