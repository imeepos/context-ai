/**
 * Test Helpers - 测试辅助工具
 *
 * 提供便捷的测试依赖注入创建方法
 */

import { createApplicationInjector, createFeatureInjector } from "@context-ai/core";
import { testProviders } from "./providers.test.js";
import {
    ACTION_EXECUTER,
    APPLICATIONS,
    SESSION_ID,
    USER_PROMPT,
    SHELL_SESSION_FILE,
    SESSION_LOGGER
} from "./tokens.js";
import { createPageFactory } from "./createPageFactory.js";
import type { Provider } from "@context-ai/core";
import type { Injector } from "@context-ai/core";
import type { Application, Page, Token } from "./tokens.js";
import { MemorySessionLogger } from "./core/session-logger.js";
import { createPlatformInjector } from "@context-ai/core";
import type { Static, TSchema } from "@mariozechner/pi-ai";

// ============================================================================
// 全局测试平台注入器（单例）
// ============================================================================

let globalTestPlatform: Injector | null = null;

/**
 * 获取或创建全局测试平台注入器
 */
export function getGlobalTestPlatform(): Injector {
    if (!globalTestPlatform) {
        globalTestPlatform = createPlatformInjector(testProviders);
    }
    return globalTestPlatform;
}

/**
 * 重置全局测试平台注入器
 * 注意：通常不需要手动调用，除非需要完全重置测试环境
 */
export function resetGlobalTestPlatform(): void {
    globalTestPlatform = null;
}

// ============================================================================
// 测试注入器创建
// ============================================================================

/**
 * 创建测试用的平台注入器（使用全局单例）
 */
export function createTestPlatformInjector() {
    return getGlobalTestPlatform();
}

/**
 * 创建测试用的应用注入器
 *
 * @param applications - 要注册的应用列表
 * @param options - 配置选项
 */
export interface TestApplicationOptions {
    /** 自定义权限 */
    permissions?: string[];
    /** 会话 ID */
    sessionId?: string;
    /** 额外的 Providers */
    extraProviders?: Provider[];
}

export async function createTestApplicationInjector(
    applications: (Application | Page)[] = [],
    options: TestApplicationOptions = {}
) {
    const { permissions, sessionId = 'test-session', extraProviders = [] } = options;

    // 分离 Application 和 Page
    const validApps = applications.filter((app): app is Application =>
        'name' in app && 'version' in app && 'pages' in app
    );
    const standalonePages = applications.filter((item): item is Page =>
        'path' in item && 'factory' in item
    );

    // 从 Applications 提取 pages
    const appPages = validApps.map(app => app.pages).flat();

    // 合并所有 pages
    const allPages = [...appPages, ...standalonePages];

    const providers: Provider[] = [
        // 应用列表（只包含完整的 Application）
        { provide: APPLICATIONS, useValue: validApps },
        // 会话文件（虚拟路径）
        { provide: SHELL_SESSION_FILE, useValue: `${sessionId}.json` },
        // 页面工厂
        ...allPages.map(page => createPageFactory(page)),
        // 额外 providers
        ...extraProviders,
    ];

    if (permissions) {
        providers.push({ provide: 'USER_PERMISSIONS', useValue: permissions });
    }

    const application = createApplicationInjector(providers);

    await application.init();

    return application;
}

/**
 * 创建测试用的 Feature 注入器
 *
 * @param application - 应用注入器
 * @param options - 配置选项
 */
export interface TestFeatureOptions {
    /** 用户提示词 */
    userPrompt?: string;
    /** 会话 ID */
    sessionId?: string;
    /** 自定义 Logger（默认创建新的 MemorySessionLogger） */
    logger?: MemorySessionLogger;
}

export function createTestFeatureInjector(
    application: ReturnType<typeof createApplicationInjector>,
    options: TestFeatureOptions = {}
) {
    const { userPrompt = 'test prompt', sessionId, logger } = options;

    const providers: Provider[] = [
        { provide: USER_PROMPT, useValue: userPrompt },
    ];

    if (sessionId) {
        providers.push({ provide: SESSION_ID, useValue: sessionId });
    }

    if (logger) {
        providers.push({ provide: SESSION_LOGGER, useValue: logger });
        if (sessionId) {
            providers.push({ provide: SESSION_ID, useValue: sessionId });
        }
    } else {
        // 默认创建新的内存 Logger
        const memoryLogger = new MemorySessionLogger(sessionId || 'test-feature');
        providers.push({ provide: SESSION_LOGGER, useValue: memoryLogger });
        if (!sessionId) {
            providers.push({ provide: SESSION_ID, useValue: 'test-feature' });
        }
    }

    return createFeatureInjector(providers, application);
}

// ============================================================================
// 快捷创建方法
// ============================================================================

/**
 * 一站式创建完整的测试注入器体系
 *
 * @param applications - 要注册的应用列表（支持 Application 或 Page）
 * @param options - 配置选项
 */
export async function createTestInjector(
    applications: (Application | Page)[] = [],
    options: TestApplicationOptions & TestFeatureOptions = {}
) {
    // 1. 创建平台注入器
    const platform = createTestPlatformInjector();

    // 2. 创建应用注入器
    const application = await createTestApplicationInjector(applications, options);

    // 3. 创建 Feature 注入器
    const feature = createTestFeatureInjector(application, options);

    return { platform, application, feature };
}

// ============================================================================
// 测试断言辅助
// ============================================================================

/**
 * 获取 ActionExecuter 实例
 */
export function getActionExecuter(platform: Injector) {
    return platform.get(ACTION_EXECUTER);
}

/**
 * 执行 Action 并返回结果（快捷方法）
 */
export async function executeAction<TRequest extends TSchema, TResponse extends TSchema>(
    feature: Injector,
    token: Token<TRequest, TResponse>,
    params: Static<TRequest>
): Promise<Static<TResponse>> {
    const platform = getGlobalTestPlatform()
    const executer = getActionExecuter(platform);
    return executer.execute(token, params, feature) as Promise<TResponse>;
}

// ============================================================================
// 导出
// ============================================================================

export { testProviders } from "./providers.test.js";
