# @context-ai/ctp

> **Context Protocol** - 编写给 AI 用的应用程序

## 核心理念

传统应用程序为人设计界面（UI/UX），CTP 为 AI Agent 设计界面。用声明式 JSX 语法构建 AI 可理解的结构化上下文。

### 为什么需要 CTP？

```
┌─────────────────────────────────────────────────────────┐
│                    传统应用程序                          │
│  用户 → 界面(UI) → 业务逻辑 → 数据                      │
│  设计目标：人类可理解、可操作                            │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│                    AI-First 应用程序                    │
│  AI Agent → Context(CTP) → 业务逻辑 → 数据             │
│  设计目标：AI 可理解、可执行、可追踪                    │
└─────────────────────────────────────────────────────────┘
```

## 安装

```bash
npm install @context-ai/ctp
# or
bun add @context-ai/ctp
```

## 快速开始

```tsx
/** @jsx jsx */
import { jsx, render, Context, Text, Data, Tool, Group, Example } from '@context-ai/ctp';

// 定义一个 AI Agent 的上下文
const WeatherAgent = (
  <Context
    name="Weather Assistant"
    description="帮助用户查询天气信息"
  >
    <Group title="角色定义">
      <Text>你是一个专业的天气助手，能够查询全球各地的天气信息。</Text>
    </Group>

    <Group title="可用数据">
      <Data
        source="https://api.weather.com/cities"
        format="table"
        fields={['city', 'country', 'lat', 'lon']}
      />
    </Group>

    <Tool
      name="get_weather"
      description="获取指定城市的天气信息"
      parameters={{
        type: 'object',
        properties: {
          city: { type: 'string', description: '城市名称' },
          unit: { type: 'string', enum: ['celsius', 'fahrenheit'] }
        },
        required: ['city']
      }}
      execute={async (params) => {
        // 实际的天气查询逻辑
        return { temperature: 22, condition: 'sunny' };
      }}
    />

    <Example
      title="查询天气"
      input="北京今天天气怎么样？"
      output="北京今天天气晴朗，温度 22°C，适合外出活动。"
    />
  </Context>
);

// 渲染成 AI 可理解的上下文
const ctx = await render(WeatherAgent);
console.log(ctx.prompt);  // 结构化的 prompt
console.log(ctx.tools);   // 可用的工具定义
console.log(ctx.dataViews); // 数据视图
```

## 组件

### Context

根组件，定义 Agent 的身份和边界。

```tsx
<Context
  name="Agent Name"
  description="Agent 的描述"
  metadata={{ version: '1.0.0', author: 'team' }}
>
  {/* 子组件 */}
</Context>
```

### Text

纯文本内容，构建 prompt 的核心。

```tsx
<Text>你是一个有帮助的助手。</Text>
```

### Group

分组容器，组织内容结构。

```tsx
<Group title="工作流程">
  <Text>第一步：...</Text>
  <Text>第二步：...</Text>
</Group>
```

### Data

结构化数据，支持多种格式。

```tsx
// 从 URL 获取
<Data source="https://api.example.com/data" format="table" />

// 内联数据
<Data
  source={[
    { name: 'Alice', role: 'admin' },
    { name: 'Bob', role: 'user' }
  ]}
  format="table"
  fields={['name', 'role']}
/>
```

支持格式：`table` | `list` | `json` | `tree` | `csv`

`Data` 在 `render()` 后会产生两层信息：
- 数据正文（插入到 prompt 主体中）
- 数据视图索引（出现在 prompt 尾部 `## Data Views`）

`## Data Views` 的作用是给模型一个“数据目录”，快速说明：
- 当前有哪些数据块（`title`）
- 每个数据块用什么格式组织（`format`）
- 可关注哪些字段（`fields`，如果提供）

这能降低模型漏读或误读数据结构的概率，尤其在上下文较长时更明显。

### Tool

定义 AI 可调用的工具。

```tsx
<Tool
  name="search_docs"
  description="搜索文档库"
  parameters={{
    type: 'object',
    properties: {
      query: { type: 'string' },
      limit: { type: 'number' }
    },
    required: ['query']
  }}
  execute={async (params) => {
    // 工具执行逻辑
    return results;
  }}
/>
```

### Example

示例展示，帮助 AI 理解预期行为。

```tsx
<Example
  title="搜索文档"
  description="搜索包含关键词的文档"
  input="查找关于 React Hooks 的文档"
  output="找到 3 篇相关文档..."
/>
```

## Router

支持多场景切换的路由系统。

```tsx
import { router, render } from '@context-ai/ctp';

// 注册不同的上下文场景
router.register('onboarding', () => (
  <Context name="Onboarding">
    <Text>帮助新用户完成注册流程...</Text>
  </Context>
));

router.register('support', () => (
  <Context name="Support">
    <Text>回答用户问题...</Text>
  </Context>
));

// 切换场景
const ctx = await router.navigate('onboarding');
```

## RenderedContext

渲染后的完整上下文结构：

```ts
interface RenderedContext {
  name: string;           // Agent 名称
  description?: string;   // Agent 描述
  prompt: string;         // 生成的结构化 prompt
  tools: AgentTool[];     // 可用工具列表
  dataViews: DataView[];  // 数据视图
  state?: Record<string, unknown>;  // 状态
  metadata?: Record<string, unknown>; // 元数据
}
```

## Prompt 尾部结构说明

`buildPrompt()` 会在正文后追加两个可选区块：

### 1) Data Views

当 `context.dataViews.length > 0` 时，输出：
- `## Data Views`
- 每个 data view 的 `title` 与 `format`
- 可选的 `Fields: ...`

作用：作为“数据目录/摘要”，帮助模型快速定位数据来源和结构，而不是只依赖正文中的原始数据片段。

### 2) Metadata

当 `context.metadata` 非空时，输出：
- `## Metadata`
- 每个 `key: value` 键值对

作用：承载全局背景信息（例如版本、作者、标签、运行环境标记等），与正文内容解耦，避免关键信号被埋在长文本里。

简化理解：
- `Data Views` = 数据目录
- `Metadata` = 全局说明卡

## 设计原则

### 1. 声明式

用 JSX 声明 AI 上下文，而非命令式构建。

```tsx
// 声明式 - 推荐
<Context name="Helper">
  <Text>你是一个助手</Text>
  <Tool name="search" ... />
</Context>

// 命令式 - 不推荐
const prompt = "你是一个助手\n\n## Tools\n...";
```

### 2. 可组合

组件可以自由组合，构建复杂场景。

```tsx
const Tools = () => (
  <>
    <Tool name="search" ... />
    <Tool name="create" ... />
  </>
);

const MyAgent = () => (
  <Context name="Agent">
    <Tools />
  </Context>
);
```

### 3. 类型安全

完整的 TypeScript 支持。

```tsx
import type { ContextProps, ToolProps, RenderedContext } from '@context-ai/ctp';
```

### 4. 框架无关

可与任何 LLM 框架集成（OpenAI、Anthropic、LangChain 等）。

```tsx
import { render } from '@context-ai/ctp';
import { Agent } from '@mariozechner/pi-agent-core';

const ctx = await render(MyContext);

const agent = new Agent({
  model: 'claude-sonnet-4-5-20250929',
  systemPrompt: ctx.prompt,
  tools: ctx.tools
});
```

## 与 pi-agent-core 集成

CTP 设计为与 `@mariozechner/pi-agent-core` 无缝配合：

```tsx
import { render, Context, Text, Tool } from '@context-ai/ctp';
import { Agent } from '@mariozechner/pi-agent-core';

const ctx = await render(
  <Context name="Smart Assistant">
    <Text>你是一个智能助手...</Text>
    <Tool name="query_db" description="查询数据库" ... />
  </Context>
);

const agent = new Agent({
  model: 'claude-sonnet-4-5-20250929',
  systemPrompt: ctx.prompt,
  tools: ctx.tools
});

const response = await agent.run('你好！');
```

## License

MIT
