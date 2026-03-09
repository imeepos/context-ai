import { Type, type Static } from "@sinclair/typebox";
import type { Action, Token } from "../tokens.js";
import type { Injector } from "@context-ai/core";

// ============================================================================
// Security Redact Action - 请求/响应 Schema 定义
// ============================================================================

/**
 * 敏感信息脱敏请求 Schema
 */
export const SecurityRedactRequestSchema = Type.Object({
	/** 要脱敏的输入文本 */
	input: Type.String({ description: "The input text to redact sensitive information from" }),
});

/** 敏感信息脱敏请求 TypeScript 类型 */
export type SecurityRedactRequest = Static<typeof SecurityRedactRequestSchema>;

/**
 * 敏感信息脱敏响应 Schema
 */
export const SecurityRedactResponseSchema = Type.Object({
	/** 脱敏后的输出文本 */
	output: Type.String({ description: "The output text with sensitive information redacted" }),
});

/** 敏感信息脱敏响应 TypeScript 类型 */
export type SecurityRedactResponse = Static<typeof SecurityRedactResponseSchema>;

// ============================================================================
// Security Redact Action - Token 定义
// ============================================================================

/**
 * 敏感信息脱敏令牌
 */
export const SECURITY_REDACT_TOKEN: Token<typeof SecurityRedactRequestSchema, typeof SecurityRedactResponseSchema> = "security.redact";

// ============================================================================
// Security Redact Action - 权限定义
// ============================================================================

/**
 * 安全读取权限
 */
export const SECURITY_READ_PERMISSION = "security:read";

// ============================================================================
// Security Redact Action - 辅助函数
// ============================================================================

/**
 * 脱敏敏感信息
 *
 * 参考自 packages/os/src/security-service/index.ts 中的 SecurityService.redactSecrets 方法
 *
 * @param input - 输入文本
 * @returns 脱敏后的文本
 */
function redactSecrets(input: string): string {
	return input
		.replace(/(api[_-]?key\s*[:=]\s*)([^\s]+)/gi, "$1***")
		.replace(/(token\s*[:=]\s*)([^\s]+)/gi, "$1***")
		.replace(/(password\s*[:=]\s*)([^\s]+)/gi, "$1***");
}

// ============================================================================
// Security Redact Action - Action 定义
// ============================================================================

/**
 * 敏感信息脱敏 Action
 *
 * 核心能力：检测并脱敏文本中的敏感信息（API keys, tokens, passwords）。
 *
 * 参考自 packages/os/src/security-service/index.ts 中的 SecurityService 实现。
 *
 * 设计要点：
 * - 使用 TypeBox 定义 Schema
 * - 权限控制：需要 security:read 权限
 * - 使用正则表达式匹配和替换敏感模式
 * - 返回 { output } 结构（与 OS 包保持一致）
 *
 * 使用方式:
 * const result = await actionExecuter.execute(SECURITY_REDACT_TOKEN, {
 *     input: 'My api_key=sk-proj-abc123 and token=secret'
 * });
 * console.log(result.output); // 'My api_key=*** and token=***'
 */
export const securityRedactAction: Action<typeof SecurityRedactRequestSchema, typeof SecurityRedactResponseSchema> = {
	type: SECURITY_REDACT_TOKEN,
	description: "Detect and redact sensitive information from text (API keys, tokens, passwords)",
	request: SecurityRedactRequestSchema,
	response: SecurityRedactResponseSchema,
	requiredPermissions: [SECURITY_READ_PERMISSION],
	dependencies: [],
	execute: async (params: SecurityRedactRequest, _injector: Injector): Promise<SecurityRedactResponse> => {
		// 直接使用 SecurityService 的脱敏逻辑
		const output = redactSecrets(params.input);
		return { output };
	},
};
