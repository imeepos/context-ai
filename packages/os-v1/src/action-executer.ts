import { Injectable, Injector, Optional } from '@context-ai/core';
import { Value } from '@sinclair/typebox/value';
import type { Static, TSchema } from '@sinclair/typebox';
import type { Action, ActionExecuter, Token, EventBus } from './tokens.js';
import { USER_PERMISSIONS, EVENT_BUS, SESSION_ID } from './tokens.js';
import type { EventToken } from './events.js';
import {
    ACTION_STARTED_EVENT,
    ACTION_PROGRESS_EVENT,
    ACTION_COMPLETED_EVENT,
    ACTION_FAILED_EVENT
} from './events.js';

// ============================================================================
// 错误类定义
// ============================================================================

/**
 * Action 未找到错误
 */
export class ActionNotFoundError extends Error {
    constructor(public readonly token: string) {
        super(`Action not found: ${token}`);
        this.name = 'ActionNotFoundError';
    }
}

/**
 * 参数验证错误
 */
export class ValidationError extends Error {
    constructor(
        message: string,
        public readonly errors: Array<{ path: string; message: string; value: unknown }>
    ) {
        super(message);
        this.name = 'ValidationError';
    }
}

/**
 * 权限不足错误
 */
export class PermissionDeniedError extends Error {
    constructor(
        public readonly token: string,
        public readonly requiredPermissions: string[],
        public readonly userPermissions: string[]
    ) {
        super(
            `Permission denied for action "${token}". ` +
            `Required: [${requiredPermissions.join(', ')}], ` +
            `User has: [${userPermissions.join(', ')}]`
        );
        this.name = 'PermissionDeniedError';
    }
}

/**
 * 依赖未找到错误
 */
export class DependencyNotFoundError extends Error {
    constructor(
        public readonly actionToken: string,
        public readonly dependencyToken: string
    ) {
        super(`Dependency "${dependencyToken}" not found for action "${actionToken}"`);
        this.name = 'DependencyNotFoundError';
    }
}

/**
 * Action 执行错误
 */
export class ExecutionError extends Error {
    constructor(
        public readonly token: string,
        public readonly cause: Error
    ) {
        super(`Action "${token}" execution failed: ${cause.message}`);
        this.name = 'ExecutionError';
        this.stack = cause.stack;
    }
}

// ============================================================================
// ActionExecuter 实现
// ============================================================================

/**
 * ActionExecuter 实现类
 *
 * 统一的能力调度中心，负责：
 * - Action 注册和查找
 * - 请求参数验证
 * - 权限检查
 * - 依赖解析
 * - Action 执行
 */
@Injectable({ providedIn: 'auto' })
export class ActionExecuterImpl implements ActionExecuter {
    /**
     * Action 注册表（Token → Action 映射）
     */
    private readonly actions: Map<string, Action<any, any>> = new Map();

    /**
     * 构造函数
     * @param actions - 所有可用的 Action 列表
     * @param eventBus - 可选的事件总线（用于发射执行事件）
     */
    constructor(
        actions: Action<any, any>[],
        @Optional(EVENT_BUS) private readonly eventBus?: EventBus
    ) {
        this.registerActions(actions);
    }

    /**
     * 注册所有 Action 到内部注册表
     */
    private registerActions(actions: Action<any, any>[]): void {
        for (const action of actions) {
            const token = action.type as string;

            if (this.actions.has(token)) {
                throw new Error(`Duplicate action registration: ${token}`);
            }

            this.actions.set(token, action);
        }
    }

    /**
     * 执行指定的系统能力
     *
     * @param type - 能力令牌
     * @param params - 请求参数
     * @param injector - DI 注入器
     * @returns 符合响应 Schema 的数据
     */
    async execute<TRequest extends TSchema, TResponse extends TSchema>(
        type: Token<TRequest, TResponse>,
        params: Static<TRequest>,
        injector: Injector
    ): Promise<Static<TResponse>> {
        const token = type as string;
        const executionId = crypto.randomUUID();
        const startTime = Date.now();

        // 获取 sessionId
        const sessionId = injector.get(SESSION_ID, "unknown");

        // 发射：执行开始
        this.emitEvent(sessionId, ACTION_STARTED_EVENT, {
            executionId,
            token,
            params
        });

        try {
            // 1. 查找 Action
            const action = this.findAction(token);
            this.emitEvent(sessionId, ACTION_PROGRESS_EVENT, {
                executionId,
                token,
                stage: "action_found"
            });

            // 2. 验证请求参数
            this.validateRequest(action, params);
            this.emitEvent(sessionId, ACTION_PROGRESS_EVENT, {
                executionId,
                token,
                stage: "params_validated"
            });

            // 3. 检查权限
            await this.checkPermissions(action, injector);
            this.emitEvent(sessionId, ACTION_PROGRESS_EVENT, {
                executionId,
                token,
                stage: "permissions_checked"
            });

            // 4. 验证依赖
            await this.checkDependencies(action, injector);
            this.emitEvent(sessionId, ACTION_PROGRESS_EVENT, {
                executionId,
                token,
                stage: "dependencies_checked"
            });

            // 5. 执行 Action
            this.emitEvent(sessionId, ACTION_PROGRESS_EVENT, {
                executionId,
                token,
                stage: "executing"
            });
            const result = await action.execute(params, injector);

            // 6. 验证响应
            this.validateResponse(action, result);
            this.emitEvent(sessionId, ACTION_PROGRESS_EVENT, {
                executionId,
                token,
                stage: "response_validated"
            });

            // 发射：执行完成
            const endTime = Date.now();
            this.emitEvent(sessionId, ACTION_COMPLETED_EVENT, {
                executionId,
                token,
                result,
                duration: endTime - startTime
            });

            return result;
        } catch (error) {
            // 发射：执行失败
            const endTime = Date.now();
            this.emitEvent(sessionId, ACTION_FAILED_EVENT, {
                executionId,
                token,
                error: error instanceof Error ? error.message : String(error),
                errorStack: error instanceof Error ? error.stack : undefined,
                duration: endTime - startTime
            });

            if (error instanceof Error) {
                throw new ExecutionError(token, error);
            }
            throw error;
        }
    }

    /**
     * 发射事件到 EventBus
     */
    private emitEvent<TPayload extends TSchema>(
        sessionId: string,
        token: EventToken<TPayload>,
        payload: Static<TPayload>
    ): void {
        if (this.eventBus) {
            try {
                this.eventBus.publish(sessionId, token, payload);
            } catch (error) {
                console.error(`[ActionExecuter] Failed to emit event:`, error);
            }
        }
    }

    /**
     * 查找 Action
     */
    private findAction(token: string): Action<any, any> {
        const action = this.actions.get(token);

        if (!action) {
            throw new ActionNotFoundError(token);
        }

        return action;
    }

    /**
     * 验证请求参数
     */
    private validateRequest(action: Action<any, any>, params: unknown): void {
        const isValid = Value.Check(action.request, params);

        if (!isValid) {
            const errors = [...Value.Errors(action.request, params)].map(err => ({
                path: err.path,
                message: err.message,
                value: err.value
            }));

            throw new ValidationError(
                `Invalid request parameters for action "${action.type}"`,
                errors
            );
        }
    }

    /**
     * 验证响应数据
     */
    private validateResponse(action: Action<any, any>, result: unknown): void {
        const isValid = Value.Check(action.response, result);

        if (!isValid) {
            const errors = [...Value.Errors(action.response, result)].map(err => ({
                path: err.path,
                message: err.message,
                value: err.value
            }));

            throw new ValidationError(
                `Invalid response from action "${action.type}"`,
                errors
            );
        }
    }

    /**
     * 检查权限
     */
    private async checkPermissions(action: Action<any, any>, injector: Injector): Promise<void> {
        // 如果 Action 不需要权限，直接通过
        if (action.requiredPermissions.length === 0) {
            return;
        }

        // 从 Injector 获取用户权限列表
        let userPermissions: string[] = [];

        try {
            userPermissions = injector.get<string[]>(USER_PERMISSIONS, []);
        } catch {
            // 如果获取不到权限，默认为空数组
            userPermissions = [];
        }

        // 检查是否拥有所有必需权限
        const hasAllPermissions = action.requiredPermissions.every(
            perm => userPermissions.includes(perm)
        );

        if (!hasAllPermissions) {
            throw new PermissionDeniedError(
                action.type as string,
                action.requiredPermissions,
                userPermissions
            );
        }
    }

    /**
     * 检查依赖是否可用
     */
    private async checkDependencies(action: Action<any, any>, injector: Injector): Promise<void> {
        for (const dep of action.dependencies) {
            try {
                injector.get(dep as any);
            } catch (error) {
                throw new DependencyNotFoundError(
                    action.type as string,
                    dep as string
                );
            }
        }
    }
}
