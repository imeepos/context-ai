import { Type, type Static } from "@sinclair/typebox";
import type { Action, Token } from "../tokens.js";
import type { Injector } from "@context-ai/core";

// ============================================================================
// Model Generate Action - 请求/响应 Schema 定义
// ============================================================================

/**
 * LLM 生成请求 Schema
 */
export const ModelGenerateRequestSchema = Type.Object({
	/** 模型名称 */
	model: Type.String({ description: "Model name" }),
	/** 提示词 */
	prompt: Type.String({ description: "Prompt text" }),
	/** 温度参数（0-1），控制输出随机性 */
	temperature: Type.Optional(Type.Number({ description: "Temperature (0-1), controls output randomness", minimum: 0, maximum: 1 })),
});

/** LLM 生成请求 TypeScript 类型 */
export type ModelGenerateRequest = Static<typeof ModelGenerateRequestSchema>;

/**
 * LLM 生成响应 Schema
 */
export const ModelGenerateResponseSchema = Type.Object({
	/** 使用的模型名称 */
	model: Type.String({ description: "Model name used" }),
	/** 生成的输出文本 */
	output: Type.String({ description: "Generated output text" }),
});

/** LLM 生成响应 TypeScript 类型 */
export type ModelGenerateResponse = Static<typeof ModelGenerateResponseSchema>;

// ============================================================================
// Model Generate Action - Token 定义
// ============================================================================

/**
 * LLM 生成令牌
 */
export const MODEL_GENERATE_TOKEN: Token<typeof ModelGenerateRequestSchema, typeof ModelGenerateResponseSchema> = "model.generate";

// ============================================================================
// Model Generate Action - 权限定义
// ============================================================================

/**
 * 模型调用权限
 */
export const MODEL_INVOKE_PERMISSION = "model:invoke";

// ============================================================================
// Model Generate Action - Provider 接口
// ============================================================================

/**
 * 模型提供者接口
 *
 * 参考自 packages/os/src/model-service/index.ts 中的 ModelProvider 接口
 */
export interface ModelProvider {
	/** 提供者名称 */
	name: string;
	/** 生成文本 */
	generate(request: ModelGenerateRequest): Promise<string>;
}

/**
 * 模型提供者注册表 Token
 *
 * 用于通过 Injector 注入 ModelProvider 实例
 */
export const MODEL_PROVIDER_REGISTRY = Symbol.for("MODEL_PROVIDER_REGISTRY");

/**
 * 模型提供者注册表
 */
export class ModelProviderRegistry {
	private readonly providers = new Map<string, ModelProvider>();

	register(provider: ModelProvider): void {
		this.providers.set(provider.name, provider);
	}

	get(name: string): ModelProvider | undefined {
		return this.providers.get(name);
	}

	getAvailableModels(): string[] {
		return Array.from(this.providers.keys());
	}
}

// ============================================================================
// Model Generate Action - Action 定义
// ============================================================================

/**
 * LLM 生成 Action
 *
 * 核心能力：调用 LLM 模型生成文本内容。
 *
 * 参考自 packages/os/src/model-service/index.ts 中的 ModelService 实现。
 *
 * 设计要点：
 * - 使用 TypeBox 定义 Schema
 * - 权限控制：需要 model:invoke 权限
 * - 使用 Provider 模式，通过 Injector 获取 ModelProviderRegistry
 * - 支持多个模型提供者（需要预先注册）
 * - 返回 { model, output } 结构（与 OS 包保持一致）
 *
 * 使用方式:
 * // 1. 注册 ModelProvider
 * const registry = new ModelProviderRegistry();
 * registry.register({
 *     name: 'gpt-4',
 *     generate: async (req) => {
 *         // 调用 OpenAI API
 *         return 'Generated text';
 *     }
 * });
 *
 * // 2. 执行 action
 * const result = await actionExecuter.execute(MODEL_GENERATE_TOKEN, {
 *     model: 'gpt-4',
 *     prompt: 'What is the capital of France?',
 *     temperature: 0.7
 * });
 * console.log(result.output); // 'Generated text'
 */
export const modelGenerateAction: Action<typeof ModelGenerateRequestSchema, typeof ModelGenerateResponseSchema> = {
	type: MODEL_GENERATE_TOKEN,
	description: "Generate text using an LLM model via registered provider",
	request: ModelGenerateRequestSchema,
	response: ModelGenerateResponseSchema,
	requiredPermissions: [MODEL_INVOKE_PERMISSION],
	dependencies: [],
	execute: async (params: ModelGenerateRequest, injector: Injector): Promise<ModelGenerateResponse> => {
		// 尝试从 Injector 获取 ModelProviderRegistry
		const registry = injector.get<ModelProviderRegistry>(MODEL_PROVIDER_REGISTRY);

		if (!registry) {
			throw new Error("ModelProviderRegistry not found in injector. Please register MODEL_PROVIDER_REGISTRY.");
		}

		const provider = registry.get(params.model);
		if (!provider) {
			const availableModels = registry.getAvailableModels();
			throw new Error(
				`Model provider not found: ${params.model}. ` +
				`Available models: ${availableModels.length > 0 ? availableModels.join(', ') : 'none'}`
			);
		}

		const output = await provider.generate(params);

		return {
			model: params.model,
			output,
		};
	},
};
