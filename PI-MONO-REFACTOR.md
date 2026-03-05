# pi-mono 跨平台重构方案

将 `@mariozechner/pi-ai` 和 `@mariozechner/pi-agent` 重构为运行时无关的实现。

## 现状分析

### 当前依赖情况

```typescript
// pi-ai 当前实现依赖：
import OpenAI from "openai";                    // ✅ 已支持多运行时 (Node/Deno/Bun/Edge)
import { getEnvApiKey } from "../env-api-keys"; // ⚠️ 使用 process.env (仅 Node.js)

// 其他 providers 情况：
// - openai-responses.ts → openai SDK ✅ 已支持多平台
// - anthropic.ts → anthropic SDK ⚠️ 需要检查
// - google.ts → @google/generative-ai ❌ Node.js only
// - amazon-bedrock.ts → @aws-sdk/client-bedrock-runtime ❌ Node.js only
```

### 关键发现

**OpenAI SDK v4** 已经支持多运行时：
- Node.js 18+
- Deno (通过 `npm:openai`)
- Bun (原生支持 npm 包)
- Edge Runtime (Next.js, Cloudflare Workers)

### 重构目标

1. **保留 OpenAI SDK** - 它已经跨平台
2. **修复环境变量** - 支持多平台的 env 获取
3. **其他 providers** - 使用 fetch 或寻找跨平台方案
4. **零 Node.js 特定依赖**

## 重构架构（务实方案）

```
┌─────────────────────────────────────────────────────────────────┐
│                    Refactored pi-ai                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │              Provider Implementations                     │  │
│  │                                                          │  │
│  │  ┌────────────┐ ┌────────────┐ ┌────────────┐           │  │
│  │  │  OpenAI    │ │ Anthropic  │ │   Google   │           │  │
│  │  │ (SDK v4)   │ │  (fetch)   │ │  (fetch)   │           │  │
│  │  │ ✅ 多平台  │ │            │ │            │           │  │
│  │  └────────────┘ └────────────┘ └────────────┘           │  │
│  │                                                          │  │
│  │  ┌────────────┐ ┌────────────┐ ┌────────────┐           │  │
│  │  │  Azure     │ │  Bedrock   │ │   Ollama   │           │  │
│  │  │ (SDK v4)   │ │  (fetch)   │ │  (fetch)   │           │  │
│  │  └────────────┘ └────────────┘ └────────────┘           │  │
│  │                                                          │  │
│  └──────────────────────────────────────────────────────────┘  │
│                              │                                  │
│                              ▼                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │            Platform Abstraction Layer (新增)              │  │
│  │                                                          │  │
│  │  - Env vars: getEnv(key)  ✅ 跨平台                     │  │
│  │  - Fetch: global fetch()  ✅ 所有平台                   │  │
│  │                                                          │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## 核心重构内容

### 1. pi-ai 最小重构（保留 SDK）

#### 1.1 OpenAI Provider - 保留 SDK，仅修复 env

**原代码问题:**
```typescript
import { getEnvApiKey } from "../env-api-keys.js";

const apiKey = options?.apiKey || getEnvApiKey(model.provider) || "";
// getEnvApiKey 内部使用 process.env，在 Deno/Bun 中不可用
```

**修复后:**
```typescript
import { getEnvApiKey } from "../platform/env.js";

const apiKey = options?.apiKey || await getEnvApiKey(model.provider) || "";
// getEnvApiKey 现在支持多平台
```

OpenAI SDK 本身已经跨平台，**不需要重写**！

#### 1.2 Google Provider - 改为 fetch

Google 的 SDK 是 Node.js only，需要改为 fetch：

```typescript
// providers/google.ts
import { getEnvApiKey } from "../platform/env.js";

export function streamGoogle(
  model: Model<"google-generative-ai">,
  context: Context,
  options?: StreamOptions
): AssistantMessageEventStream {
  const stream = new AssistantMessageEventStream();

  (async () => {
    const apiKey = options?.apiKey || await getEnvApiKey("google") || "";
    const baseUrl = model.baseUrl || "https://generativelanguage.googleapis.com/v1beta";

    const response = await fetch(
      `${baseUrl}/models/${model.id}:streamGenerateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: convertMessages(context.messages),
          tools: context.tools?.map(convertTool),
        }),
        signal: options?.signal,
      }
    );

    // 处理流式响应...
  })();

  return stream;
}
```

#### 1.2 跨平台环境变量

**原代码:**
```typescript
// env-api-keys.ts
export function getEnvApiKey(provider: string): string | undefined {
  return process.env[`${provider.toUpperCase()}_API_KEY`];
}
```

**重构后:**
```typescript
// platform/env.ts
export async function getEnv(key: string): Promise<string | undefined> {
  // Node.js
  if (typeof process !== 'undefined' && process.env) {
    return process.env[key];
  }

  // Deno
  if (typeof Deno !== 'undefined') {
    return Deno.env.get(key);
  }

  // Bun
  if (typeof Bun !== 'undefined') {
    return Bun.env[key];
  }

  // Browser / Other
  return undefined;
}

export async function getEnvApiKey(provider: string): Promise<string | undefined> {
  return getEnv(`${provider.toUpperCase()}_API_KEY`);
}
```

#### 1.3 SSE 流处理（跨平台）

```typescript
// utils/sse.ts
export async function* readSSE(
  reader: ReadableStreamDefaultReader<Uint8Array>
): AsyncIterable<string> {
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        yield line.slice(6);
      }
    }
  }
}
```

### 2. Provider 重构示例

#### OpenAI Responses API

```typescript
// providers/openai-responses.ts
import type {
  Model, Context, StreamOptions,
  AssistantMessage, AssistantMessageEvent
} from "../types.js";
import { AssistantMessageEventStream } from "../utils/event-stream.js";
import { getEnvApiKey } from "../platform/env.js";
import { readSSE } from "../utils/sse.js";

export interface OpenAIResponsesOptions extends StreamOptions {
  reasoningEffort?: "minimal" | "low" | "medium" | "high" | "xhigh";
  reasoningSummary?: "auto" | "detailed" | "concise" | null;
}

export function streamOpenAIResponses(
  model: Model<"openai-responses">,
  context: Context,
  options?: OpenAIResponsesOptions
): AssistantMessageEventStream {
  const stream = new AssistantMessageEventStream();

  executeStream(model, context, options, stream).catch(err => {
    stream.push({
      type: "error",
      reason: "error",
      error: err instanceof Error ? err : new Error(String(err))
    });
  });

  return stream;
}

async function executeStream(
  model: Model,
  context: Context,
  options: OpenAIResponsesOptions | undefined,
  stream: AssistantMessageEventStream
): Promise<void> {
  const apiKey = options?.apiKey || await getEnvApiKey(model.provider) || "";
  const baseUrl = model.baseUrl || "https://api.openai.com/v1";

  const response = await fetch(`${baseUrl}/responses`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'Accept': 'text/event-stream',
    },
    body: JSON.stringify({
      model: model.id,
      input: convertMessages(context.messages),
      tools: context.tools?.map(convertTool),
      temperature: options?.temperature,
      max_output_tokens: options?.maxTokens,
      reasoning: options?.reasoningEffort ? {
        effort: options.reasoningEffort,
        summary: options.reasoningSummary,
      } : undefined,
      stream: true,
    }),
    signal: options?.signal,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI API ${response.status}: ${error}`);
  }

  const reader = response.body?.getReader();
  if (!reader) throw new Error("No response body");

  const message: AssistantMessage = {
    role: "assistant",
    content: [],
    api: "openai-responses",
    provider: model.provider,
    model: model.id,
    usage: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, totalTokens: 0,
             cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 } },
    stopReason: "stop",
    timestamp: Date.now(),
  };

  stream.push({ type: "start", partial: message });

  for await (const line of readSSE(reader)) {
    if (line === '[DONE]') continue;

    const event = JSON.parse(line);

    // 处理不同类型的输出
    if (event.type === 'response.output_text.delta') {
      stream.push({
        type: "text_delta",
        contentIndex: 0,
        delta: event.delta,
        partial: message,
      });
      // Update message content...
    }

    if (event.type === 'response.completed') {
      // Finalize message...
      stream.push({
        type: "done",
        reason: "stop",
        message,
      });
    }
  }
}

function convertMessages(messages: Context["messages"]): any[] {
  // 转换消息格式...
  return messages.map(m => ({
    role: m.role === 'user' ? 'user' : 'assistant',
    content: typeof m.content === 'string' ? m.content :
      m.content.map(c => c.type === 'text' ? c.text : '').join(''),
  }));
}

function convertTool(tool: any): any {
  return {
    type: 'function',
    name: tool.name,
    description: tool.description,
    parameters: tool.parameters,
  };
}
```

#### Anthropic Messages API

```typescript
// providers/anthropic.ts
import type { Model, Context, StreamOptions } from "../types.js";
import { AssistantMessageEventStream } from "../utils/event-stream.js";
import { getEnvApiKey } from "../platform/env.js";
import { readSSE } from "../utils/sse.js";

export function streamAnthropic(
  model: Model<"anthropic-messages">,
  context: Context,
  options?: StreamOptions
): AssistantMessageEventStream {
  const stream = new AssistantMessageEventStream();

  (async () => {
    const apiKey = options?.apiKey || await getEnvApiKey("anthropic") || "";
    const baseUrl = model.baseUrl || "https://api.anthropic.com/v1";

    const response = await fetch(`${baseUrl}/messages`, {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: model.id,
        messages: convertMessages(context.messages),
        tools: context.tools?.map(t => ({
          name: t.name,
          description: t.description,
          input_schema: t.parameters,
        })),
        max_tokens: options?.maxTokens || 4096,
        temperature: options?.temperature,
        stream: true,
      }),
      signal: options?.signal,
    });

    // 处理 SSE 响应...
    const reader = response.body?.getReader();
    if (reader) {
      for await (const line of readSSE(reader)) {
        const event = JSON.parse(line);
        // 处理 Anthropic 特定的事件格式...
      }
    }
  })();

  return stream;
}
```

#### Google Gemini API

```typescript
// providers/google.ts
export function streamGoogle(
  model: Model<"google-generative-ai">,
  context: Context,
  options?: StreamOptions
): AssistantMessageEventStream {
  const stream = new AssistantMessageEventStream();

  (async () => {
    const apiKey = options?.apiKey || await getEnvApiKey("google") || "";
    const baseUrl = model.baseUrl || "https://generativelanguage.googleapis.com/v1beta";

    const response = await fetch(
      `${baseUrl}/models/${model.id}:streamGenerateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: convertMessages(context.messages),
          tools: context.tools?.map(t => ({
            functionDeclarations: [{
              name: t.name,
              description: t.description,
              parameters: t.parameters,
            }],
          })),
          generationConfig: {
            temperature: options?.temperature,
            maxOutputTokens: options?.maxTokens,
          },
        }),
        signal: options?.signal,
      }
    );

    // Google 使用 JSON streaming 而非 SSE...
  })();

  return stream;
}
```

#### Ollama (本地模型)

```typescript
// providers/ollama.ts
export function streamOllama(
  model: Model,
  context: Context,
  options?: StreamOptions
): AssistantMessageEventStream {
  const stream = new AssistantMessageEventStream();

  (async () => {
    const baseUrl = model.baseUrl || "http://localhost:11434";

    const response = await fetch(`${baseUrl}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: model.id,
        messages: context.messages.map(m => ({
          role: m.role,
          content: typeof m.content === 'string'
            ? m.content
            : m.content.map(c => c.type === 'text' ? c.text : '').join(''),
        })),
        tools: context.tools,
        stream: true,
        options: {
          temperature: options?.temperature,
          num_predict: options?.maxTokens,
        },
      }),
      signal: options?.signal,
    });

    // Ollama 使用 NDJSON (Newline Delimited JSON)
    const reader = response.body?.getReader();
    if (reader) {
      for await (const line of readLines(reader)) {
        const event = JSON.parse(line);
        // 处理 Ollama 响应...
      }
    }
  })();

  return stream;
}

async function* readLines(
  reader: ReadableStreamDefaultReader<Uint8Array>
): AsyncIterable<string> {
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      if (line.trim()) yield line;
    }
  }
}
```

### 3. pi-agent 重构

pi-agent-core 相对干净，主要需要：
1. 移除对 pi-ai 的固定依赖（改为接口注入）
2. 确保不使用 Node.js 特定的 API

```typescript
// agent/src/types.ts (重构后)
import type {
  AssistantMessageEvent,
  ImageContent,
  Message,
  Model,
  SimpleStreamOptions,
  TextContent,
  Tool,
  ToolResultMessage,
} from "pi-ai"; // 使用重构后的 pi-ai

// ... 其余类型定义保持不变
```

```typescript
// agent/src/agent.ts (重构后)
import {
  getModel,
  type ImageContent,
  type Message,
  type Model,
  streamSimple,
  type TextContent,
  type ThinkingBudgets,
  type Transport,
} from "pi-ai"; // 使用重构后的 pi-ai

// ... Agent 类实现保持不变
```

### 4. Provider 支持策略

| Provider | 当前实现 | 跨平台方案 | 工作量 |
|----------|----------|-----------|--------|
| OpenAI | SDK v4 | ✅ 保留 SDK，仅修复 env | 最小 |
| Azure OpenAI | SDK v4 | ✅ 保留 SDK，仅修复 env | 最小 |
| Anthropic | SDK | ⚠️ 检查 SDK 或改用 fetch | 小 |
| Google | Node SDK | ❌ 改为 fetch | 中 |
| AWS Bedrock | AWS SDK | ❌ 改为 fetch + sigv4 | 中 |
| Ollama | fetch | ✅ 已经是 fetch | 无 |
| GitHub Copilot | fetch | ✅ 已经是 fetch | 无 |

### 5. 统一的 streamSimple 入口

```typescript
// pi-ai/src/stream.ts
import type { Model, Context, SimpleStreamOptions } from "./types.js";
import { streamOpenAIResponses } from "./providers/openai-responses.js";
import { streamOpenAICompletions } from "./providers/openai-completions.js";
import { streamAnthropic } from "./providers/anthropic.js";
import { streamGoogle } from "./providers/google.js";
import { streamOllama } from "./providers/ollama.js";

export function streamSimple(
  model: Model<any>,
  context: Context,
  options?: SimpleStreamOptions
): AssistantMessageEventStream {
  switch (model.api) {
    case "openai-responses":
      return streamOpenAIResponses(model, context, options);
    case "openai-completions":
      return streamOpenAICompletions(model, context, options);
    case "anthropic-messages":
      return streamAnthropic(model, context, options);
    case "google-generative-ai":
      return streamGoogle(model, context, options);
    // ... 其他 providers
    default:
      throw new Error(`Unknown API: ${model.api}`);
  }
}
```

## 项目结构（重构后）

```
pi-mono/
├── packages/
│   ├── ai/                              # 重构后的 pi-ai
│   │   ├── src/
│   │   │   ├── index.ts                 # 导出公共 API
│   │   │   ├── types.ts                 # 类型定义
│   │   │   ├── stream.ts                # streamSimple
│   │   │   ├── models.ts                # 模型注册
│   │   │   ├── platform/                # 平台抽象层 (新增)
│   │   │   │   ├── env.ts               # 环境变量
│   │   │   │   └── fetch.ts             # fetch 封装（如需要）
│   │   │   ├── providers/               # Provider 实现（全部重写）
│   │   │   │   ├── openai-responses.ts  # OpenAI Responses API (fetch)
│   │   │   │   ├── openai-completions.ts
│   │   │   │   ├── anthropic.ts         # Anthropic Messages API (fetch)
│   │   │   │   ├── google.ts            # Google Gemini API (fetch)
│   │   │   │   ├── azure-openai.ts      # Azure OpenAI (fetch)
│   │   │   │   ├── amazon-bedrock.ts    # AWS Bedrock (fetch + sigv4)
│   │   │   │   └── ollama.ts            # Ollama (fetch)
│   │   │   ├── utils/
│   │   │   │   ├── event-stream.ts      # EventStream 类（保持不变）
│   │   │   │   ├── sse.ts               # SSE 解析（新增）
│   │   │   │   └── validation.ts        # 验证工具
│   │   │   └── api-registry.ts          # API 注册
│   │   ├── package.json                 # 移除 SDK 依赖
│   │   └── tsconfig.json
│   │
│   └── agent/                           # 重构后的 pi-agent-core
│       ├── src/
│       │   ├── index.ts
│       │   ├── types.ts
│       │   ├── agent.ts
│       │   ├── agent-loop.ts
│       │   └── proxy.ts
│       ├── package.json                 # 依赖重构后的 pi-ai
│       └── tsconfig.json
```

## package.json 变更

### pi-ai (重构后)

```json
{
  "name": "@mariozechner/pi-ai",
  "version": "1.0.0",
  "type": "module",
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "types": "./dist/index.d.ts"
    }
  },
  "dependencies": {
    "openai": "^4.0.0",
    "@sinclair/typebox": "^0.31.0"
  },
  "peerDependencies": {},
  "devDependencies": {
    "typescript": "^5.0.0"
  }
}
```

**保留的依赖 (已支持多平台):**
- ✅ `openai` - SDK v4 支持 Node/Deno/Bun/Edge

**可能移除的依赖:**
- ⚠️ `@google/generative-ai` - Node.js only，改为 fetch
- ⚠️ `@aws-sdk/client-bedrock-runtime` - Node.js only，改为 fetch
- ⚠️ `@anthropic-ai/sdk` - 需要检查是否支持多平台

### pi-agent (重构后)

```json
{
  "name": "@mariozechner/pi-agent",
  "version": "1.0.0",
  "type": "module",
  "dependencies": {
    "@mariozechner/pi-ai": "workspace:*",
    "@sinclair/typebox": "^0.31.0"
  }
}
```

## 使用示例（重构后）

### Node.js

```typescript
import { streamSimple, getModel } from '@mariozechner/pi-ai';
import { Agent } from '@mariozechner/pi-agent';

const agent = new Agent({
  model: getModel("openai", "gpt-4o"),
  apiKey: process.env.OPENAI_API_KEY,
});

await agent.run("Hello!");
```

### Deno

```typescript
// 通过 npm: 前缀使用
import { streamSimple, getModel } from 'npm:@mariozechner/pi-ai';

const stream = streamSimple(
  getModel("openai", "gpt-4o"),
  { messages: [{ role: "user", content: "Hello", timestamp: Date.now() }] },
  { apiKey: Deno.env.get("OPENAI_API_KEY") }
);

for await (const event of stream) {
  console.log(event);
}
```

### Bun

```typescript
import { streamSimple, getModel } from '@mariozechner/pi-ai';

const stream = streamSimple(
  getModel("openai", "gpt-4o"),
  context,
  { apiKey: Bun.env.OPENAI_API_KEY }
);
```

### Browser / Edge Runtime

```typescript
import { streamSimple, getModel } from '@mariozechner/pi-ai';

// OpenAI SDK v4 支持 Edge Runtime
const stream = streamSimple(
  getModel("openai", "gpt-4o"),
  context,
  {
    apiKey: localStorage.getItem('api_key'),
    // 注意：浏览器直接调用 OpenAI API 会有 CORS 问题
    // 通常需要通过代理服务器或 Edge Function
  }
);
```

## CTP CLI 使用重构后的 pi-mono

```typescript
// CTP CLI 示例
import { streamSimple, getModel } from '@mariozechner/pi-ai';
import { Agent } from '@mariozechner/pi-agent';
import { render } from '@mariozechner/pi-tui';

class CTPAgent {
  async run(context: JSX.Element) {
    // 1. 渲染 CTP 上下文
    const rendered = await this.renderContext(context);

    // 2. 使用重构后的 pi-ai
    const stream = streamSimple(
      getModel("openai", "gpt-4o"),
      {
        systemPrompt: rendered.prompt,
        messages: [],
        tools: rendered.tools,
      }
    );

    // 3. 处理响应
    for await (const event of stream) {
      // 使用 pi-tui 渲染
      console.log(render(event));
    }
  }
}
```

## 实施步骤（最小可行方案）

1. **创建平台抽象层** (`platform/env.ts`) - 约 1 小时
2. **更新 OpenAI/Azure  providers** - 仅需替换 env 导入 - 约 30 分钟
3. **将 Google provider 改为 fetch** - 约 2-4 小时
4. **将 AWS Bedrock provider 改为 fetch + sigv4** - 约 2-4 小时
5. **测试各平台兼容性** - 约 4-8 小时
6. **发布新版本** - 约 1 小时

**总工作量：约 2-3 天（对于经验丰富的开发者）**

## 好处

1. **跨平台** - 支持 Node.js、Deno、Bun、Edge Runtime
2. **保留 OpenAI SDK** - 享受官方 SDK 的稳定性
3. **轻量** - 移除 Google/AWS 等重型 SDK 依赖
4. **统一** - 所有 providers 遵循相同的接口和错误处理
