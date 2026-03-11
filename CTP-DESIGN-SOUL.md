# CTP 协议的设计灵魂 - 准确版本

> 基于实际代码实现的深度分析 (2025-03-11)

## 核心定位

CTP (Context Protocol) 是一个**为 AI Agent 设计的声明式上下文协议**，使用 JSX 语法构建 AI 可理解的结构化接口。

```
传统应用程序                CTP 应用程序
用户 → UI → 逻辑          AI Agent → Context → 逻辑
目标: 人类可用             目标: AI 可理解、可执行、可追踪
```

---

## 十大设计灵魂

### 1. **AI-First 范式** 🎯

**核心理念**：不是为人类设计界面，而是为 AI Agent 设计结构化的"操作界面"。

```tsx
// 传统方式：写文档 → AI 读文档 → AI 猜测如何操作
// CTP 方式：声明上下文 → AI 直接看到结构化的工具和数据

<Context name="订单管理">
  <Text>管理客户订单的智能助手</Text>
  <Data source={orders} format="table" />
  <Tool name="cancel_order" description="取消订单" ... />
</Context>
```

---

### 2. **TypeBox Schema 系统** 📦

**实际使用的是 TypeBox，不是 Zod！**

```typescript
// ✅ 实际代码使用 TypeBox
import { Type, type Static } from '@sinclair/typebox';

const FileReadRequestSchema = Type.Object({
  path: Type.String({ description: "The file path to read" }),
});

type FileReadRequest = Static<typeof FileReadRequestSchema>;
```

**为什么选择 TypeBox？**
- **运行时验证 + 类型推断**：`Static<typeof Schema>` 自动推导类型
- **JSON Schema 标准**：直接生成符合规范的 JSON Schema
- **性能优良**：比 Zod 更轻量，验证速度更快
- **与 pi-agent-core 完美集成**

**常用类型对照表**：

| TypeBox 类型 | JSON Schema | 说明 |
|-------------|-------------|------|
| `Type.String()` | `{ type: "string" }` | 字符串 |
| `Type.Integer()` | `{ type: "integer" }` | 整数 |
| `Type.Number()` | `{ type: "number" }` | 数字 |
| `Type.Boolean()` | `{ type: "boolean" }` | 布尔值 |
| `Type.Array(T)` | `{ type: "array", items: ... }` | 数组 |
| `Type.Object({})` | `{ type: "object", properties: {} }` | 对象 |
| `Type.Optional(T)` | 从 required 中移除 | 可选字段 |
| `Type.String({ format: 'uuid' })` | 添加 format | UUID 格式 |
| `Type.String({ pattern: '...' })` | 添加 pattern | 正则匹配 |

---

### 3. **Token 类型系统** 🎫

**Token 是类型安全的字符串标识符**：

```typescript
// Token 定义
export const FILE_READ_TOKEN: Token<
  typeof FileReadRequestSchema,  // 请求 Schema 类型
  typeof FileReadResponseSchema  // 响应 Schema 类型
> = "file.read";  // 字符串字面量

// Token 类型定义
type Token<TRequestSchema extends TSchema, TResponseSchema extends TSchema> = string;
```

**Token 的三重作用**：
1. **唯一标识 Action** - 字符串 Key
2. **编译时类型检查** - 泛型约束
3. **依赖注入的 Key** - DI 容器使用

---

### 4. **Action 结构** ⚙️

```typescript
export interface Action<
  TRequestSchema extends TSchema,
  TResponseSchema extends TSchema
> {
  type: Token<TRequestSchema, TResponseSchema>;  // Token 标识
  description: string;                           // 描述
  request: TRequestSchema;                       // 请求 Schema（TypeBox）
  response: TResponseSchema;                     // 响应 Schema（TypeBox）
  requiredPermissions: string[];                 // 所需权限
  dependencies: Token<any, any>[];               // 依赖的其他 Action
  execute: (params, injector) => Promise<Response>; // 执行函数
}
```

**实际示例**：

```typescript
export const fileReadAction: Action<
  typeof FileReadRequestSchema,
  typeof FileReadResponseSchema
> = {
  type: FILE_READ_TOKEN,
  description: "Read the content of a file",
  request: FileReadRequestSchema,
  response: FileReadResponseSchema,
  requiredPermissions: ["file:read"],
  dependencies: [],
  execute: async (params: FileReadRequest, _injector: Injector) => {
    const absolutePath = resolve(params.path);
    const content = await readFile(absolutePath, "utf8");
    return { content };
  },
};
```

---

### 5. **CTP JSX 渲染** ⚛️

**JSX 到 RenderedContext 的转换流程**：

```typescript
// JSX 输入
<Context name="Weather">
  <Text>天气助手</Text>
  <Tool name="get_weather" ... />
</Context>

// 渲染输出
interface RenderedContext {
  name: string;           // "Weather"
  description?: string;
  prompt: string;         // 生成的结构化 prompt
  tools: AgentTool[];     // 可用工具列表（pi-agent-core 格式）
  dataViews: DataView[];  // 数据视图
  metadata?: {...};
}
```

**核心渲染函数**：

```typescript
// packages/ctp/src/core/renderer.ts
export async function render(element: JSXElement): Promise<RenderedContext> {
  const ctx: RenderedContext = {
    name: '',
    prompt: '',
    tools: [],
    dataViews: [],
    metadata: {}
  };

  await walkJSX(element, ctx);  // 遍历 JSX 树
  ctx.prompt = buildPrompt(ctx); // 构建最终 prompt

  return ctx;
}
```

---

### 6. **Tool 组件实际 API** 🔧

**实际定义**（来自 `packages/ctp/src/components/tool.ts`）：

```typescript
import type { TSchema } from '@sinclair/typebox';
import type { AgentTool } from '@mariozechner/pi-agent-core';

export function Tool<TParameters extends TSchema = TSchema, TDetails = any>(
  props: AgentTool<TParameters, TDetails>
): JSXElement {
  return { type: 'Tool', props: props, key: props.name };
}
```

**正确的使用方式**：

```tsx
// ✅ 正确：使用 parameters prop
<Tool
  name="file_read"
  description="Read a file"
  parameters={FileReadRequestSchema}  // TypeBox Schema
  execute={async (params) => {
    const content = await readFile(params.path);
    return { content };
  }}
/>

// ❌ 错误：不存在 schema prop
<Tool
  name="file_read"
  schema={...}  // 错误！实际是 parameters
  executor={...} // 错误！实际是 execute
/>
```

**AgentTool 类型**（来自 `@mariozechner/pi-agent-core`）：

```typescript
interface AgentTool<TParameters extends TSchema = TSchema, TDetails = any> {
  name: string;
  description: string;
  parameters: TParameters;  // TypeBox Schema
  execute: (params: Static<TParameters>, details?: TDetails) => Promise<any>;
}
```

---

### 7. **Prompt 构建策略** 📝

**buildPrompt 结构**（来自 `packages/ctp/src/core/builder.ts`）：

```
# {name}

{description}

---

{collected prompt content}

---

## Available Tools
### toolName
tool description

## Data Views
- Title (format)
  Fields: field1, field2

## Metadata
- key: value
```

**Data Views 的作用**：
- 作为"数据目录/索引"
- 降低模型漏读数据的概率
- 在 prompt 尾部提供结构化摘要

**Metadata 的作用**：
- 承载全局背景信息（版本、作者、环境等）
- 与正文内容解耦
- 避免关键信号被埋在长文本中

---

### 8. **os-v1 系统架构** 🏗️

```
┌─────────────────────────────────────────────────────────┐
│                  os-v1 系统                             │
│                                                         │
│  ┌──────────────┐      ┌──────────────┐                │
│  │   Action     │      │   Page       │                │
│  │ (业务逻辑)    │      │ (UI组件)     │                │
│  └──────────────┘      └──────────────┘                │
│         │                      │                        │
│         │                      ▼                        │
│         │            ┌──────────────────┐               │
│         │            │  CTP Renderer    │               │
│         │            │ (JSX → Context)  │               │
│         │            └──────────────────┘               │
│         │                      │                        │
│         └──────────────────────┼────────────────────┐   │
│                                ▼                    │   │
│                      ┌──────────────────┐           │   │
│                      │ RenderedContext  │           │   │
│                      │ • prompt         │           │   │
│                      │ • tools ─────────┼───────────┼─▶ pi-agent-core
│                      │ • dataViews      │           │   │   (AgentTool[])
│                      └──────────────────┘           │   │
│                                │                    │   │
│                                ▼                    │   │
│                      ┌──────────────────┐           │   │
│                      │ Action Executer  │◀──────────┘   │
│                      │ (执行 Action)    │                │
│                      └──────────────────┘                │
└─────────────────────────────────────────────────────────┘
```

**数据流**：
1. Page 组件使用 CTP JSX 定义 UI
2. CTP Renderer 渲染成 `RenderedContext`
3. `tools` 数组传递给 `pi-agent-core`
4. AI 选择调用某个 tool
5. Action Executer 执行对应的 Action

---

### 9. **Page 与 ComponentFactory** 📄

```typescript
// packages/os-v1/src/tokens.ts
export interface Page<TParameters extends TSchema = TSchema> {
  name: string;
  description: string;
  path: string;
  props: TParameters;  // 参数 Schema
  factory: ComponentFactory<Static<TParameters>>;
}

export interface ComponentFactory<Props> {
  (props: Props, injector: Injector): Promise<JSXElement | string>;
}
```

**Page 类似于 Web 框架中的路由**：
- 每个 Page 代表一个可访问的 AI 交互入口
- 使用泛型约束参数类型，确保类型安全
- factory 函数接收 props 和 injector，返回 JSXElement

---

### 10. **依赖注入系统** 💉

**来自 `@context-ai/core` 的 DI 系统**：

```typescript
import { InjectionToken, Injector, Injectable, type Provider } from '@context-ai/core';

// 定义 Token
export const FILE_SERVICE = new InjectionToken<FileService>("file.service");

// 定义服务
@Injectable()
export class FileService {
  async read(path: string): Promise<string> {
    return await readFile(path, "utf8");
  }
}

// 注册 Provider
const providers: Provider[] = [
  { provide: FILE_SERVICE, useClass: FileService }
];

// 在 Action 中使用
execute: async (params, injector: Injector) => {
  const fileService = injector.get(FILE_SERVICE);
  return await fileService.read(params.path);
}
```

---

## 实际代码示例

### 完整的 Action 定义

```typescript
// packages/os-v1/src/actions/file-read.action.ts
import { Type, type Static } from "@sinclair/typebox";
import type { Action, Token } from "../tokens.js";
import type { Injector } from "@context-ai/core";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

// 1. 定义 Schema
export const FileReadRequestSchema = Type.Object({
  path: Type.String({ description: "The file path to read" }),
});

export type FileReadRequest = Static<typeof FileReadRequestSchema>;

export const FileReadResponseSchema = Type.Object({
  content: Type.String({ description: "The file content in UTF-8 encoding" }),
});

export type FileReadResponse = Static<typeof FileReadResponseSchema>;

// 2. 定义 Token
export const FILE_READ_TOKEN: Token<
  typeof FileReadRequestSchema,
  typeof FileReadResponseSchema
> = "file.read";

export const FILE_READ_PERMISSION: string = "file:read";

// 3. 定义 Action
export const fileReadAction: Action<
  typeof FileReadRequestSchema,
  typeof FileReadResponseSchema
> = {
  type: FILE_READ_TOKEN,
  description: "Read the content of a file",
  request: FileReadRequestSchema,
  response: FileReadResponseSchema,
  requiredPermissions: [FILE_READ_PERMISSION],
  dependencies: [],
  execute: async (params: FileReadRequest, _injector: Injector): Promise<FileReadResponse> => {
    const absolutePath = resolve(params.path);
    const content = await readFile(absolutePath, "utf8");
    return { content };
  },
};
```

### 完整的 Page 组件

```tsx
// packages/os-v1/src/addons/app/list.tsx
import { Type, type Static } from '@sinclair/typebox';
import { Context, Text, Data, Tool, Group } from '@context-ai/ctp';
import type { Injector } from '@context-ai/core';

// 定义参数 Schema
const ListPropsSchema = Type.Object({
  page: Type.Optional(Type.Integer({ minimum: 1, default: 1 })),
});

type ListProps = Static<typeof ListPropsSchema>;

// 导出 Page Factory
export default async function AppListPage(
  props: ListProps,
  injector: Injector
): Promise<JSXElement> {
  const { page = 1 } = props;

  // 获取数据
  const apps = await getApps(page);

  return (
    <Context name="应用列表" description="管理已安装的应用">
      <Group title="概览">
        <Text>共 {apps.total} 个应用，第 {page} 页</Text>
      </Group>

      <Group title="应用列表">
        <Data source={apps.items} format="table" fields={['name', 'version', 'status']} />
      </Group>

      {apps.items.map(app => (
        <Tool
          key={app.id}
          name={`view_app_${app.id}`}
          description={`查看应用 ${app.name}`}
          parameters={Type.Object({})}
          execute={async () => {
            // 导航到应用详情页
            return { nextPage: 'app-detail', params: { id: app.id } };
          }}
        />
      ))}
    </Context>
  );
}
```

---

## 关键差异对照

| 特性 | 文档描述（错误） | 实际实现（正确） |
|------|----------------|----------------|
| Schema 库 | Zod | **TypeBox** (`@sinclair/typebox`) |
| Schema 定义 | `z.object({...})` | **`Type.Object({...})`** |
| 类型推断 | `z.infer<typeof schema>` | **`Static<typeof schema>`** |
| Tool prop | `schema={...}` | **`parameters={...}`** |
| Tool execute | `executor={...}` | **`execute={...}`** |
| Token 类型 | `Token<TRequest, TResponse>` | **`Token<typeof ReqSchema, typeof ResSchema>`** |
| 导入语句 | `import { z } from 'zod'` | **`import { Type, Static } from '@sinclair/typebox'`** |

---

## 设计原则总结

1. **面向接口编程** - Token + Schema 提供类型约束
2. **声明式优于命令式** - JSX 声明上下文结构
3. **类型安全** - TypeBox Schema + TypeScript 泛型
4. **依赖注入** - Injector 解耦服务依赖
5. **单一职责** - Action 专注业务逻辑，Page 专注 UI 结构
6. **可组合性** - 小组件拼装成复杂场景
7. **运行时无关** - 核心代码零依赖（架构层面，虽然实际有依赖）

---

## 核心价值

**CTP 协议的本质**：

> 用声明式 JSX 为 AI Agent 构建类型安全、运行时无关、状态驱动的结构化操作界面

**三层抽象**：
1. **Schema 层** - TypeBox 定义数据结构和验证规则
2. **Protocol 层** - Token + Action 定义能力接口
3. **Presentation 层** - CTP JSX 定义 AI 可理解的上下文

**降低 AI 理解成本**：
- 从"读文档猜意图"到"直接看到结构化工具"
- 从"文本拼接 Prompt"到"组件化声明上下文"
- 从"手动类型检查"到"编译时类型安全"

---

## 参考资料

- 实际代码：`packages/ctp/src/`
- 实际示例：`packages/os-v1/src/actions/`, `packages/os-v1/src/addons/`
- TypeBox 文档：https://github.com/sinclairzx81/typebox
- pi-agent-core：`@mariozechner/pi-agent-core`
