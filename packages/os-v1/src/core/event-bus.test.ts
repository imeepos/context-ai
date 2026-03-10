/**
 * EventBus 单元测试
 *
 * 测试 RxJS 重构后的 EventBus 功能
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EventBusService } from './event-bus.js';
import { Type } from '@sinclair/typebox';
import type { EventToken, EventEnvelope } from '../events.js';

describe('EventBusService', () => {
    let eventBus: EventBusService;

    beforeEach(() => {
        eventBus = new EventBusService();
    });

    describe('多订阅者支持', () => {
        it('应该支持多个订阅者接收同一事件', () => {
            const sessionId = 'test-session';
            const eventToken: EventToken<typeof TestPayloadSchema> = 'test.event';
            const TestPayloadSchema = Type.Object({
                message: Type.String()
            });

            const handler1 = vi.fn();
            const handler2 = vi.fn();
            const handler3 = vi.fn();

            // 订阅 3 个处理器
            eventBus.subscribe(eventToken, handler1, { sessionId });
            eventBus.subscribe(eventToken, handler2, { sessionId });
            eventBus.subscribe(eventToken, handler3, { sessionId });

            // 发布事件
            eventBus.publish(sessionId, eventToken, { message: 'Hello' });

            // 验证所有处理器都被调用
            expect(handler1).toHaveBeenCalledTimes(1);
            expect(handler2).toHaveBeenCalledTimes(1);
            expect(handler3).toHaveBeenCalledTimes(1);

            // 验证接收到的数据
            expect(handler1).toHaveBeenCalledWith(
                expect.objectContaining({
                    sessionId,
                    type: eventToken,
                    payload: { message: 'Hello' }
                })
            );
        });

        it('应该支持通配符订阅多个事件', () => {
            const sessionId = 'test-session';
            const handler = vi.fn();

            // 订阅所有 action.* 事件
            eventBus.subscribe('action.*', handler, { sessionId });

            // 发布多个事件
            eventBus.publish(sessionId, 'action.started' as any, { id: '1' });
            eventBus.publish(sessionId, 'action.completed' as any, { id: '2' });
            eventBus.publish(sessionId, 'action.failed' as any, { id: '3' });

            // 验证处理器被调用 3 次
            expect(handler).toHaveBeenCalledTimes(3);
        });
    });

    describe('sessionId 过滤', () => {
        it('应该只接收指定 sessionId 的事件', () => {
            const session1 = 'session-1';
            const session2 = 'session-2';
            const eventToken: EventToken<any> = 'test.event';

            const handler1 = vi.fn();
            const handler2 = vi.fn();

            // 订阅不同 session
            eventBus.subscribe(eventToken, handler1, { sessionId: session1 });
            eventBus.subscribe(eventToken, handler2, { sessionId: session2 });

            // 发布到 session1
            eventBus.publish(session1, eventToken, { data: 'for session1' });

            // 只有 handler1 被调用
            expect(handler1).toHaveBeenCalledTimes(1);
            expect(handler2).toHaveBeenCalledTimes(0);

            // 发布到 session2
            eventBus.publish(session2, eventToken, { data: 'for session2' });

            // 现在 handler2 也被调用
            expect(handler1).toHaveBeenCalledTimes(1);
            expect(handler2).toHaveBeenCalledTimes(1);
        });
    });

    describe('取消订阅', () => {
        it('应该支持取消订阅', () => {
            const sessionId = 'test-session';
            const eventToken: EventToken<any> = 'test.event';
            const handler = vi.fn();

            // 订阅
            const subscription = eventBus.subscribe(eventToken, handler, { sessionId });

            // 发布事件
            eventBus.publish(sessionId, eventToken, { data: 'test' });
            expect(handler).toHaveBeenCalledTimes(1);

            // 取消订阅
            subscription.unsubscribe();

            // 再次发布事件
            eventBus.publish(sessionId, eventToken, { data: 'test2' });

            // 处理器不应该再被调用
            expect(handler).toHaveBeenCalledTimes(1);
        });
    });

    describe('通配符匹配', () => {
        it('应该正确匹配通配符模式', () => {
            const sessionId = 'test-session';
            const handler = vi.fn();

            // 订阅 scheduler.* 模式
            eventBus.subscribe('scheduler.*', handler, { sessionId });

            // 匹配的事件
            eventBus.publish(sessionId, 'scheduler.started' as any, {});
            eventBus.publish(sessionId, 'scheduler.completed' as any, {});

            // 不匹配的事件
            eventBus.publish(sessionId, 'action.started' as any, {});

            // 只有匹配的事件被处理
            expect(handler).toHaveBeenCalledTimes(2);
        });

        it('应该支持多级通配符', () => {
            const sessionId = 'test-session';
            const handler = vi.fn();

            // 订阅 *.action.* 模式
            eventBus.subscribe('*.action.*', handler, { sessionId });

            // 匹配的事件
            eventBus.publish(sessionId, 'scheduler.action.started' as any, {});
            eventBus.publish(sessionId, 'loop.action.completed' as any, {});

            // 不匹配的事件
            eventBus.publish(sessionId, 'scheduler.started' as any, {});

            // 只有匹配的事件被处理
            expect(handler).toHaveBeenCalledTimes(2);
        });
    });

    describe('metadata 过滤', () => {
        it('应该支持 metadata 过滤', () => {
            const sessionId = 'test-session';
            const eventToken: EventToken<any> = 'test.event';
            const handler = vi.fn();

            // 订阅带 metadata 过滤的事件
            eventBus.subscribe(eventToken, handler, {
                sessionId,
                metadata: { priority: 'high' }
            });

            // 发布匹配 metadata 的事件
            const envelope1: EventEnvelope<any> = {
                sessionId,
                type: eventToken,
                payload: { data: 'test1' },
                timestamp: Date.now(),
                metadata: { priority: 'high' }
            };
            (eventBus as any).globalSubject.next(envelope1);

            // 发布不匹配 metadata 的事件
            const envelope2: EventEnvelope<any> = {
                sessionId,
                type: eventToken,
                payload: { data: 'test2' },
                timestamp: Date.now(),
                metadata: { priority: 'low' }
            };
            (eventBus as any).globalSubject.next(envelope2);

            // 只有匹配的事件被处理
            expect(handler).toHaveBeenCalledTimes(1);
            expect(handler).toHaveBeenCalledWith(
                expect.objectContaining({
                    payload: { data: 'test1' }
                })
            );
        });
    });

    describe('getEventStream', () => {
        it('应该返回可观察的事件流', async () => {
            const sessionId = 'test-session';
            const eventToken: EventToken<any> = 'test.event';

            const events: EventEnvelope<any>[] = [];

            // 获取事件流
            const stream = eventBus.getEventStream(eventToken, sessionId);

            // 创建 Promise 来等待事件
            const eventPromise = new Promise<void>((resolve) => {
                // 订阅流
                const subscription = stream.subscribe({
                    next: (envelope) => {
                        events.push(envelope);

                        if (events.length === 2) {
                            subscription.unsubscribe();
                            resolve();
                        }
                    }
                });

                // 发布事件
                eventBus.publish(sessionId, eventToken, { data: 'test1' });
                eventBus.publish(sessionId, eventToken, { data: 'test2' });
            });

            // 等待事件完成
            await eventPromise;

            // 验证接收到的事件
            expect(events).toHaveLength(2);
            expect(events[0]!.payload).toEqual({ data: 'test1' });
            expect(events[1]!.payload).toEqual({ data: 'test2' });
        });
    });

    describe('错误处理', () => {
        it('应该捕获处理器中的错误', () => {
            const sessionId = 'test-session';
            const eventToken: EventToken<any> = 'test.event';

            const errorHandler = vi.fn(() => {
                throw new Error('Handler error');
            });
            const normalHandler = vi.fn();

            // 订阅两个处理器
            eventBus.subscribe(eventToken, errorHandler, { sessionId });
            eventBus.subscribe(eventToken, normalHandler, { sessionId });

            // 发布事件
            eventBus.publish(sessionId, eventToken, { data: 'test' });

            // 两个处理器都应该被调用（错误不应该影响其他处理器）
            expect(errorHandler).toHaveBeenCalledTimes(1);
            expect(normalHandler).toHaveBeenCalledTimes(1);
        });
    });
});
