import { Type, type Static } from "@sinclair/typebox";
import type { Action, Token } from "../tokens.js";
import type { Injector } from "@context-ai/core";
import { STORE_SERVICE, type StoreService } from "./store-set.action.js";

// ============================================================================
// Store Get Action - 请求/响应 Schema 定义
// ============================================================================

/**
 * KV 存储读取请求 Schema
 */
export const StoreGetRequestSchema = Type.Object({
	/** 要读取的键名 */
	key: Type.String({ description: "The key to retrieve the value for" }),
});

/** KV 存储读取请求 TypeScript 类型 */
export type StoreGetRequest = Static<typeof StoreGetRequestSchema>;

/**
 * KV 存储读取响应 Schema
 */
export const StoreGetResponseSchema = Type.Object({
	/** 存储的值（如果键不存在则为 undefined） */
	value: Type.Optional(Type.Unknown({ description: "The stored value (undefined if key doesn't exist)" })),
});

/** KV 存储读取响应 TypeScript 类型 */
export type StoreGetResponse = Static<typeof StoreGetResponseSchema>;

// ============================================================================
// Store Get Action - Token 定义
// ============================================================================

/**
 * KV 存储读取令牌
 *
 * 唯一标识 KV 存储读取能力，用于 Action 类型识别和依赖注入。
 */
export const STORE_GET_TOKEN: Token<typeof StoreGetRequestSchema, typeof StoreGetResponseSchema> = "store.get";

// ============================================================================
// Store Get Action - 权限定义
// ============================================================================

/**
 * 存储读取权限
 */
export const STORE_READ_PERMISSION = "store:read";

// ============================================================================
// Store Get Action - Action 定义
// ============================================================================

/**
 * KV 存储读取 Action
 *
 * 核心能力：从持久化存储中读取键值对。
 *
 * 参考自 packages/os/src/store-service/index.ts 中的 StoreService.get 方法。
 *
 * 设计要点：
 * - 使用 TypeBox 定义 Schema
 * - 权限控制：需要 store:read 权限
 * - 通过 Injector 获取 StoreService 依赖
 * - 返回 { value } 结构（与 OS 包保持一致）
 * - 如果键不存在，value 为 undefined
 *
 * 使用方式:
 * const result = await actionExecuter.execute(STORE_GET_TOKEN, {
 *     key: 'config.theme'
 * });
 * if (result.value !== undefined) {
 *     console.log(result.value);
 * }
 */
export const storeGetAction: Action<typeof StoreGetRequestSchema, typeof StoreGetResponseSchema> = {
	type: STORE_GET_TOKEN,
	description: "Retrieve a value from persistent storage by key",
	request: StoreGetRequestSchema,
	response: StoreGetResponseSchema,
	requiredPermissions: [STORE_READ_PERMISSION],
	dependencies: [],
	execute: async (params: StoreGetRequest, injector: Injector): Promise<StoreGetResponse> => {
		// 通过 Injector 获取 StoreService 依赖
		const storeService = injector.get<StoreService>(STORE_SERVICE);

		// 读取数据
		const value = storeService.get(params.key);

		return { value };
	},
};
