import { Type, type Static } from "@sinclair/typebox";
import type { Action, Token } from "../tokens.js";
import type { Injector } from "@context-ai/core";
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

// ============================================================================
// Store Set Action - 类型定义
// ============================================================================

/**
 * 存储值类型（递归定义，支持 JSON 可序列化类型）
 *
 * 参考 packages/os/src/store-service/index.ts
 */
export type StoreValue = string | number | boolean | null | { [k: string]: StoreValue } | StoreValue[];

// ============================================================================
// Store Service - 持久化存储服务
// ============================================================================

/**
 * 存储服务 Token
 */
export const STORE_SERVICE = Symbol("STORE_SERVICE");

/**
 * 存储服务接口
 *
 * 参考 packages/os/src/store-service/index.ts 中的 StoreService 实现
 */
export interface StoreService {
	set(key: string, value: StoreValue): void;
	get(key: string): StoreValue | undefined;
	save(): Promise<void>;
	load(): Promise<void>;
}

/**
 * JSON 文件存储服务实现
 *
 * 参考 packages/os/src/store-service/index.ts 中的 JsonFileStoreAdapter
 */
export class JsonFileStoreService implements StoreService {
	private readonly kv = new Map<string, StoreValue>();

	constructor(private readonly path: string) {}

	set(key: string, value: StoreValue): void {
		this.kv.set(key, value);
	}

	get(key: string): StoreValue | undefined {
		return this.kv.get(key);
	}

	async save(): Promise<void> {
		const dir = dirname(this.path);
		await mkdir(dir, { recursive: true });
		await writeFile(this.path, JSON.stringify(Object.fromEntries(this.kv.entries()), null, 2), "utf8");
	}

	async load(): Promise<void> {
		if (!existsSync(this.path)) return;
		const raw = await readFile(this.path, "utf8");
		const parsed = JSON.parse(raw) as Record<string, StoreValue>;
		for (const [key, value] of Object.entries(parsed)) {
			this.kv.set(key, value);
		}
	}
}

// ============================================================================
// Store Set Action - 请求/响应 Schema 定义
// ============================================================================

/**
 * KV 存储写入请求 Schema
 */
export const StoreSetRequestSchema = Type.Object({
	/** 存储键名 */
	key: Type.String({ description: "The key to store the value under" }),
	/** 存储值（支持任意 JSON 可序列化类型） */
	value: Type.Unknown({ description: "The value to store (any JSON-serializable type)" }),
});

/** KV 存储写入请求 TypeScript 类型 */
export type StoreSetRequest = Static<typeof StoreSetRequestSchema>;

/**
 * KV 存储写入响应 Schema
 */
export const StoreSetResponseSchema = Type.Object({
	/** 操作是否成功 */
	ok: Type.Literal(true, { description: "Operation success indicator" }),
});

/** KV 存储写入响应 TypeScript 类型 */
export type StoreSetResponse = Static<typeof StoreSetResponseSchema>;

// ============================================================================
// Store Set Action - Token 定义
// ============================================================================

/**
 * KV 存储写入令牌
 *
 * 唯一标识 KV 存储写入能力，用于 Action 类型识别和依赖注入。
 */
export const STORE_SET_TOKEN: Token<typeof StoreSetRequestSchema, typeof StoreSetResponseSchema> = "store.set";

// ============================================================================
// Store Set Action - 权限定义
// ============================================================================

/**
 * 存储写入权限
 */
export const STORE_WRITE_PERMISSION = "store:write";

// ============================================================================
// Store Set Action - Action 定义
// ============================================================================

/**
 * KV 存储写入 Action
 *
 * 核心能力：将键值对写入持久化存储。
 *
 * 参考自 packages/os/src/store-service/index.ts 中的 StoreService.set 方法。
 *
 * 设计要点：
 * - 使用 TypeBox 定义 Schema
 * - 权限控制：需要 store:write 权限
 * - 支持任意 JSON 可序列化类型
 * - 通过 Injector 获取 StoreService 依赖
 * - 写入后自动持久化到文件
 * - 返回 { ok: true } 表示成功（与 OS 包保持一致）
 *
 * 使用方式:
 * const result = await actionExecuter.execute(STORE_SET_TOKEN, {
 *     key: 'config.theme',
 *     value: { mode: 'dark', color: 'blue' }
 * });
 * console.log(result.ok); // true
 */
export const storeSetAction: Action<typeof StoreSetRequestSchema, typeof StoreSetResponseSchema> = {
	type: STORE_SET_TOKEN,
	description: "Store a key-value pair in persistent storage",
	request: StoreSetRequestSchema,
	response: StoreSetResponseSchema,
	requiredPermissions: [STORE_WRITE_PERMISSION],
	dependencies: [],
	execute: async (params: StoreSetRequest, injector: Injector): Promise<StoreSetResponse> => {
		// 通过 Injector 获取 StoreService 依赖
		const storeService = injector.get<StoreService>(STORE_SERVICE);

		// 写入数据
		storeService.set(params.key, params.value as StoreValue);

		// 持久化到文件
		await storeService.save();

		return { ok: true };
	},
};
