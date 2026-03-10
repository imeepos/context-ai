/**
 * Loop Action 单元测试
 *
 * 测试 Agent 循环执行功能
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { Type } from '@sinclair/typebox';
import type { Page } from '../tokens.js';
import { LOOP_REQUEST_TOKEN, LOOP_REQUEST_PERMISSION, loopRequestAction } from './loop.action.js';
import { MemorySessionLogger } from '../core/session-logger.js';
import { createTestInjector, getActionExecuter, executeAction } from '../test-helpers.js';

// ============================================================================
// Schema Validation Tests
// ============================================================================

describe('loop.action - Schema Validation', () => {
    it('should have correct request schema structure', () => {
        expect(loopRequestAction.request).toBeDefined();
        const schema = loopRequestAction.request;
        expect(schema).toHaveProperty('type');
        expect(schema.type).toBe('object');
    });

    it('should have correct response schema structure', () => {
        expect(loopRequestAction.response).toBeDefined();
        const schema = loopRequestAction.response;
        expect(schema).toHaveProperty('type');
        expect(schema.type).toBe('object');
    });

    it('should have correct token and permissions', () => {
        expect(loopRequestAction.type).toBe(LOOP_REQUEST_TOKEN);
        expect(loopRequestAction.requiredPermissions).toContain(LOOP_REQUEST_PERMISSION);
    });
});

// ============================================================================
// Page Not Found Tests
// ============================================================================

describe('loop.action - Page Not Found', () => {
    let mockLogger: MemorySessionLogger;

    beforeEach(() => {
        mockLogger = new MemorySessionLogger('test-page-not-found');
    });

    it('should return error when page path does not match', async () => {
        const { feature } = await createTestInjector([], {
            sessionId: 'test-page-not-found',
            logger: mockLogger
        });

        const result = await executeAction(
            feature,
            LOOP_REQUEST_TOKEN,
            {
                path: '/non-existent-page-' + Date.now(),
                prompt: 'Hello'
            }
        );

        expect(result.success).toBe(false);
        expect(result.output).toBe('');
        expect(result.error).toContain('Page not found');
        expect(result.toolCallsCount).toBe(0);
    });
});

// ============================================================================
// Mock Page Execution Tests
// ============================================================================

describe('loop.action - Mock Page Execution', () => {
    it('should execute agent with a simple mock page', async () => {
        const mockPage: Page = {
            name: 'Test Page',
            description: 'A test page for unit testing',
            path: '/test-mock-page',
            props: Type.Object({}),
            factory: async (_props, _injector) => {
                return 'You are a helpful assistant. Respond briefly with "Hello!"';
            }
        };

        const mockLogger = new MemorySessionLogger('test-mock-page');
        const { feature } = await createTestInjector([mockPage], {
            sessionId: 'test-mock-page',
            logger: mockLogger
        });

        const result = await executeAction(
            feature,
            LOOP_REQUEST_TOKEN,
            {
                path: '/test-mock-page',
                prompt: 'Say hello'
            }
        );

        // 验证结果结构
        expect(result).toBeDefined();
        expect(typeof result.success).toBe('boolean');
        expect(typeof result.output).toBe('string');
        expect(typeof result.toolCallsCount).toBe('number');
        expect(result.toolCallsCount).toBeGreaterThanOrEqual(0);

        // 验证日志记录
        const logs = mockLogger.getLogs();
        expect(logs.length).toBeGreaterThan(0);
        expect(logs.some(log => log.category === 'LOOP_ACTION')).toBe(true);
    });
});

// ============================================================================
// Dynamic Route Parameters Tests
// ============================================================================

describe('loop.action - Dynamic Route Parameters', () => {
    it('should match pages with dynamic parameters', async () => {
        const mockPage: Page = {
            name: 'Dynamic Page',
            description: 'A page with dynamic parameters',
            path: '/test/:id',
            props: Type.Object({
                id: Type.String()
            }),
            factory: async (props, _injector) => {
                const { id } = props as { id: string };
                return 'You are a helpful assistant. The ID is: ' + (id || 'unknown');
            }
        };

        const mockLogger = new MemorySessionLogger('test-dynamic');
        const { feature } = await createTestInjector([mockPage], {
            sessionId: 'test-dynamic',
            logger: mockLogger
        });

        const result = await executeAction(
            feature,
            LOOP_REQUEST_TOKEN,
            {
                path: '/test/12345',
                prompt: 'What is the ID?'
            }
        );

        // 验证结果
        expect(result).toBeDefined();
        expect(typeof result.success).toBe('boolean');
        expect(typeof result.output).toBe('string');
        // 页面应该成功匹配（不是 "Page not found" 错误）
        if (!result.success) {
            expect(result.error).not.toContain('Page not found');
        }
    });
});

// ============================================================================
// Request Validation Tests
// ============================================================================

describe('loop.action - Request Validation', () => {
    it('should validate required fields', async () => {
        const { platform, feature } = await createTestInjector();

        const executer = getActionExecuter(platform);

        // 测试缺少 prompt 字段
        await expect(async () => {
            await executer.execute(
                LOOP_REQUEST_TOKEN,
                { path: '/test' } as any,
                feature
            );
        }).rejects.toThrow();
    });

    it('should validate prompt is a string', async () => {
        const { platform, feature } = await createTestInjector();

        const executer = getActionExecuter(platform);

        await expect(async () => {
            await executer.execute(
                LOOP_REQUEST_TOKEN,
                { path: '/test', prompt: 123 } as any,
                feature
            );
        }).rejects.toThrow();
    });
});

// ============================================================================
// Logging Tests
// ============================================================================

describe('loop.action - Logging', () => {
    it('should log request start and end', async () => {
        const mockPage: Page = {
            name: 'Logging Test Page',
            description: 'Page for testing logging',
            path: '/test-logging',
            props: Type.Object({}),
            factory: async (_props, _injector) => {
                return 'You are a helpful assistant. Say "OK".';
            }
        };

        const testLogger = new MemorySessionLogger('test-logging');
        const { feature } = await createTestInjector([mockPage], {
            sessionId: 'test-logging',
            logger: testLogger
        });

        await executeAction(
            feature,
            LOOP_REQUEST_TOKEN,
            {
                path: '/test-logging',
                prompt: 'Say OK'
            }
        );

        const logs = testLogger.getLogs();

        // 验证日志记录
        expect(logs.length).toBeGreaterThan(0);
        expect(logs.some(log => log.category === 'LOOP_ACTION')).toBe(true);

        // 查找 START 日志
        const startLog = logs.find(log =>
            log.message.includes('LOOP REQUEST START')
        );
        expect(startLog).toBeDefined();

        // 查找 END 或 SUMMARY 日志
        const endLog = logs.find(log =>
            log.message.includes('LOOP REQUEST END') ||
            log.message.includes('EXECUTION SUMMARY')
        );
        expect(endLog).toBeDefined();
    });

    it('should record all LOOP_ACTION logs', async () => {
        const mockPage: Page = {
            name: 'Detailed Logging Page',
            description: 'Page for detailed logging test',
            path: '/test-detailed-logging',
            props: Type.Object({}),
            factory: async (_props, _injector) => {
                return 'You are a helpful assistant.';
            }
        };

        const testLogger = new MemorySessionLogger('test-detailed-logging');
        const { feature } = await createTestInjector([mockPage], {
            sessionId: 'test-detailed-logging',
            logger: testLogger
        });

        await executeAction(
            feature,
            LOOP_REQUEST_TOKEN,
            {
                path: '/test-detailed-logging',
                prompt: 'Hello'
            }
        );

        const loopLogs = testLogger.getLogsByCategory('LOOP_ACTION');

        // 验证关键日志存在
        expect(loopLogs.some(log => log.message.includes('LOOP REQUEST START'))).toBe(true);
        expect(loopLogs.some(log => log.message.includes('Request Parameters'))).toBe(true);
        expect(loopLogs.some(log => log.message.includes('Page Matched'))).toBe(true);
        expect(loopLogs.some(log => log.message.includes('Agent Created'))).toBe(true);
    });
});

// ============================================================================
// Wildcard Route Matching Tests
// ============================================================================

describe('loop.action - Wildcard Route Matching', () => {
    it('should match wildcard routes', async () => {
        const mockPage: Page = {
            name: 'Wildcard Page',
            description: 'A page with wildcard route',
            path: '/test/*',
            props: Type.Object({}),
            factory: async (_props, _injector) => {
                return 'You are a helpful assistant. Say "Wildcard matched!".';
            }
        };

        const mockLogger = new MemorySessionLogger('test-wildcard');
        const { feature } = await createTestInjector([mockPage], {
            sessionId: 'test-wildcard',
            logger: mockLogger
        });

        const result = await executeAction(
            feature,
            LOOP_REQUEST_TOKEN,
            {
                path: '/test/anything/goes/here',
                prompt: 'Say something'
            }
        );

        // 验证结果 - 不应该是 Page not found
        expect(result).toBeDefined();
        if (!result.success) {
            expect(result.error).not.toContain('Page not found');
        }
    });
});
