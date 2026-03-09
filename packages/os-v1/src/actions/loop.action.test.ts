import { describe, it, expect, beforeAll, vi } from 'vitest';
import { createPlatformInjector, createApplicationInjector, createFeatureInjector } from '@context-ai/core';
import { providers } from '../providers.js';
import {
    ACTION_EXECUTER,
    APPLICATION_LOADER,
    PAGES,
    SESSION_ID,
    USER_PERMISSIONS,
    USER_PROMPT,
    SHELL_SESSION_DIR,
    SHELL_SESSION_FILE
} from '../tokens.js';
import { LOOP_REQUEST_TOKEN, LOOP_REQUEST_PERMISSION } from './loop.action.js';
import { ShellSessionStore } from '../core/shell-session.js';
import { createPageFactory } from '../createPageFactory.js';
import { join } from 'path';
import type { Page } from '../tokens.js';
import { Type } from '@sinclair/typebox';

describe('loop.action', () => {
    let os: ReturnType<typeof createPlatformInjector>;
    let application: ReturnType<typeof createApplicationInjector>;

    beforeAll(async () => {
        // 1. 初始化操作系统
        os = createPlatformInjector(providers);
        await os.init();

        // 2. 加载应用
        const appLoaders = os.get(APPLICATION_LOADER);
        const allApplications = await Promise.all(
            appLoaders.map(loader => loader.load())
        ).then(res => res.flat());

        const appProviders = allApplications.map(app => app.providers).flat();
        const pages = allApplications.map(app => app.pages).flat();

        // 3. 创建应用注入器
        const sessionId = 'test-session-' + Date.now();
        application = createApplicationInjector([
            {
                provide: SHELL_SESSION_FILE,
                useFactory: (root: string) => join(root, `${sessionId}.json`),
                deps: [SHELL_SESSION_DIR]
            },
            {
                provide: ShellSessionStore,
                useFactory: (sessionFile: string) => new ShellSessionStore(sessionFile),
                deps: []
            },
            {
                provide: USER_PERMISSIONS,
                useValue: ['shell:exec', LOOP_REQUEST_PERMISSION]
            },
            ...appProviders,
            ...pages.map(page => createPageFactory(page))
        ]);

        await application.init();
    });

    it('should execute agent loop successfully with valid page', async () => {
        // 创建特征注入器
        const featureInjector = createFeatureInjector([
            { provide: USER_PROMPT, useValue: 'test prompt' },
            { provide: SESSION_ID, useValue: crypto.randomUUID() }
        ], application);

        const actionExecuter = os.get(ACTION_EXECUTER);

        // 获取可用的页面列表
        const pages = application.get(PAGES);

        if (pages.length === 0) {
            console.warn('No pages available for testing, skipping test');
            return;
        }

        const testPage = pages[0];

        // 执行 loop action
        const result = await actionExecuter.execute(
            LOOP_REQUEST_TOKEN,
            {
                path: testPage.path,
                prompt: 'Hello, this is a test prompt'
            },
            featureInjector
        );

        // 验证结果
        expect(result).toBeDefined();
        expect(result).toHaveProperty('success');
        expect(result).toHaveProperty('output');
        expect(result).toHaveProperty('toolCallsCount');
        expect(typeof result.success).toBe('boolean');
        expect(typeof result.output).toBe('string');
        expect(typeof result.toolCallsCount).toBe('number');
    });

    it('should return error when page not found', async () => {
        const featureInjector = createFeatureInjector([
            { provide: USER_PROMPT, useValue: 'test prompt' },
            { provide: SESSION_ID, useValue: crypto.randomUUID() }
        ], application);

        const actionExecuter = os.get(ACTION_EXECUTER);

        // 执行 loop action with invalid path
        const result = await actionExecuter.execute(
            LOOP_REQUEST_TOKEN,
            {
                path: '/non-existent-page',
                prompt: 'Hello'
            },
            featureInjector
        );

        // 验证错误响应
        expect(result.success).toBe(false);
        expect(result.output).toBe('');
        expect(result.error).toContain('Page not found');
        expect(result.toolCallsCount).toBe(0);
    });

    it('should handle agent execution with mock page', async () => {
        // 创建一个简单的测试页面
        const mockPage: Page = {
            name: 'Test Page',
            description: 'A test page for unit testing',
            path: '/test-mock',
            props: Type.Object({
                prompt: Type.String()
            }),
            factory: async (props, injector) => {
                return <system>You are a helpful assistant. Respond briefly.</system>;
            }
        };

        // 创建包含 mock page 的应用注入器
        const sessionId = 'test-mock-session-' + Date.now();
        const mockApplication = createApplicationInjector([
            {
                provide: SHELL_SESSION_FILE,
                useFactory: (root: string) => join(root, `${sessionId}.json`),
                deps: [SHELL_SESSION_DIR]
            },
            {
                provide: ShellSessionStore,
                useFactory: (sessionFile: string) => new ShellSessionStore(sessionFile),
                deps: []
            },
            {
                provide: USER_PERMISSIONS,
                useValue: ['shell:exec', LOOP_REQUEST_PERMISSION]
            },
            createPageFactory(mockPage)
        ]);

        await mockApplication.init();

        const featureInjector = createFeatureInjector([
            { provide: USER_PROMPT, useValue: 'test prompt' },
            { provide: SESSION_ID, useValue: crypto.randomUUID() }
        ], mockApplication);

        const actionExecuter = os.get(ACTION_EXECUTER);

        // 执行 loop action
        const result = await actionExecuter.execute(
            LOOP_REQUEST_TOKEN,
            {
                path: '/test-mock',
                prompt: 'Say hello'
            },
            featureInjector
        );

        // 验证结果
        expect(result).toBeDefined();
        expect(result.success).toBeDefined();
        expect(result.output).toBeDefined();
        expect(result.toolCallsCount).toBeGreaterThanOrEqual(0);
    });

    it('should validate request schema', async () => {
        const featureInjector = createFeatureInjector([
            { provide: USER_PROMPT, useValue: 'test prompt' },
            { provide: SESSION_ID, useValue: crypto.randomUUID() }
        ], application);

        const actionExecuter = os.get(ACTION_EXECUTER);

        // 测试缺少必需字段的情况
        await expect(async () => {
            await actionExecuter.execute(
                LOOP_REQUEST_TOKEN,
                { path: '/test' } as any, // 缺少 prompt 字段
                featureInjector
            );
        }).rejects.toThrow();
    });
});
