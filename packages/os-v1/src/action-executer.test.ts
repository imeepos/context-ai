/**
 * ActionExecuter 单元测试
 *
 * 测试 ActionExecuter 的事件发射功能
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { ActionExecuterImpl } from './action-executer.js';
import { Type } from '@sinclair/typebox';
import { Injector } from '@context-ai/core';
import { SESSION_ID, EVENT_BUS } from './tokens.js';
import type { Action, EventBus } from './tokens.js';
import type { EventEnvelope } from './events.js';
import {
    ACTION_STARTED_EVENT,
    ACTION_PROGRESS_EVENT,
    ACTION_COMPLETED_EVENT,
    ACTION_FAILED_EVENT
} from './events.js';

describe('ActionExecuterImpl', () => {
    let actionExecuter: ActionExecuterImpl;
    let mockEventBus: EventBus;
    let publishSpy: ReturnType<typeof vi.fn>;
    let injector: Injector;

    beforeEach(() => {
        // 创建 mock EventBus
        publishSpy = vi.fn();
        mockEventBus = {
            publish: publishSpy as any,
            subscribe: vi.fn(),
            getEventStream: vi.fn()
        };

        // 创建测试 Action
        const testAction: Action<any, any> = {
            type: 'test.action',
            description: 'Test action',
            request: Type.Object({ input: Type.String() }),
            response: Type.Object({ output: Type.String() }),
            requiredPermissions: [],
            dependencies: [],
            execute: async (params) => {
                return { output: `Processed: ${params.input}` };
            }
        };

        // 创建 ActionExecuter
        actionExecuter = new ActionExecuterImpl([testAction], mockEventBus);

        // 创建 mock Injector
        injector = {
            get: (token: any, defaultValue?: any) => {
                if (token === SESSION_ID) {
                    return 'test-session';
                }
                return defaultValue;
            }
        } as any;
    });

    describe('执行生命周期事件', () => {
        it('应该发射完整的执行生命周期事件', async () => {
            // 执行 Action
            await actionExecuter.execute(
                'test.action' as any,
                { input: 'test' },
                injector
            );

            // 验证事件发射顺序
            expect(publishSpy).toHaveBeenCalledTimes(8);

            // 1. action.started
            expect(publishSpy).toHaveBeenNthCalledWith(
                1,
                'test-session',
                ACTION_STARTED_EVENT,
                expect.objectContaining({
                    token: 'test.action',
                    params: { input: 'test' }
                })
            );

            // 2. action.progress (action_found)
            expect(publishSpy).toHaveBeenNthCalledWith(
                2,
                'test-session',
                ACTION_PROGRESS_EVENT,
                expect.objectContaining({
                    token: 'test.action',
                    stage: 'action_found'
                })
            );

            // 3. action.progress (params_validated)
            expect(publishSpy).toHaveBeenNthCalledWith(
                3,
                'test-session',
                ACTION_PROGRESS_EVENT,
                expect.objectContaining({
                    stage: 'params_validated'
                })
            );

            // 4. action.progress (permissions_checked)
            expect(publishSpy).toHaveBeenNthCalledWith(
                4,
                'test-session',
                ACTION_PROGRESS_EVENT,
                expect.objectContaining({
                    stage: 'permissions_checked'
                })
            );

            // 5. action.progress (dependencies_checked)
            expect(publishSpy).toHaveBeenNthCalledWith(
                5,
                'test-session',
                ACTION_PROGRESS_EVENT,
                expect.objectContaining({
                    stage: 'dependencies_checked'
                })
            );

            // 6. action.progress (executing)
            expect(publishSpy).toHaveBeenNthCalledWith(
                6,
                'test-session',
                ACTION_PROGRESS_EVENT,
                expect.objectContaining({
                    stage: 'executing'
                })
            );

            // 7. action.progress (response_validated)
            expect(publishSpy).toHaveBeenNthCalledWith(
                7,
                'test-session',
                ACTION_PROGRESS_EVENT,
                expect.objectContaining({
                    stage: 'response_validated'
                })
            );

            // 8. action.completed
            expect(publishSpy).toHaveBeenNthCalledWith(
                8,
                'test-session',
                ACTION_COMPLETED_EVENT,
                expect.objectContaining({
                    token: 'test.action',
                    result: { output: 'Processed: test' },
                    duration: expect.any(Number)
                })
            );
        });

        it('应该在执行失败时发射 action.failed 事件', async () => {
            // 创建会失败的 Action
            const failingAction: Action<any, any> = {
                type: 'failing.action',
                description: 'Failing action',
                request: Type.Object({ input: Type.String() }),
                response: Type.Object({ output: Type.String() }),
                requiredPermissions: [],
                dependencies: [],
                execute: async () => {
                    throw new Error('Execution failed');
                }
            };

            const failingExecuter = new ActionExecuterImpl([failingAction], mockEventBus);

            // 执行 Action（应该抛出错误）
            await expect(
                failingExecuter.execute('failing.action' as any, { input: 'test' }, injector)
            ).rejects.toThrow('Execution failed');

            // 验证发射了 action.failed 事件
            const lastCall = publishSpy.mock.calls[publishSpy.mock.calls.length - 1]!;
            expect(lastCall[0]!).toBe('test-session');
            expect(lastCall[1]!).toBe(ACTION_FAILED_EVENT);
            expect(lastCall[2]).toMatchObject({
                token: 'failing.action',
                error: 'Execution failed',
                duration: expect.any(Number)
            });
        });

        it('应该包含正确的 sessionId', async () => {
            await actionExecuter.execute(
                'test.action' as any,
                { input: 'test' },
                injector
            );

            // 验证所有事件都包含正确的 sessionId
            publishSpy.mock.calls.forEach(call => {
                expect(call[0]).toBe('test-session');
            });
        });

        it('应该包含唯一的 executionId', async () => {
            await actionExecuter.execute(
                'test.action' as any,
                { input: 'test' },
                injector
            );

            // 获取第一个事件的 executionId
            const firstEventPayload = publishSpy.mock.calls[0]![2]!;
            const executionId = firstEventPayload.executionId;

            // 验证所有事件都使用相同的 executionId
            publishSpy.mock.calls.forEach(call => {
                const payload = call[2];
                expect(payload.executionId).toBe(executionId);
            });

            // 验证 executionId 是 UUID 格式
            expect(executionId).toMatch(
                /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
            );
        });

        it('应该记录执行耗时', async () => {
            await actionExecuter.execute(
                'test.action' as any,
                { input: 'test' },
                injector
            );

            // 获取 action.completed 事件
            const completedEvent = publishSpy.mock.calls.find(
                call => call[1] === ACTION_COMPLETED_EVENT
            );

            expect(completedEvent).toBeDefined();
            expect(completedEvent![2].duration).toBeGreaterThanOrEqual(0);
        });
    });

    describe('无 EventBus 场景', () => {
        it('应该在没有 EventBus 时正常执行', async () => {
            // 创建没有 EventBus 的 ActionExecuter
            const executerWithoutEventBus = new ActionExecuterImpl([
                {
                    type: 'test.action',
                    description: 'Test action',
                    request: Type.Object({ input: Type.String() }),
                    response: Type.Object({ output: Type.String() }),
                    requiredPermissions: [],
                    dependencies: [],
                    execute: async (params) => {
                        return { output: `Processed: ${params.input}` };
                    }
                }
            ]);

            // 执行应该成功
            const result = await executerWithoutEventBus.execute(
                'test.action' as any,
                { input: 'test' },
                injector
            );

            expect(result).toEqual({ output: 'Processed: test' });
        });
    });

    describe('EventBus 错误处理', () => {
        it('应该捕获 EventBus 发射错误', async () => {
            // 创建会抛出错误的 EventBus
            const errorEventBus: EventBus = {
                publish: vi.fn(() => {
                    throw new Error('EventBus error');
                }),
                subscribe: vi.fn(),
                getEventStream: vi.fn()
            };

            const executerWithErrorBus = new ActionExecuterImpl([
                {
                    type: 'test.action',
                    description: 'Test action',
                    request: Type.Object({ input: Type.String() }),
                    response: Type.Object({ output: Type.String() }),
                    requiredPermissions: [],
                    dependencies: [],
                    execute: async (params) => {
                        return { output: `Processed: ${params.input}` };
                    }
                }
            ], errorEventBus);

            // 执行应该成功（EventBus 错误不应该影响执行）
            const result = await executerWithErrorBus.execute(
                'test.action' as any,
                { input: 'test' },
                injector
            );

            expect(result).toEqual({ output: 'Processed: test' });
        });
    });
});
