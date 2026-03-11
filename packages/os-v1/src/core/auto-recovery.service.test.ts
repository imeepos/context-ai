/**
 * AutoRecoveryService 测试
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EnvironmentInjector } from '@context-ai/core';
import { AutoRecoveryService } from './auto-recovery.service.js';
import { EventBusService } from './event-bus.js';
import { ActionExecuterImpl } from '../action-executer.js';
import { EVENT_BUS, ACTION_EXECUTER, CURRENT_DIR, SESSION_LOGGER, SESSION_ID, ACTIONS, USER_PERMISSIONS } from '../tokens.js';
import { ACTION_FAILED_EVENT } from '../events.js';
import { CODEX_TOKEN, codexAction } from '../actions/codex.action.js';

// Mock SessionLogger
const mockLogger = {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn()
};

describe('AutoRecoveryService', () => {
    let injector: any;
    let autoRecovery: AutoRecoveryService;
    let eventBus: EventBusService;
    let actionExecuter: ActionExecuterImpl;

    beforeEach(() => {
        // 创建测试注入器
        injector = EnvironmentInjector.createWithAutoProviders([
            { provide: SESSION_ID, useValue: 'test-session' },
            { provide: CURRENT_DIR, useValue: '/test/dir' },
            { provide: SESSION_LOGGER, useValue: mockLogger },
            { provide: EVENT_BUS, useClass: EventBusService },
            { provide: ACTIONS, useValue: [codexAction] },
            { provide: USER_PERMISSIONS, useValue: ['codex:execute'] },
            {
                provide: ACTION_EXECUTER,
                useFactory: (actions: any[], eventBus: any) => new ActionExecuterImpl(actions, eventBus),
                deps: [ACTIONS, EVENT_BUS]
            },
            { provide: AutoRecoveryService, useClass: AutoRecoveryService }
        ]);

        autoRecovery = injector.get(AutoRecoveryService);
        eventBus = injector.get(EVENT_BUS);
        actionExecuter = injector.get(ACTION_EXECUTER);

        // 清空 mock 调用记录
        vi.clearAllMocks();
    });

    describe('启动和停止', () => {
        it('应该成功启动服务', () => {
            autoRecovery.start({
                enabled: true,
                maxRetries: 3
            });

            expect(mockLogger.info).toHaveBeenCalledWith(
                'AUTO_RECOVERY',
                'Auto recovery service started',
                expect.any(Object)
            );
        });

        it('禁用时不应启动', () => {
            autoRecovery.start({
                enabled: false
            });

            expect(mockLogger.info).toHaveBeenCalledWith(
                'AUTO_RECOVERY',
                'Auto recovery is disabled'
            );
        });

        it('应该成功停止服务', () => {
            autoRecovery.start();
            autoRecovery.stop();

            expect(mockLogger.info).toHaveBeenCalledWith(
                'AUTO_RECOVERY',
                'Auto recovery service stopped'
            );
        });
    });

    describe('配置管理', () => {
        it('应该更新配置', () => {
            autoRecovery.start();

            autoRecovery.updateConfig({
                maxRetries: 5,
                codexModel: 'claude-opus-4.6'
            });

            expect(mockLogger.info).toHaveBeenCalledWith(
                'AUTO_RECOVERY',
                'Configuration updated',
                expect.objectContaining({
                    config: expect.objectContaining({
                        maxRetries: 5,
                        codexModel: 'claude-opus-4.6'
                    })
                })
            );
        });
    });

    describe('统计信息', () => {
        it('应该返回初始统计信息', () => {
            const stats = autoRecovery.getStatistics();

            expect(stats).toEqual({
                totalFailures: 0,
                totalAttempts: 0,
                successfulRecoveries: 0,
                failedRecoveries: 0,
                activeRecoveries: 0
            });
        });

        it('应该清空恢复记录', () => {
            autoRecovery.clearRecords();

            expect(mockLogger.info).toHaveBeenCalledWith(
                'AUTO_RECOVERY',
                'Recovery records cleared'
            );
        });
    });

    describe('错误处理', () => {
        it('应该跳过排除列表中的 action', async () => {
            autoRecovery.start({
                enabled: true,
                excludedActions: ['test.action']
            });

            // 发射失败事件
            eventBus.publish('test-session', ACTION_FAILED_EVENT, {
                executionId: 'exec-1',
                token: 'test.action',
                error: 'Test error',
                duration: 100
            });

            // 等待事件处理
            await new Promise(resolve => setTimeout(resolve, 100));

            expect(mockLogger.debug).toHaveBeenCalledWith(
                'AUTO_RECOVERY',
                'Skipping recovery for action',
                { token: 'test.action' }
            );
        });

        it('应该处理包含列表', async () => {
            autoRecovery.start({
                enabled: true,
                includedActions: ['allowed.action'],
                excludedActions: []
            });

            // 发射非包含列表中的 action 失败事件
            eventBus.publish('test-session', ACTION_FAILED_EVENT, {
                executionId: 'exec-2',
                token: 'not-allowed.action',
                error: 'Test error',
                duration: 100
            });

            // 等待事件处理
            await new Promise(resolve => setTimeout(resolve, 100));

            expect(mockLogger.debug).toHaveBeenCalledWith(
                'AUTO_RECOVERY',
                'Skipping recovery for action',
                { token: 'not-allowed.action' }
            );
        });
    });

    describe('恢复尝试', () => {
        it('应该记录恢复尝试', async () => {
            // Mock codex action 执行
            vi.spyOn(actionExecuter, 'execute').mockResolvedValue({
                stdout: 'Fixed',
                stderr: '',
                exit_code: 0,
                success: true
            });

            autoRecovery.start({
                enabled: true,
                excludedActions: ['codex.execute']
            });

            // 发射失败事件
            eventBus.publish('test-session', ACTION_FAILED_EVENT, {
                executionId: 'exec-3',
                token: 'test.action',
                error: 'Build failed',
                errorStack: 'at build.ts:10',
                duration: 100
            });

            // 等待恢复处理
            await new Promise(resolve => setTimeout(resolve, 200));

            expect(mockLogger.info).toHaveBeenCalledWith(
                'AUTO_RECOVERY',
                'Attempting recovery',
                expect.objectContaining({
                    executionId: 'exec-3',
                    token: 'test.action',
                    attempt: 1
                })
            );
        });

        it('应该限制最大重试次数', async () => {
            // Mock codex action 失败
            vi.spyOn(actionExecuter, 'execute').mockRejectedValue(
                new Error('Codex failed')
            );

            autoRecovery.start({
                enabled: true,
                maxRetries: 2,
                excludedActions: ['codex.execute']
            });

            // 发射多次失败事件（同一个 executionId）
            const executionId = 'exec-4';
            for (let i = 0; i < 5; i++) {
                eventBus.publish('test-session', ACTION_FAILED_EVENT, {
                    executionId,
                    token: 'test.action',
                    error: 'Build failed',
                    duration: 100
                });

                await new Promise(resolve => setTimeout(resolve, 100));
            }

            // 应该只尝试 2 次
            const stats = autoRecovery.getStatistics();
            expect(stats.totalAttempts).toBeLessThanOrEqual(2);
        });
    });

    describe('Prompt 构造', () => {
        it('应该包含错误信息', async () => {
            const mockExecute = vi.spyOn(actionExecuter, 'execute').mockResolvedValue({
                stdout: 'Fixed',
                stderr: '',
                exit_code: 0,
                success: true
            });

            autoRecovery.start({
                enabled: true,
                excludedActions: ['codex.execute']
            });

            eventBus.publish('test-session', ACTION_FAILED_EVENT, {
                executionId: 'exec-5',
                token: 'test.action',
                error: 'TypeScript error',
                errorStack: 'at compile.ts:20',
                duration: 100
            });

            await new Promise(resolve => setTimeout(resolve, 200));

            // 验证 codex 被调用，且 prompt 包含错误信息
            expect(mockExecute).toHaveBeenCalled();
            const call = mockExecute.mock.calls[0];
            expect(call).toBeDefined();
            if (call) {
                expect(call[0]).toBe(CODEX_TOKEN);
                expect(call[1]).toMatchObject({
                    prompt: expect.stringContaining('TypeScript error')
                });
            }
        });
    });
});
