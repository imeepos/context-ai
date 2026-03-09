import { Type, type Static } from "@sinclair/typebox";
import type { Action, Token } from "../tokens.js";
import type { Injector } from "@context-ai/core";

// ============================================================================
// Host Execute Action - 请求/响应 Schema 定义
// ============================================================================

/**
 * 宿主适配器请求 Schema
 */
export const HostExecuteRequestSchema = Type.Object({
	/** 适配器名称 */
	adapter: Type.String({ description: "Adapter name" }),
	/** 操作类型 */
	action: Type.String({ description: "Action to perform" }),
	/** 操作参数（可选） */
	payload: Type.Optional(Type.Unknown({ description: "Action payload (optional)" })),
});

/** 宿主适配器请求 TypeScript 类型 */
export type HostExecuteRequest = Static<typeof HostExecuteRequestSchema>;

/**
 * 宿主适配器响应 Schema
 */
export const HostExecuteResponseSchema = Type.Object({
	/** 执行结果 */
	result: Type.Unknown({ description: "Execution result" }),
});

/** 宿主适配器响应 TypeScript 类型 */
export type HostExecuteResponse = Static<typeof HostExecuteResponseSchema>;

// ============================================================================
// Host Execute Action - Token 定义
// ============================================================================

/**
 * 宿主执行令牌
 */
export const HOST_EXECUTE_TOKEN: Token<typeof HostExecuteRequestSchema, typeof HostExecuteResponseSchema> = "host.execute";

// ============================================================================
// Host Execute Action - 权限定义
// ============================================================================

/**
 * 宿主调用权限
 */
export const HOST_INVOKE_PERMISSION = "host:invoke";

// ============================================================================
// Host Execute Action - Adapter 接口
// ============================================================================

/**
 * 宿主适配器接口
 *
 * 参考自 packages/os/src/host-adapter/index.ts 中的 HostAdapter 接口
 */
export interface HostAdapter {
	/** 适配器名称 */
	name: string;
	/** 处理操作 */
	handle(action: string, payload?: unknown): Promise<unknown>;
}

/**
 * 宿主适配器注册表 Token
 *
 * 用于通过 Injector 注入 HostAdapterRegistry 实例
 */
export const HOST_ADAPTER_REGISTRY = Symbol.for("HOST_ADAPTER_REGISTRY");

/**
 * 宿主适配器注册表
 *
 * 参考自 packages/os/src/host-adapter/index.ts 中的 HostAdapterRegistry 实现
 */
export class HostAdapterRegistry {
	private readonly adapters = new Map<string, HostAdapter>();

	register(adapter: HostAdapter): void {
		this.adapters.set(adapter.name, adapter);
	}

	getAvailableAdapters(): string[] {
		return Array.from(this.adapters.keys());
	}

	async execute(request: HostExecuteRequest): Promise<unknown> {
		const adapter = this.adapters.get(request.adapter);
		if (!adapter) {
			const availableAdapters = this.getAvailableAdapters();
			throw new Error(
				`Host adapter not found: ${request.adapter}. ` +
				`Available adapters: ${availableAdapters.length > 0 ? availableAdapters.join(', ') : 'none'}`
			);
		}
		return adapter.handle(request.action, request.payload);
	}
}

// ============================================================================
// Host Execute Action - Action 定义
// ============================================================================

/**
 * 宿主执行 Action
 *
 * 核心能力：通过适配器模式执行宿主系统操作。
 *
 * 参考自 packages/os/src/host-adapter/index.ts 中的 HostAdapterRegistry 实现。
 *
 * 设计要点：
 * - 使用 TypeBox 定义 Schema
 * - 权限控制：需要 host:invoke 权限（高风险操作）
 * - 使用 Adapter 模式，通过 Injector 获取 HostAdapterRegistry
 * - 支持多个适配器（需要预先注册）
 * - 返回 { result } 结构（与 OS 包保持一致）
 *
 * 使用方式:
 * // 1. 注册 HostAdapter
 * const registry = new HostAdapterRegistry();
 * registry.register({
 *     name: 'shell',
 *     handle: async (action, payload) => {
 *         if (action === 'exec') {
 *             // 执行 shell 命令
 *             return { stdout: '...', stderr: '', exitCode: 0 };
 *         }
 *         throw new Error(`Unknown action: ${action}`);
 *     }
 * });
 *
 * // 2. 执行 action
 * const result = await actionExecuter.execute(HOST_EXECUTE_TOKEN, {
 *     adapter: 'shell',
 *     action: 'exec',
 *     payload: { command: 'ls -la' }
 * });
 * console.log(result.result);
 */
export const hostExecuteAction: Action<typeof HostExecuteRequestSchema, typeof HostExecuteResponseSchema> = {
	type: HOST_EXECUTE_TOKEN,
	description: "Execute operations on the host system via registered adapters (HIGH RISK)",
	request: HostExecuteRequestSchema,
	response: HostExecuteResponseSchema,
	requiredPermissions: [HOST_INVOKE_PERMISSION],
	dependencies: [],
	execute: async (params: HostExecuteRequest, injector: Injector): Promise<HostExecuteResponse> => {
		// 尝试从 Injector 获取 HostAdapterRegistry
		const registry = injector.get<HostAdapterRegistry>(HOST_ADAPTER_REGISTRY);

		if (!registry) {
			throw new Error("HostAdapterRegistry not found in injector. Please register HOST_ADAPTER_REGISTRY.");
		}

		const result = await registry.execute(params);

		return { result };
	},
};
