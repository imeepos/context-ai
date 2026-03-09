import { Type, type Static } from "@sinclair/typebox";
import type { Action, Token } from "../tokens.js";
import { SHELL_PERMISSION } from "./shell-execute.action.js";
import type { Injector } from "@context-ai/core";
import { ShellSessionStore } from "../core/shell-session.js";

// ============================================================================
// Shell Env Set Action - 请求/响应 Schema 定义
// ============================================================================

/**
 * Shell 环境变量设置请求 Schema
 */
export const ShellEnvSetRequestSchema = Type.Object({
    /** 环境变量名 */
    key: Type.String({ description: "The environment variable name" }),
    /** 环境变量描述 */
    description: Type.Optional(Type.String({ description: "The environment variable description" })),
    /** 环境变量值 */
    value: Type.String({ description: "The environment variable value" }),
});

/** Shell 环境变量设置请求 TypeScript 类型 */
export type ShellEnvSetRequest = Static<typeof ShellEnvSetRequestSchema>;

/**
 * 操作成功响应 Schema
 */
export const ShellEnvSetResponseSchema = Type.Object({
    ok: Type.Literal(true, { description: "Operation success indicator" }),
});

/** 操作成功响应 TypeScript 类型 */
export type ShellEnvSetResponse = Static<typeof ShellEnvSetResponseSchema>;

// ============================================================================
// Shell Env Set Action - Token 定义
// ============================================================================

/**
 * Shell 环境变量设置令牌
 */
export const SHELL_ENV_SET_TOKEN: Token<typeof ShellEnvSetRequestSchema, typeof ShellEnvSetResponseSchema> = "shell.env.set";

// ============================================================================
// Shell Env Set Action - Action 定义
// ============================================================================

/**
 * Shell 环境变量设置 Action
 */
export const shellEnvSetAction: Action<typeof ShellEnvSetRequestSchema, typeof ShellEnvSetResponseSchema> = {
    type: SHELL_ENV_SET_TOKEN,
    description: "Set an environment variable for the current session",
    request: ShellEnvSetRequestSchema,
    response: ShellEnvSetResponseSchema,
    requiredPermissions: [SHELL_PERMISSION],
    dependencies: [],
    execute: async (params: ShellEnvSetRequest, _injector: Injector): Promise<ShellEnvSetResponse> => {
        const store = _injector.get(ShellSessionStore)
        store.setVar(params.key, params.value, params.description)
        return { ok: true };
    },
};
