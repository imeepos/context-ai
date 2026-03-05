import type { OSContext, OSService } from "../types/os.js";
import type { LLMOSKernel } from "./index.js";

export interface CTPToolSchema {
	type: "object";
	properties: Record<string, { type: string; description?: string }>;
	required?: string[];
}

export interface CTPToolDefinition {
	name: string;
	description: string;
	parameters: CTPToolSchema;
	execute(input: unknown, context: OSContext): Promise<unknown>;
}

export interface CTPToolResponseEnvelope {
	result: unknown;
	meta: {
		service: string;
		traceId: string;
		durationMs: number;
	};
	audit?: {
		id: string;
		success: boolean;
		error?: string;
		errorCode?: string;
		timestamp: string;
	};
}

export function createCTPTool<Request, Response>(
	kernel: LLMOSKernel,
	service: OSService<Request, Response>,
	options: {
		description: string;
		parameters?: CTPToolSchema;
	},
): CTPToolDefinition {
	return {
		name: service.name,
		description: options.description,
		parameters: options.parameters ?? {
			type: "object",
			properties: {},
		},
		execute: async (input: unknown, context: OSContext): Promise<unknown> => {
			const execution = await kernel.executeWithMeta(service.name, input as Request, context);
			const audit = kernel.audit.findByTraceId(execution.meta.traceId);
			const response: CTPToolResponseEnvelope = {
				result: execution.result,
				meta: execution.meta,
				audit: audit
					? {
							id: audit.id,
							success: audit.success,
							error: audit.error,
							errorCode: audit.errorCode,
							timestamp: audit.timestamp,
						}
					: undefined,
			};
			return response;
		},
	};
}

export interface CTPToolMeta {
	description?: string;
	parameters?: CTPToolSchema;
}

export function createCTPToolsFromKernel(
	kernel: LLMOSKernel,
	metas: Record<string, CTPToolMeta> = {},
): CTPToolDefinition[] {
	return kernel.services.list().map((serviceName) => {
		const meta = metas[serviceName];
		return createCTPTool(
			kernel,
			{
				name: serviceName,
				execute: async (req, ctx) => kernel.execute(serviceName, req, ctx),
			},
			{
				description: meta?.description ?? `Kernel service: ${serviceName}`,
				parameters: meta?.parameters,
			},
		);
	});
}
