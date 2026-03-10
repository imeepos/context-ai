import { Type, type Static } from "@sinclair/typebox";
import type { Action, Token } from "../tokens.js";
import type { Injector } from "@context-ai/core";

// ============================================================================
// System Heartbeat Action - 请求/响应 Schema 定义
// ============================================================================

/**
 * 系统心跳请求 Schema
 */
export const SystemHeartbeatRequestSchema = Type.Object({
	/** 心跳消息（可选） */
	message: Type.Optional(Type.String({ description: "Optional heartbeat message" })),
});

/** 系统心跳请求 TypeScript 类型 */
export type SystemHeartbeatRequest = Static<typeof SystemHeartbeatRequestSchema>;

/**
 * 系统心跳响应 Schema
 */
export const SystemHeartbeatResponseSchema = Type.Object({
	/** 心跳时间戳 */
	timestamp: Type.Number({ description: "Heartbeat timestamp in milliseconds" }),
	/** 系统状态 */
	status: Type.Literal("healthy", { description: "System health status" }),
	/** 运行时长（毫秒） */
	uptime: Type.Number({ description: "System uptime in milliseconds" }),
});

/** 系统心跳响应 TypeScript 类型 */
export type SystemHeartbeatResponse = Static<typeof SystemHeartbeatResponseSchema>;

// ============================================================================
// System Heartbeat Action - Token 定义
// ============================================================================

/**
 * 系统心跳令牌
 */
export const SYSTEM_HEARTBEAT_TOKEN: Token<
	typeof SystemHeartbeatRequestSchema,
	typeof SystemHeartbeatResponseSchema
> = "system.heartbeat";

/**
 * 系统监控权限令牌
 */
export const SYSTEM_MONITOR_PERMISSION: string = "system:monitor";

// ============================================================================
// System Heartbeat Action - Action 定义
// ============================================================================

/**
 * 系统心跳 Action
 *
 * 核心能力：定期检测系统健康状态，记录运行时长和时间戳。
 *
 * 设计要点：
 * - 使用 TypeBox 定义 Schema
 * - 权限控制：需要 system:monitor 权限
 * - 轻量级操作：仅记录时间戳和运行时长
 * - 可扩展：未来可添加更多健康检查指标
 *
 * 使用方式:
 * const result = await actionExecuter.execute(SYSTEM_HEARTBEAT_TOKEN, {
 *     message: 'Periodic health check'
 * });
 */
export const systemHeartbeatAction: Action<
	typeof SystemHeartbeatRequestSchema,
	typeof SystemHeartbeatResponseSchema
> = {
	type: SYSTEM_HEARTBEAT_TOKEN,
	description: "Perform a system heartbeat check to verify system health and uptime",
	request: SystemHeartbeatRequestSchema,
	response: SystemHeartbeatResponseSchema,
	requiredPermissions: [SYSTEM_MONITOR_PERMISSION],
	dependencies: [],
	execute: async (
		params: SystemHeartbeatRequest,
		_injector: Injector,
	): Promise<SystemHeartbeatResponse> => {
		const timestamp = Date.now();
		const uptime = process.uptime() * 1000; // 转换为毫秒

		// 心跳任务是系统级的，使用 console.log 记录
		console.log('[HEARTBEAT]', new Date(timestamp).toISOString(), {
			uptime: `${(uptime / 1000).toFixed(2)}s`,
			message: params.message,
			memory: {
				rss: `${(process.memoryUsage().rss / 1024 / 1024).toFixed(2)} MB`,
				heapUsed: `${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)} MB`,
			},
			pid: process.pid,
		});

		return {
			timestamp,
			status: "healthy",
			uptime,
		};
	},
};
