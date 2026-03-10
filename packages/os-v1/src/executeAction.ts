import { type Injector } from "@context-ai/core";
import type { Static, TSchema } from "@mariozechner/pi-ai";
import { ACTION_EXECUTER, type Token } from "./tokens.js";

/**
 * 执行 Action 并返回结果（快捷方法）
 */
export async function executeAction<TRequest extends TSchema, TResponse extends TSchema>(
    platform: Injector,
    feature: Injector,
    token: Token<TRequest, TResponse>,
    params: Static<TRequest>
): Promise<Static<TResponse>> {
    const executer = platform.get(ACTION_EXECUTER);
    return executer.execute(token, params, feature) as Promise<TResponse>;
}