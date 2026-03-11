/**
 * Test Providers - 测试专用依赖注入配置
 *
 * 提供基于内存的实现，替代文件系统持久化，用于单元测试。
 *
 * 使用方式:
 * import { createTestInjector } from './providers.test.js';
 * const injector = createTestInjector();
 */

import type { Provider } from "@context-ai/core";
import {
    ACTION_EXECUTER,
    ACTIONS,
    APPLICATION_LOADER,
    CURRENT_DIR,
    LOG_DIR,
    PROJECT_ROOT,
    ROOT_DIR,
    SHELL_PID_DIR,
    SHELL_SESSION_DIR,
    EVENT_BUS,
    SCHEDULER_OPTIONS,
    USER_PERMISSIONS,
    SESSION_LOGGER
} from "./tokens.js";
import { ActionExecuterImpl } from "./action-executer.js";
import { EventBusService } from "./core/event-bus.js";
import { MemorySchedulerStateAdapter } from "./core/scheduler-persistence.js";
import { MemorySessionLogger } from "./core/session-logger.js";
import type { SchedulerServiceOptions } from "./tokens.js";

// ============================================================================
// Actions 导入（复用生产代码）
// ============================================================================

import { shellExecuteAction } from "./actions/shell-execute.action.js";
import { shellEnvSetAction } from "./actions/shell-env-set.action.js";
import { shellEnvListAction } from "./actions/shell-env-list.action.js";
import { shellEnvUnsetAction } from "./actions/shell-env-unset.action.js";
import { fileReadAction } from "./actions/file-read.action.js";
import { fileWriteAction } from "./actions/file-write.action.js";
import { fileListAction } from "./actions/file-list.action.js";
import { fileFindAction } from "./actions/file-find.action.js";
import { fileGrepAction } from "./actions/file-grep.action.js";
import { fileEditAction } from "./actions/file-edit.action.js";
import { fileSnapshotAction } from "./actions/file-snapshot.action.js";
import { fileRollbackAction } from "./actions/file-rollback.action.js";
import { loopRequestAction } from "./actions/loop.action.js";
import { bowongModelActions } from "./actions/bowong/index.js";

// ============================================================================
// Action 注册函数
// ============================================================================

/**
 * 获取所有 Action 的 Provider 配置
 */
function getActionProviders(): Provider[] {
    const actions = [
        shellExecuteAction,
        shellEnvSetAction,
        shellEnvListAction,
        shellEnvUnsetAction,
        fileReadAction,
        fileWriteAction,
        fileListAction,
        fileFindAction,
        fileGrepAction,
        fileEditAction,
        fileSnapshotAction,
        fileRollbackAction,
        loopRequestAction,
        ...bowongModelActions,
    ];

    return actions.flatMap(action => [
        { provide: ACTIONS, useValue: action, multi: true },
        { provide: action.type, useValue: action }
    ]);
}

// ============================================================================
// 测试路径常量
// ============================================================================

/**
 * 测试用的虚拟路径（不使用实际文件系统）
 */
export const TEST_PATHS = {
    ROOT_DIR: '/memory/test/.context-ai',
    SHELL_SESSION_DIR: '/memory/test/.context-ai/shell/sessions',
    SHELL_PID_DIR: '/memory/test/.context-ai/shell/pids',
    LOG_DIR: '/memory/test/.context-ai/logs',
    CURRENT_DIR: '/memory/test',
    PROJECT_ROOT: '/memory/test/project',
} as const;

// ============================================================================
// 测试 Provider 配置
// ============================================================================

/**
 * 基础测试 Providers
 *
 * 包含：
 * - 虚拟路径常量（不使用实际文件系统）
 * - 所有 Action 注册
 * - 内存 Scheduler 存储适配器
 * - 内存 Logger
 * - EventBus
 * - ActionExecuter
 */
export const testProviders: Provider[] = [
    // 路径常量（使用虚拟路径，不依赖文件系统）
    { provide: ROOT_DIR, useValue: TEST_PATHS.ROOT_DIR },
    { provide: SHELL_SESSION_DIR, useValue: TEST_PATHS.SHELL_SESSION_DIR },
    { provide: SHELL_PID_DIR, useValue: TEST_PATHS.SHELL_PID_DIR },
    { provide: LOG_DIR, useValue: TEST_PATHS.LOG_DIR },
    { provide: CURRENT_DIR, useValue: TEST_PATHS.CURRENT_DIR },
    { provide: PROJECT_ROOT, useValue: TEST_PATHS.PROJECT_ROOT },

    // Action 注册（复用生产代码）
    ...getActionProviders(),

    // 空的 Application Loader（测试时不加载外部应用）
    { provide: APPLICATION_LOADER, useValue: { load: async () => [] }, multi: true },

    // EventBus（使用生产实现，它是内存的）
    { provide: EVENT_BUS, useClass: EventBusService },

    // Scheduler 配置（使用内存存储适配器）
    {
        provide: SCHEDULER_OPTIONS,
        useValue: {
            storage: new MemorySchedulerStateAdapter(),
            autoPersist: false, // 测试时关闭自动持久化
            defaultTimezone: 'UTC'
        } as SchedulerServiceOptions
    },

    // ActionExecuter
    {
        provide: ACTION_EXECUTER,
        useFactory: (actions, eventBus) => new ActionExecuterImpl(actions, eventBus),
        deps: [ACTIONS, EVENT_BUS]
    },

    // 测试用默认权限（包含所有权限）
    {
        provide: USER_PERMISSIONS,
        useValue: [
            'shell:exec',
            'shell:env:set',
            'shell:env:unset',
            'file:read',
            'file:write',
            'file:list',
            'file:find',
            'file:grep',
            'file:edit',
            'file:snapshot',
            'file:rollback',
            'scheduler:write',
            'scheduler:read',
            'loop:request',
            'net:request',
            'model:generate',
            'ai:text:generate',
            'ai:image:generate',
            'ai:video:generate',
            'bowong:model:invoke',
        ]
    },
];

// ============================================================================
// 测试辅助函数
// ============================================================================

/**
 * 创建带自定义配置的测试 Providers
 *
 * @param options - 测试配置选项
 */
export interface TestProviderOptions {
    /** 自定义权限列表（默认包含所有权限） */
    permissions?: string[];
    /** Scheduler 初始状态 */
    initialSchedulerState?: import('./core/scheduler-types.js').SchedulerStateSnapshot;
    /** 额外的 Providers */
    extraProviders?: Provider[];
}

/**
 * 创建测试 Provider 配置
 *
 * @param options - 配置选项
 * @returns Provider 数组
 */
export function createTestProviders(options: TestProviderOptions = {}): Provider[] {
    const {
        permissions,
        initialSchedulerState,
        extraProviders = []
    } = options;

    const providers: Provider[] = [...testProviders];

    // 覆盖权限配置
    if (permissions) {
        const permissionIndex = providers.findIndex(p => p.provide === USER_PERMISSIONS);
        if (permissionIndex >= 0) {
            providers[permissionIndex] = { provide: USER_PERMISSIONS, useValue: permissions };
        }
    }

    // 覆盖 Scheduler 配置
    if (initialSchedulerState) {
        const schedulerOptionsIndex = providers.findIndex(p => p.provide === SCHEDULER_OPTIONS);
        if (schedulerOptionsIndex >= 0) {
            providers[schedulerOptionsIndex] = {
                provide: SCHEDULER_OPTIONS,
                useValue: {
                    storage: new MemorySchedulerStateAdapter(initialSchedulerState),
                    autoPersist: false,
                    defaultTimezone: 'UTC'
                } as SchedulerServiceOptions
            };
        }
    }

    // 添加额外 providers
    providers.push(...extraProviders);

    return providers;
}

/**
 * 创建内存 Logger Provider
 *
 * @param sessionId - 会话 ID（默认为 'test-session'）
 */
export function createMemoryLoggerProvider(sessionId: string = 'test-session'): Provider {
    return {
        provide: SESSION_LOGGER,
        useValue: new MemorySessionLogger(sessionId)
    };
}
