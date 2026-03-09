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

import type { AgentTool } from '@mariozechner/pi-agent-core';
import type { Static, TSchema } from '@mariozechner/pi-ai';

// ============================================================================
// 基础类型定义
// ============================================================================

/**
 * JSX 元素结构
 *
 * 模拟 React 的虚拟 DOM 节点，用于表示提示词中的结构化内容。
 * 组件函数返回此类型，最终会被渲染成字符串形式的 prompt。
 */
export interface JSXElement {
    /** 元素类型：HTML 标签名（如 'div'）或组件函数 */
    type: string | Function;
    /** 元素属性对象 */
    props: Record<string, unknown> | null;
    /** React key，用于列表渲染时的 diff 优化 */
    key?: string | number;
}

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
    main: string;
}

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
export interface Component<Props> {
    (props: Props): Promise<JSXElement>;
}

/**
 * 提示词类型别名
 *
 * 最终发送给 AI Agent 的文本内容，由组件树渲染而成。
 */
export type Prompt = string;

/**
 * AI Agent 执行上下文
 *
 * 包含执行 AI 调用所需的所有信息：
 * - prompt: 渲染后的提示词文本
 * - tools: Agent 可调用的工具列表
 *
 * 这是整个渲染流程的最终输出，将被传递给 AI Agent 执行引擎。
 */
export interface Context {
    /** 渲染后的提示词 */
    prompt: Prompt;
    /** Agent 可用的工具列表 */
    tools: AgentTool[];
}

// ============================================================================
// 工厂接口（依赖注入核心）
// ============================================================================

/**
 * 渲染工厂接口
 *
 * 负责根据给定的 props 创建执行上下文（Context）。
 * 每个 Page 对应一个 RenderFactory 实例。
 *
 * 工作流程：
 * 1. 接收页面参数 props
 * 2. 渲染组件树生成 prompt
 * 3. 收集组件树中提取的 tools
 * 4. 返回完整的 Context
 *
 * @template P - 页面参数类型，由 Page.props 的 Static 类型推断
 */
export interface RenderFactory<P> {
    create(props: P): Promise<Context>
}

/**
 * 应用工厂接口
 *
 * 顶级工厂，负责解析 Application 定义并返回所有可用页面。
 * 这是 DI 容器的入口点。
 *
 * 职责：
 * - 加载应用配置
 * - 扫描并注册所有页面
 * - 返回页面列表供路由使用
 */
export interface ApplicationFactory {
    create(app: Application): Promise<Page[]>;
}

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
    create<TParameters extends TSchema = TSchema>(
        page: Page<TParameters>
    ): Promise<RenderFactory<Static<TParameters>>>;
}