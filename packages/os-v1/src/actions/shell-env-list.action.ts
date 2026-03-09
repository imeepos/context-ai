import { Type, type Static } from "@sinclair/typebox";
import type { Action, Token } from "../tokens.js";
import { SHELL_PERMISSION } from "./shell-execute.action.js";
import type { Injector } from "@context-ai/core";
import { ShellSessionStore } from "../core/shell-session.js";

// ============================================================================
// Shell Env List Action - 请求/响应 Schema 定义
// ============================================================================

/**
 * Shell 环境变量列表请求 Schema
 */
export const ShellEnvListRequestSchema = Type.Object({
    /** 类型标记，固定为 "list" */
    _: Type.Literal("list", { description: "Request type discriminator, must be 'list'" }),
});

/** Shell 环境变量列表请求 TypeScript 类型 */
export type ShellEnvListRequest = Static<typeof ShellEnvListRequestSchema>;

/**
 * 环境变量列表响应 Schema
 */
export const ShellEnvListResponseSchema = Type.Record(Type.String(), Type.String());

/** 环境变量列表响应 TypeScript 类型 */
export type ShellEnvListResponse = Static<typeof ShellEnvListResponseSchema>;

// ============================================================================
// Shell Env List Action - Token 定义
// ============================================================================

/**
 * Shell 环境变量列表令牌
 */
export const SHELL_ENV_LIST_TOKEN: Token<typeof ShellEnvListRequestSchema, typeof ShellEnvListResponseSchema> = "shell.env.list";

// ============================================================================
// Shell Env List Action - Action 定义
// ============================================================================

/**
 * Shell 环境变量列表 Action
 */
export const shellEnvListAction: Action<typeof ShellEnvListRequestSchema, typeof ShellEnvListResponseSchema> = {
    type: SHELL_ENV_LIST_TOKEN,
    description: "List all environment variables for the current session",
    request: ShellEnvListRequestSchema,
    response: ShellEnvListResponseSchema,
    requiredPermissions: [SHELL_PERMISSION],
    dependencies: [],
    execute: async (_params: ShellEnvListRequest, _injector: Injector): Promise<ShellEnvListResponse> => {
        const store = _injector.get(ShellSessionStore)
        const env = store.getEnv()
        return env;
    },
};
