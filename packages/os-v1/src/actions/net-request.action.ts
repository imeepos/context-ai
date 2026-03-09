import { Type, type Static } from "@sinclair/typebox";
import type { Action, Token } from "../tokens.js";
import type { Injector } from "@context-ai/core";

// ============================================================================
// Net Request Action - 请求/响应 Schema 定义
// ============================================================================

/**
 * HTTP 请求方法枚举
 */
export const HttpMethodSchema = Type.Union([
	Type.Literal("GET"),
	Type.Literal("POST"),
	Type.Literal("PUT"),
	Type.Literal("DELETE"),
	Type.Literal("PATCH"),
]);

/**
 * HTTP 请求配置 Schema
 */
export const NetRequestRequestSchema = Type.Object({
	/** 请求 URL */
	url: Type.String({ description: "The URL to send the request to" }),
	/** HTTP 方法，默认 GET */
	method: Type.Optional(HttpMethodSchema),
	/** 请求头 */
	headers: Type.Optional(Type.Record(Type.String(), Type.String(), { description: "Request headers" })),
	/** 请求体（字符串格式） */
	body: Type.Optional(Type.String({ description: "Request body (string format)" })),
	/** 超时时间（毫秒），默认 30000 */
	timeoutMs: Type.Optional(Type.Number({ description: "Request timeout in milliseconds (default: 30000)" })),
	/** 重试次数，默认 0 */
	retries: Type.Optional(Type.Number({ description: "Number of retries (default: 0)" })),
});

/** HTTP 请求配置 TypeScript 类型 */
export type NetRequestRequest = Static<typeof NetRequestRequestSchema>;

/**
 * HTTP 响应 Schema
 */
export const NetRequestResponseSchema = Type.Object({
	/** HTTP 状态码 */
	status: Type.Number({ description: "HTTP status code" }),
	/** 响应体（字符串格式） */
	body: Type.String({ description: "Response body (string format)" }),
	/** 响应头 */
	headers: Type.Record(Type.String(), Type.String(), { description: "Response headers" }),
});

/** HTTP 响应 TypeScript 类型 */
export type NetRequestResponse = Static<typeof NetRequestResponseSchema>;

// ============================================================================
// Net Request Action - Token 定义
// ============================================================================

/**
 * HTTP 请求令牌
 */
export const NET_REQUEST_TOKEN: Token<typeof NetRequestRequestSchema, typeof NetRequestResponseSchema> = "net.request";

// ============================================================================
// Net Request Action - 权限定义
// ============================================================================

/**
 * 网络请求权限
 */
export const NET_REQUEST_PERMISSION = "net:request";

// ============================================================================
// Net Request Action - Action 定义
// ============================================================================

/**
 * HTTP 请求 Action
 *
 * 核心能力：发送 HTTP 请求并返回响应。
 *
 * 参考自 packages/os/src/net-service/index.ts 中的 NetService 实现。
 *
 * 设计要点：
 * - 使用 TypeBox 定义 Schema
 * - 权限控制：需要 net:request 权限
 * - 支持所有标准 HTTP 方法
 * - 支持超时控制和重试机制
 * - 使用 Node.js 原生 fetch API
 * - 简化版：暂不包含熔断器和策略引擎（可通过 Injector 扩展）
 *
 * 使用方式:
 * const result = await actionExecuter.execute(NET_REQUEST_TOKEN, {
 *     url: 'https://api.example.com/data',
 *     method: 'POST',
 *     headers: { 'Content-Type': 'application/json' },
 *     body: JSON.stringify({ key: 'value' })
 * });
 * console.log(result.status, result.body);
 */
export const netRequestAction: Action<typeof NetRequestRequestSchema, typeof NetRequestResponseSchema> = {
	type: NET_REQUEST_TOKEN,
	description: "Send an HTTP request and return the response",
	request: NetRequestRequestSchema,
	response: NetRequestResponseSchema,
	requiredPermissions: [NET_REQUEST_PERMISSION],
	dependencies: [],
	execute: async (params: NetRequestRequest, _injector: Injector): Promise<NetRequestResponse> => {
		const method = params.method ?? "GET";
		const timeoutMs = params.timeoutMs ?? 30000;
		const retries = params.retries ?? 0;

		let lastError: unknown;

		// 重试逻辑（参考 NetService.request）
		for (let attempt = 0; attempt <= retries; attempt += 1) {
			try {
				const controller = new AbortController();
				const timeout = setTimeout(() => controller.abort(), timeoutMs);

				const response = await fetch(params.url, {
					method,
					headers: params.headers,
					body: params.body,
					signal: controller.signal,
				});

				clearTimeout(timeout);

				// 读取响应体
				const body = await response.text();

				// 转换响应头为普通对象
				const headers: Record<string, string> = {};
				response.headers.forEach((value, key) => {
					headers[key] = value;
				});

				return {
					status: response.status,
					body,
					headers,
				};
			} catch (error) {
				lastError = error;
				// 如果还有重试次数，继续下一次尝试
				if (attempt < retries) {
					continue;
				}
			}
		}

		// 所有重试都失败，抛出错误
		throw lastError instanceof Error ? lastError : new Error(String(lastError));
	},
};
