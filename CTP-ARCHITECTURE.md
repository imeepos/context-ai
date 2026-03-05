# CTP-Lite 架构设计

> **运行时无关的上下文协议 - Run Anywhere**

## 设计目标

1. **运行时无关** - 支持 Node.js、Deno、Bun、Browser 等任何 JavaScript 环境
2. **零依赖或可选依赖** - 核心不依赖特定平台的 API
3. **插件化架构** - 平台特定功能通过适配器注入
4. **JSX 驱动** - 声明式定义上下文，动态生成 prompt 和 tools

## 架构概览

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         Universal CTP Runtime                               │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    CTP Core (Platform Agnostic)                      │   │
│  │                                                                        │   │
│  │  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐              │   │
│  │  │  JSX Parser │───▶│  Renderer   │───▶│  Extractor  │              │   │
│  │  │             │    │             │    │             │              │   │
│  │  └─────────────┘    └─────────────┘    └─────────────┘              │   │
│  │         │                   │                  │                     │   │
│  │         ▼                   ▼                  ▼                     │   │
│  │  ┌─────────────────────────────────────────────────────────────┐    │   │
│  │  │              RenderedContext                                 │    │   │
│  │  │  - prompt: string                                           │    │   │
│  │  │  - tools: Tool[]                                            │    │   │
│  │  │  - dataViews: DataView[]                                    │    │   │
│  │  │  - state: State                                             │    │   │
│  │  └─────────────────────────────────────────────────────────────┘    │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                              │                                              │
│                              │ 抽象接口                                     │
│                              ▼                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │              Platform Adapters (可替换)                              │   │
│  │                                                                      │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐              │   │
│  │  │ LLM Adapter  │  │ Storage      │  │ UI Adapter   │              │   │
│  │  │              │  │ Adapter      │  │              │              │   │
│  │  │ • OpenAI     │  │ • Memory     │  │ • Terminal   │              │   │
│  │  │ • Anthropic  │  │ • File       │  │ • Web        │              │   │
│  │  │ • Ollama     │  │ • LocalStorage│ • None        │              │   │
│  │  └──────────────┘  └──────────────┘  └──────────────┘              │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                              │                                              │
└──────────────────────────────┼──────────────────────────────────────────────┘
                               │
          ┌────────────────────┼────────────────────┐
          │                    │                    │
          ▼                    ▼                    ▼
┌─────────────────┐   ┌─────────────────┐   ┌─────────────────┐
│   Node.js       │   │     Deno        │   │      Bun        │
│                 │   │                 │   │                 │
│ • fs/promises   │   │ • Deno.readFile │   │ • Bun.file      │
│ • process.env   │   │ • Deno.env      │   │ • Bun.env       │
│ • readline      │   │ • console       │   │ • console       │
└─────────────────┘   └─────────────────┘   └─────────────────┘
                               │
                               ▼
                    ┌─────────────────┐
                    │    Browser      │
                    │                 │
                    │ • fetch         │
                    │ • localStorage  │
                    │ • Web APIs      │
                    └─────────────────┘
```

## 核心设计原则

### 1. 依赖注入而非硬编码

```typescript
// 不这样写
import { AI } from '@mariozechner/pi-ai'; // Node.js only

// 这样写 - 通过适配器注入
interface LLMAdapter {
  chat(request: ChatRequest): Promise<ChatResponse>;
  stream?(request: ChatRequest): AsyncIterable<ChatChunk>;
}

// 用户选择使用哪个适配器
const llm: LLMAdapter = createOpenAIAdapter({ apiKey: 'xxx' });
// 或
const llm: LLMAdapter = createOllamaAdapter({ baseUrl: 'http://localhost:11434' });
```

### 2. 平台无关的存储接口

```typescript
interface StorageAdapter {
  get<T>(key: string): Promise<T | undefined>;
  set<T>(key: string, value: T): Promise<void>;
  delete(key: string): Promise<void>;
}

// 不同平台实现
const storage: StorageAdapter =
  typeof Deno !== 'undefined' ? createDenoStorage() :
  typeof Bun !== 'undefined' ? createBunStorage() :
  typeof window !== 'undefined' ? createBrowserStorage() :
  createNodeStorage();
```

### 3. 纯函数核心

```typescript
// ctp/core/renderer.ts - 纯函数，不依赖任何平台 API
export function renderJSX(node: JSX.Element): RenderedContext {
  // 纯逻辑，无 I/O
}

// ctp/core/builder.ts - 纯函数
export function buildPrompt(context: RenderedContext): string {
  // 纯字符串操作
}
```

## 核心模块

### 1. CTP Core (运行时无关)

```typescript
// ctp/core/types.ts
export interface RenderedContext {
  name: string;
  description: string;
  prompt: string;
  tools: ToolDefinition[];
  dataViews: DataView[];
}

export interface ToolDefinition<P = any, R = any> {
  name: string;
  description: string;
  parameters: JSONSchema;
  execute: (params: P) => Promise<R>;
}

// ctp/core/renderer.ts
export async function render(
  component: JSX.Element | (() => JSX.Element | Promise<JSX.Element>)
): Promise<RenderedContext> {
  const ctx: RenderedContext = {
    name: '',
    description: '',
    prompt: '',
    tools: [],
    dataViews: [],
  };

  // 执行组件
  const element = typeof component === 'function'
    ? await component()
    : component;

  // 遍历 JSX 树
  await walkJSX(element, ctx);

  // 构建最终 prompt
  ctx.prompt = buildPrompt(ctx);

  return ctx;
}

async function walkJSX(node: any, ctx: RenderedContext): Promise<void> {
  if (!node || typeof node !== 'object') return;

  // 执行函数组件
  if (typeof node.type === 'function') {
    const result = await node.type(node.props);
    return walkJSX(result, ctx);
  }

  switch (node.type) {
    case 'Context':
      ctx.name = node.props.name;
      ctx.description = node.props.description || '';
      await walkChildren(node.props.children, ctx);
      break;

    case 'Text':
      ctx.prompt += node.props.children + '\n';
      break;

    case 'Data':
      ctx.dataViews.push(node.props);
      ctx.prompt += formatData(node.props) + '\n';
      break;

    case 'Tool':
      ctx.tools.push({
        name: node.props.name,
        description: node.props.description,
        parameters: node.props.params || { type: 'object', properties: {} },
        execute: node.props.executor,
      });
      break;

    case 'Group':
      if (node.props.title) {
        ctx.prompt += `\n## ${node.props.title}\n`;
      }
      await walkChildren(node.props.children, ctx);
      break;
  }
}
```

### 2. 适配器系统

```typescript
// ctp/adapters/llm/openai.ts
import type { LLMAdapter, ChatRequest, ChatResponse } from '../types.js';

export interface OpenAIConfig {
  apiKey: string;
  baseUrl?: string;
  model: string;
}

export function createOpenAIAdapter(config: OpenAIConfig): LLMAdapter {
  const baseUrl = config.baseUrl || 'https://api.openai.com/v1';

  return {
    async chat(request: ChatRequest): Promise<ChatResponse> {
      // 使用原生 fetch，不依赖 Node.js 特定库
      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${config.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: config.model,
          messages: [
            { role: 'system', content: request.system },
            ...request.messages,
          ],
          tools: request.tools?.map(t => ({
            type: 'function',
            function: {
              name: t.name,
              description: t.description,
              parameters: t.parameters,
            },
          })),
        }),
      });

      if (!response.ok) {
        throw new Error(`LLM API error: ${response.status}`);
      }

      const data = await response.json();
      return {
        content: data.choices[0]?.message?.content,
        toolCalls: data.choices[0]?.message?.tool_calls?.map((tc: any) => ({
          id: tc.id,
          name: tc.function.name,
          arguments: JSON.parse(tc.function.arguments),
        })),
      };
    },

    async *stream(request: ChatRequest): AsyncIterable<ChatChunk> {
      // SSE 流式实现
      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${config.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...request,
          stream: true,
        }),
      });

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response body');

      // 解析 SSE 流
      // ...
    },
  };
}
```

### 3. 平台检测与自动适配

```typescript
// ctp/platform/detect.ts

/** 检测当前运行时环境 */
export function detectRuntime(): Runtime {
  if (typeof Deno !== 'undefined') return 'deno';
  if (typeof Bun !== 'undefined') return 'bun';
  if (typeof window !== 'undefined') return 'browser';
  if (typeof process !== 'undefined' && process.versions?.node) return 'node';
  return 'unknown';
}

export type Runtime = 'deno' | 'bun' | 'browser' | 'node' | 'unknown';

// ctp/platform/auto.ts
import { detectRuntime } from './detect.js';

export async function createDefaultAdapters() {
  const runtime = detectRuntime();

  switch (runtime) {
    case 'deno':
      const { createDenoStorage } = await import('./deno/storage.js');
      const { createDenoEnv } = await import('./deno/env.js');
      return {
        storage: createDenoStorage(),
        env: createDenoEnv(),
      };

    case 'bun':
      const { createBunStorage } = await import('./bun/storage.js');
      const { createBunEnv } = await import('./bun/env.js');
      return {
        storage: createBunStorage(),
        env: createBunEnv(),
      };

    case 'browser':
      const { createBrowserStorage } = await import('./browser/storage.js');
      return {
        storage: createBrowserStorage(),
        env: createBrowserEnv(),
      };

    case 'node':
    default:
      const { createNodeStorage } = await import('./node/storage.js');
      const { createNodeEnv } = await import('./node/env.js');
      return {
        storage: createNodeStorage(),
        env: createNodeEnv(),
      };
  }
}
```

### 4. 配置系统 (多格式支持)

```typescript
// ctp/config/loader.ts

export interface CTPConfig {
  llm: LLMConfig;
  contexts: ContextConfig;
  storage?: StorageConfig;
  entry: string;
}

export type ConfigFormat = 'js' | 'ts' | 'json' | 'yaml' | 'toml';

export async function loadConfig(
  path: string,
  format?: ConfigFormat
): Promise<CTPConfig> {
  const detectedFormat = format || detectFormat(path);

  switch (detectedFormat) {
    case 'json':
      return loadJSONConfig(path);
    case 'yaml':
    case 'yml':
      return loadYAMLConfig(path);
    case 'toml':
      return loadTOMLConfig(path);
    case 'js':
    case 'ts':
    default:
      return loadJSConfig(path);
  }
}

// 不同平台使用不同的加载方式
async function loadJSONConfig(path: string): Promise<CTPConfig> {
  const runtime = detectRuntime();

  if (runtime === 'deno') {
    const text = await Deno.readTextFile(path);
    return JSON.parse(text);
  }

  if (runtime === 'bun') {
    const file = Bun.file(path);
    return await file.json();
  }

  if (runtime === 'node') {
    const fs = await import('node:fs/promises');
    const text = await fs.readFile(path, 'utf-8');
    return JSON.parse(text);
  }

  // Browser - fetch
  const response = await fetch(path);
  return await response.json();
}

async function loadJSConfig(path: string): Promise<CTPConfig> {
  // 动态导入，所有平台都支持
  const module = await import(path);
  return module.default || module;
}
```

## 完整使用示例

### Deno

```typescript
// main.ts
import { CTPAgent, createOpenAIAdapter } from 'https://deno.land/x/ctp/mod.ts';
import OrderList from './contexts/OrderList.tsx';

const agent = new CTPAgent({
  llm: createOpenAIAdapter({
    apiKey: Deno.env.get('OPENAI_API_KEY')!,
    model: 'gpt-4',
  }),
  contexts: {
    OrderList: () => import('./contexts/OrderList.tsx'),
  },
  entry: 'OrderList',
});

await agent.run();
```

```bash
deno run --allow-env --allow-net main.ts
```

### Bun

```typescript
// main.ts
import { CTPAgent, createOpenAIAdapter } from 'ctp-lite';

const agent = new CTPAgent({
  llm: createOpenAIAdapter({
    apiKey: Bun.env.OPENAI_API_KEY!,
    model: 'gpt-4',
  }),
  contexts: {
    OrderList: () => import('./contexts/OrderList.tsx'),
  },
  entry: 'OrderList',
});

await agent.run();
```

```bash
bun run main.ts
```

### Node.js

```typescript
// main.ts
import { CTPAgent, createOpenAIAdapter } from 'ctp-lite';

const agent = new CTPAgent({
  llm: createOpenAIAdapter({
    apiKey: process.env.OPENAI_API_KEY!,
    model: 'gpt-4',
  }),
  contexts: {
    OrderList: () => import('./contexts/OrderList.tsx'),
  },
  entry: 'OrderList',
});

await agent.run();
```

```bash
npx tsx main.ts
```

### Browser

```typescript
// app.ts
import { CTPAgent, createOpenAIAdapter, createBrowserStorage } from 'ctp-lite/browser';

const agent = new CTPAgent({
  llm: createOpenAIAdapter({
    apiKey: localStorage.getItem('openai_key')!,
    model: 'gpt-4',
  }),
  storage: createBrowserStorage(),
  contexts: {
    Chat: () => import('./contexts/Chat.tsx'),
  },
  entry: 'Chat',
});

// 在 Web Worker 或主线程中运行
agent.run();
```

## 项目结构

```
ctp-lite/
├── src/
│   ├── core/                    # 运行时无关核心
│   │   ├── types.ts             # 类型定义
│   │   ├── renderer.ts          # JSX 渲染
│   │   ├── builder.ts           # Prompt 构建
│   │   └── agent.ts             # Agent 逻辑
│   │
│   ├── adapters/                # 可替换适配器
│   │   ├── llm/
│   │   │   ├── types.ts
│   │   │   ├── openai.ts
│   │   │   ├── anthropic.ts
│   │   │   └── ollama.ts
│   │   ├── storage/
│   │   │   ├── types.ts
│   │   │   ├── memory.ts
│   │   │   └── (platform specific)
│   │   └── ui/
│   │       ├── types.ts
│   │       ├── terminal.ts
│   │       └── none.ts
│   │
│   ├── platform/                # 平台特定代码
│   │   ├── detect.ts            # 运行时检测
│   │   ├── auto.ts              # 自动适配
│   │   ├── deno/
│   │   │   ├── storage.ts
│   │   │   └── env.ts
│   │   ├── bun/
│   │   │   ├── storage.ts
│   │   │   └── env.ts
│   │   ├── node/
│   │   │   ├── storage.ts
│   │   │   └── env.ts
│   │   └── browser/
│   │       ├── storage.ts
│   │       └── env.ts
│   │
│   ├── config/                  # 配置系统
│   │   ├── loader.ts
│   │   └── validators.ts
│   │
│   └── components.tsx           # JSX 组件
│
├── contexts/                    # 示例上下文
│   └── OrderList.tsx
│
├── mod.ts                       # Deno 入口
├── index.ts                     # Node/Bun 入口
├── browser.ts                   # Browser 入口
└── package.json
```

## 平台支持矩阵

| 功能 | Node.js | Deno | Bun | Browser |
|------|---------|------|-----|---------|
| JSX 渲染 | ✅ | ✅ | ✅ | ✅ |
| OpenAI | ✅ | ✅ | ✅ | ⚠️ CORS |
| Anthropic | ✅ | ✅ | ✅ | ⚠️ CORS |
| Ollama (本地) | ✅ | ✅ | ✅ | ✅ |
| 文件存储 | ✅ | ✅ | ✅ | ❌ |
| 内存存储 | ✅ | ✅ | ✅ | ✅ |
| localStorage | ❌ | ❌ | ❌ | ✅ |
| Terminal UI | ✅ | ✅ | ✅ | ❌ |
| Web UI | ❌ | ❌ | ❌ | ✅ |

## 依赖策略

### 零依赖核心

```typescript
// src/core/ 目录下零外部依赖
// 只使用 JavaScript 标准库
```

### 可选适配器依赖

```json
{
  "dependencies": {},
  "optionalDependencies": {
    "yaml": "^2.3.0",
    "toml": "^3.0.0"
  },
  "peerDependencies": {
    "@sinclair/typebox": "^0.31.0"
  },
  "peerDependenciesMeta": {
    "@sinclair/typebox": {
      "optional": true
    }
  }
}
```

### 条件导出

```json
{
  "exports": {
    ".": {
      "deno": "./mod.ts",
      "bun": "./index.ts",
      "node": {
        "import": "./dist/index.mjs",
        "require": "./dist/index.cjs"
      },
      "browser": "./dist/browser.mjs"
    },
    "./adapters/*": {
      "deno": "./src/adapters/*.ts",
      "node": "./dist/adapters/*.js"
    }
  }
}
```

## 示例：跨平台 Context

```typescript
// contexts/OrderList.tsx
// 这个文件可以在任何平台运行
import { Context, Text, Data, Tool, Group } from 'ctp-lite';

export default async function OrderListContext() {
  // 平台无关的数据获取 - 使用标准 fetch
  const orders = await fetch('/api/orders')
    .then(r => r.json())
    .catch(() => [
      { id: '001', customer: '张三', status: 'pending' },
      { id: '002', customer: '李四', status: 'completed' },
    ]);

  return (
    <Context name="订单列表" description="管理订单">
      <Group title="数据">
        <Data source={orders} format="table" fields={['id', 'customer', 'status']} />
      </Group>

      {orders.map(order => (
        <Tool
          key={order.id}
          name={`view_${order.id}`}
          description={`查看订单 ${order.id}`}
          executor={async () => {
            // 导航到详情页
            return import('./OrderDetail.tsx')
              .then(m => m.default({ orderId: order.id }));
          }}
        />
      ))}
    </Context>
  );
}
```

## 构建输出

```bash
# 构建所有平台版本
npm run build:all

# 输出
dist/
├── index.mjs          # ESM for Node.js
├── index.cjs          # CJS for Node.js
├── index.d.ts         # TypeScript 声明
├── browser.mjs        # Browser 版本
├── browser.min.mjs    # Browser 压缩版
├── deno/              # Deno 版本 (直接引用源码)
└── bun/               # Bun 版本 (直接引用源码)
```

这个设计让 CTP 真正实现了 **"Run Anywhere"**，不绑定任何特定运行时。
