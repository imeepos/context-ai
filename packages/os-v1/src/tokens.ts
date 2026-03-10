/**
 * DI Token 类型定义文件
 *
 * 本文件定义了 os-v1 包中依赖注入（DI）系统的核心类型。
 * 这些类型描述了一个基于 React 模式的 AI Agent 提示词渲染系统。
 *
 * 核心关系图：
 *
 * Application (应用定义)
 *      │
 *      ▼
 * ApplicationFactory.create() ──► Page[] (页面列表)
 *                                        │
 *                                        ▼
 *                               PageFactory.create() ──► RenderFactory<P>
 *                                                               │
 *                                                               ▼
 *                                                       RenderFactory.create(props)
 *                                                               │
 *                                                               ▼
 *                                                           Context
 *                                                        (prompt + tools)
 *
 * 数据流：Application → Pages → RenderFactory → Context → AI Agent 执行
 */

import { InjectionToken, Injector, type Provider } from '@context-ai/core';
import type { Static, TSchema } from '@mariozechner/pi-ai';
import type { RenderedContext, JSXElement } from '@context-ai/ctp';
import type { Observable, Subscription } from 'rxjs';
import type { EventEnvelope, EventToken } from './events.js';

// ============================================================================
// 应用与页面定义
// ============================================================================

/**
 * 应用程序元数据
 *
 * 描述一个 AI Agent 应用的基本信息，类似于 package.json 的概念。
 * 每个 Application 包含多个 Page（页面/路由）。
 */
export interface Application {
    /** 应用名称（唯一标识） */
    name: string;
    /** 应用描述 */
    description: string;
    /** 版本号 */
    version: string;
    /** 入口文件路径 export default [] as Page[]*/
    pages: Page[];
    /**
     * 服务注入到injector
     */
    providers: Provider[]
}
export const APPLICATIONS = new InjectionToken<Application[]>("os.applications");
/**
 * 页面定义
 *
 * 类似于 Web 框架中的路由，每个 Page 代表一个可访问的 AI 交互入口。
 * 使用泛型约束参数类型，确保类型安全。
 *
 * @template TParameters - 页面参数的 Schema 类型，默认为任意 Schema
 */
export interface Page<TParameters extends TSchema = TSchema> {
    /** 页面名称 */
    name: string;
    /** 页面描述 */
    description: string;
    /** 路由路径（如 '/chat/:id'） */
    path: string;
    /** 参数 Schema，用于验证传入的 props */
    props: TParameters;
    // 组件
    factory: ComponentFactory<Static<TParameters>>;
}

// ============================================================================
// 组件与上下文
// ============================================================================

/**
 * 组件函数类型
 *
 * 类似于 React 函数组件，接收 props 并异步返回 JSXElement。
 * 组件用于构建提示词的 UI 结构。
 *
 * @template Props - 组件属性类型
 */
export interface ComponentFactory<Props> {
    (props: Props, injector: Injector): Promise<JSXElement | string>;
}

// ============================================================================
// 工厂接口（依赖注入核心）
// ============================================================================

/**
 * 从本地文件夹加载应用
 */
export interface ApplicationLoader {
    load(): Promise<Application[]>;
}

export const APPLICATION_LOADER = new InjectionToken<ApplicationLoader[]>(`APPLICATION_LOADER`)
/**
 * 页面工厂接口
 *
 * 负责为单个页面创建对应的 RenderFactory。
 * 将页面定义（Page）转换为可执行的渲染器。
 *
 * 工作流程：
 * 1. 接收页面定义 Page<TParameters>
 * 2. 解析页面的参数 Schema
 * 3. 创建并返回 RenderFactory<Static<TParameters>>
 *
 * @template TParameters - 页面参数的 Schema 类型
 *
 * 类型说明：
 * - TParameters 是 Schema 定义（如 z.object({ id: z.string() })）
 * - Static<TParameters> 是 Schema 推断的 TypeScript 类型
 * - 这样确保了从 Schema 到 TypeScript 的类型安全
 */
export interface PageFactory {
    path: string;
    create<TParameters extends TSchema = TSchema>(params: Static<TParameters>, injector: Injector): Promise<RenderedContext>;
}

export const PAGES = new InjectionToken<PageFactory[]>(`PAGES`)

// ============================================================================
// 系统能力层（Action System）
// ============================================================================

/**
 * 能力令牌类型
 *
 * Token 是一个类型安全的字符串标识符，用于唯一标识系统中的某个能力。
 * 通过泛型参数携带请求和响应的 Schema 信息，实现编译时类型检查。
 *
 * 设计模式：类似于 Redux 的 Action Type 或 CQRS 的 Command Type
 *
 * @template TRequest - 请求参数的 Schema 类型
 * @template TResponse - 响应数据的 Schema 类型
 *
 * @example
 * // 定义一个查询用户的能力令牌
 * const USER_QUERY: Token<TUserQuery, TUserResponse> = 'user.query';
 */
export type Token<TRequest extends TSchema = TSchema, TResponse extends TSchema = TSchema> = string & { req?: TRequest, res?: TResponse }

/**
 * 系统能力定义（Action）
 *
 * Action 是系统中可执行操作的完整描述，封装了：
 * - 类型标识（Token）
 * - 输入/输出 Schema（用于验证和类型推断）
 * - 权限要求
 * - 依赖关系
 * - 执行逻辑
 *
 * 设计理念：
 * - 类似于 CQRS 的 Command/Query 模式
 * - 每个 Action 是一个独立的、可组合的能力单元
 * - 支持权限控制和依赖管理
 * - 可被 AI Agent 作为 Tool 调用
 *
 * 与 Context 的关系：
 * - Context.tools 是 Action 的子集（当前页面可用的能力）
 * - Action 执行通过 ActionExecuter 统一分发
 *
 * @template TRequest - 请求参数的 Schema 类型
 * @template TResponse - 响应数据的 Schema 类型
 *
 * @example
 * const queryUserAction: Action = {
 *     type: USER_QUERY_TOKEN,
 *     request: Type.Object({ id: Type.String() }),
 *     response: Type.Object({ name: Type.String(), email: Type.String() }),
 *     requiredPermissions: [USER_READ_PERMISSION],
 *     dependencies: [DATABASE_TOKEN],
 *     execute: async (params) => {
 *         return await db.getUser(params.id);
 *     }
 * };
 */
export interface Action<TRequest extends TSchema, TResponse extends TSchema> {
    /** 能力令牌，唯一标识此 Action */
    type: Token<TRequest, TResponse>;
    /** 能力描述 */
    description: string;
    /** 请求参数 Schema，用于验证输入 */
    request: TRequest;
    /** 响应数据 Schema，用于验证输出 */
    response: TResponse;
    /** 执行此能力所需的权限令牌列表 */
    requiredPermissions: string[];
    /** 此能力依赖的其他令牌（如数据库连接、外部服务等） */
    dependencies: Token[];
    /** 实际执行逻辑，接收验证后的参数，返回符合 Schema 的响应 */
    execute: (params: Static<TRequest>, injector: Injector) => Promise<Static<TResponse>>;
}

/**
 * 系统能力执行器（ActionExecuter）
 *
 * 统一的能力调度中心，负责：
 * - 根据 Token 查找对应的 Action
 * - 验证请求参数
 * - 检查权限
 * - 解析依赖
 * - 执行 Action 并返回结果
 *
 * 设计模式：Command Pattern + Service Locator
 *
 * 使用场景：
 * 1. AI Agent 通过 Tool 调用触发能力执行
 * 2. 页面组件内部调用系统能力
 * 3. 跨模块通信
 *
 * 优势：
 * - 统一的执行入口，便于日志、监控、重试
 * - 解耦调用者和执行者
 * - 支持动态注册和替换能力实现
 *
 * @example
 * // 在组件中调用能力
 * const user = await actionExecuter.execute(USER_QUERY_TOKEN, { id: '123' });
 */
export interface ActionExecuter {
    /**
     * 执行指定的系统能力
     *
     * @param type - 能力令牌
     * @param params - 请求参数（将被 Schema 验证）
     * @returns 符合响应 Schema 的数据
     * @throws 当能力不存在、参数验证失败、权限不足时抛出错误
     */
    execute<TRequest extends TSchema, TResponse extends TSchema>(
        type: Token<TRequest, TResponse>,
        params: Static<TRequest>,
        injector: Injector
    ): Promise<Static<TResponse>>;
}


// ============================================================================
// ActionExecuter 相关 Token
// ============================================================================

/**
 * ActionExecuter 注入令牌
 *
 * 用于注入 ActionExecuter 实例，统一的能力调度中心。
 */
export const ACTION_EXECUTER = new InjectionToken<ActionExecuter>("ACTION_EXECUTER");

/**
 * Actions 集合注入令牌
 *
 * 用于注入所有可用的 Action 列表。
 */
export const ACTIONS = new InjectionToken<Action<any, any>[]>("ACTIONS");

/**
 * 用户权限注入令牌
 *
 * 用于注入当前用户拥有的权限列表。
 * 在开发环境可以提供默认权限，生产环境应从认证系统获取。
 */
export const USER_PERMISSIONS = new InjectionToken<string[]>("USER_PERMISSIONS");

// ============================================================================
// 目录规范定义
// ============================================================================

/**
 * ~/.context-ai/
 */
export const ROOT_DIR = new InjectionToken<string>("ROOT_DIR");
export const PROJECT_ROOT = new InjectionToken<string>(`PROJECT_ROOT`)
/**
 * ~/.context-ai/shell/sessions
 * ~/.context-ai/shell/pids
 * ~/.context-ai/shell/logs
 */
export const SHELL_SESSION_DIR = new InjectionToken<string>("SHELL_SESSION_DIR");
export const SHELL_SESSION_FILE = new InjectionToken<string>("SHELL_SESSION_FILE");
export const SHELL_PID_DIR = new InjectionToken<string>("SHELL_PID_DIR");
export const LOG_DIR = new InjectionToken<string>("SHELL_LOG_DIR");

export const CURRENT_DIR = new InjectionToken<string>("CURRENT_DIR");

/**
 * 用户输入
 */
export const USER_PROMPT = new InjectionToken<string>("USER_PROMPT")
export const SESSION_ID = new InjectionToken<string>(`SESSION_ID`)

// ============================================================================
// Session Logger Token
// ============================================================================

import type { ISessionLogger } from "./core/session-logger.js";
import type { SchedulerService } from "./core/scheduler.js";

/**
 * SessionLogger 注入令牌
 *
 * 用于注入当前会话的日志记录器实例
 */
export const SESSION_LOGGER = new InjectionToken<ISessionLogger>("SESSION_LOGGER");

/**
 * SchedulerService 注入令牌
 *
 * 用于注入调度器服务实例，支持任务调度管理
 */
export const SCHEDULER_SERVICE = new InjectionToken<SchedulerService>("SCHEDULER_SERVICE");
// ============================================================================
// Scheduler 相关 Token
// ============================================================================

/**
 * EventBus 注入令牌
 *
 * 事件总线接口，用于发布和订阅事件
 */
export const EVENT_BUS = new InjectionToken<EventBus>("EVENT_BUS");

/**
 * SchedulerServiceOptions 注入令牌
 *
 * 调度器服务配置选项
 */
export const SCHEDULER_OPTIONS = new InjectionToken<SchedulerServiceOptions>("SCHEDULER_OPTIONS");

/**
 * 事件总线接口
 */
export interface EventBus {
    /** 发布事件（类型安全） */
    publish<TPayload extends TSchema>(
        sessionId: string,
        token: EventToken<TPayload>,
        payload: Static<TPayload>
    ): void;

    /** 订阅事件（支持通配符和过滤） */
    subscribe<TPayload extends TSchema>(
        pattern: string | EventToken<TPayload>,
        handler: (envelope: EventEnvelope<TPayload>) => void,
        options?: { sessionId?: string; metadata?: Record<string, unknown> }
    ): Subscription;

    /** 获取事件流的 Observable（高级用法） */
    getEventStream<TPayload extends TSchema>(
        pattern?: string | EventToken<TPayload>,
        sessionId?: string
    ): Observable<EventEnvelope<TPayload>>;
}

/**
 * 调度器状态存储适配器接口
 */
export interface SchedulerStateStorageAdapter {
    /** 加载状态快照 */
    load(): SchedulerStateSnapshot | undefined;
    /** 保存状态快照 */
    save(snapshot: SchedulerStateSnapshot): void;
}

/**
 * 调度器状态快照
 */
export interface SchedulerStateSnapshot {
    /** 持久化任务列表 */
    tasks: any[];
    /** 失败记录列表 */
    failures: any[];
}

/**
 * 调度器服务选项
 */
export interface SchedulerServiceOptions {
    /** 存储适配器 */
    storage?: SchedulerStateStorageAdapter;
    /** 是否自动持久化 */
    autoPersist?: boolean;
    /** 默认时区（用于 cron 任务） */
    defaultTimezone?: string;
}