# Findings: CTP Package Research

## CTP 核心概念
- **Context Protocol** - 为 AI Agent 设计界面的声明式 JSX 框架
- 用 JSX 语法构建 AI 可理解的结构化上下文
- 支持多提供商集成 (OpenAI, Anthropic, LangChain 等)

## 可用组件
1. **Context** - 根组件，定义 Agent 身份和边界
2. **Text** - 纯文本内容，构建 prompt 核心
3. **Group** - 分组容器，组织内容结构
4. **Data** - 结构化数据 (table, list, json, tree, csv)
5. **Tool** - 定义 AI 可调用工具
6. **Example** - 示例展示

## 核心 API
- `render()` - 渲染 JSX 为结构化上下文
- `buildPrompt()` - 构建 prompt
- `router` - 多场景路由系统

## RenderedContext 结构
```typescript
{
  name: string;
  description?: string;
  prompt: string;
  tools: AgentTool[];
  dataViews: DataView[];
  state?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}
```

## 依赖
- @mariozechner/pi-agent-core
- @mariozechner/pi-ai

## 项目结构
- monorepo 使用 npm workspaces
- packages/* 下的子包
