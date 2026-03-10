/**
 * 事件系统类型定义
 *
 * 提供类型安全的事件令牌和事件包装器，用于 EventBus 和 ActionExecuter 的可观察性
 */

import { Type, type Static, type TSchema } from '@sinclair/typebox';

// ============================================================================
// 事件令牌类型
// ============================================================================

/**
 * 事件令牌类型
 *
 * 类似于 Action Token，通过泛型参数携带 payload 类型信息
 * 运行时是 string，编译时携带类型
 *
 * @template TPayload - 事件负载的 Schema 类型
 */
export type EventToken<TPayload extends TSchema = TSchema> = string & {
    __payload?: TPayload;
};

/**
 * 事件包装器
 *
 * 所有通过 EventBus 发布的事件都必须包装为此结构
 *
 * @template TPayload - 事件负载的 Schema 类型
 */
export interface EventEnvelope<TPayload extends TSchema = TSchema> {
    /** 会话 ID（用于多会话隔离） */
    sessionId: string;

    /** 事件类型（EventToken） */
    type: EventToken<TPayload>;

    /** 事件负载（类型安全） */
    payload: Static<TPayload>;

    /** 事件时间戳 */
    timestamp: number;

    /** 可选：事件元数据 */
    metadata?: Record<string, unknown>;
}

// ============================================================================
// Action 执行事件定义
// ============================================================================

/**
 * Action 执行开始事件
 */
export const ACTION_STARTED_EVENT: EventToken<typeof ActionStartedPayloadSchema>
    = "action.started";

export const ActionStartedPayloadSchema = Type.Object({
    executionId: Type.String({ description: '执行 ID' }),
    token: Type.String({ description: 'Action Token' }),
    params: Type.Unknown({ description: '请求参数' })
});

export type ActionStartedPayload = Static<typeof ActionStartedPayloadSchema>;

/**
 * Action 执行进度事件
 */
export const ACTION_PROGRESS_EVENT: EventToken<typeof ActionProgressPayloadSchema>
    = "action.progress";

export const ActionProgressPayloadSchema = Type.Object({
    executionId: Type.String({ description: '执行 ID' }),
    token: Type.String({ description: 'Action Token' }),
    stage: Type.Union([
        Type.Literal("action_found"),
        Type.Literal("params_validated"),
        Type.Literal("permissions_checked"),
        Type.Literal("dependencies_checked"),
        Type.Literal("executing"),
        Type.Literal("response_validated")
    ], { description: '执行阶段' })
});

export type ActionProgressPayload = Static<typeof ActionProgressPayloadSchema>;

/**
 * Action 执行完成事件
 */
export const ACTION_COMPLETED_EVENT: EventToken<typeof ActionCompletedPayloadSchema>
    = "action.completed";

export const ActionCompletedPayloadSchema = Type.Object({
    executionId: Type.String({ description: '执行 ID' }),
    token: Type.String({ description: 'Action Token' }),
    result: Type.Unknown({ description: '执行结果' }),
    duration: Type.Number({ description: '执行耗时（毫秒）' })
});

export type ActionCompletedPayload = Static<typeof ActionCompletedPayloadSchema>;

/**
 * Action 执行失败事件
 */
export const ACTION_FAILED_EVENT: EventToken<typeof ActionFailedPayloadSchema>
    = "action.failed";

export const ActionFailedPayloadSchema = Type.Object({
    executionId: Type.String({ description: '执行 ID' }),
    token: Type.String({ description: 'Action Token' }),
    error: Type.String({ description: '错误信息' }),
    errorStack: Type.Optional(Type.String({ description: '错误堆栈' })),
    duration: Type.Number({ description: '执行耗时（毫秒）' })
});

export type ActionFailedPayload = Static<typeof ActionFailedPayloadSchema>;
