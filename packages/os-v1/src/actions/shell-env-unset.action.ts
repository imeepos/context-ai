import { Type, type Static } from "@sinclair/typebox";
import type { Action, Token } from "../tokens.js";
import { SHELL_PERMISSION } from "./shell-execute.action.js";
import type { Injector } from "@context-ai/core";
import { ShellSessionStore } from "../core/shell-session.js";

// ============================================================================
// Shell Env Unset Action - 请求/响应 Schema 定义
// ============================================================================

/**
 * Shell 环境变量取消请求 Schema
 */
export const ShellEnvUnsetRequestSchema = Type.Object({
    /** 要取消的环境变量名 */
    key: Type.String({ description: "The environment variable name to unset" }),
});

/** Shell 环境变量取消请求 TypeScript 类型 */
export type ShellEnvUnsetRequest = Static<typeof ShellEnvUnsetRequestSchema>;

/**
 * 操作成功响应 Schema
 */
export const ShellEnvUnsetResponseSchema = Type.Object({
    ok: Type.Literal(true, { description: "Operation success indicator" }),
});

/** 操作成功响应 TypeScript 类型 */
export type ShellEnvUnsetResponse = Static<typeof ShellEnvUnsetResponseSchema>;

// ============================================================================
// Shell Env Unset Action - Token 定义
// ============================================================================

/**
 * Shell 环境变量取消令牌
 */
export const SHELL_ENV_UNSET_TOKEN: Token<typeof ShellEnvUnsetRequestSchema, typeof ShellEnvUnsetResponseSchema> = "shell.env.unset";

// ============================================================================
// Shell Env Unset Action - Action 定义
// ============================================================================

/**
 * Shell 环境变量取消 Action
 */
export const shellEnvUnsetAction: Action<typeof ShellEnvUnsetRequestSchema, typeof ShellEnvUnsetResponseSchema> = {
    type: SHELL_ENV_UNSET_TOKEN,
    description: "Unset an environment variable for the current session",
    request: ShellEnvUnsetRequestSchema,
    response: ShellEnvUnsetResponseSchema,
    requiredPermissions: [SHELL_PERMISSION],
    dependencies: [],
    execute: async (params: ShellEnvUnsetRequest, _injector: Injector): Promise<ShellEnvUnsetResponse> => {
        const store = _injector.get(ShellSessionStore)
        store.unsetVar(params.key)
        return { ok: true };
    },
};
