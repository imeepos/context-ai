# Findings: Loop Action Analysis

## Current Implementation Issues

### 1. Agent Result Not Captured
```typescript
await agent.prompt(params.prompt, [])
// 返回值被忽略了
```

### 2. Response Schema Too Simple
```typescript
export const LoopRequestResponseSchema = Type.Object({
    ok: Type.Boolean({ description: "HTTP status code" })
});
```
只返回 ok 状态，没有实际的 agent 执行结果。

### 3. Missing Error Handling
没有 try-catch，如果 agent 执行失败会导致未捕获的异常。

### 4. Naming Inconsistency
- Token 名称: `NET_REQUEST_TOKEN`
- Permission 名称: `Loop_REQUEST_PERMISSION`
- 但实际功能是 loop/agent 执行，不是网络请求

## Dependencies Analysis

### 1. Agent.prompt() Return Type
从 `@mariozechner/pi-agent-core/dist/agent.d.ts:143-144` 可以看到：
```typescript
prompt(message: AgentMessage | AgentMessage[]): Promise<void>;
prompt(input: string, images?: ImageContent[]): Promise<void>;
```
**关键发现**: `agent.prompt()` 返回 `Promise<void>`，不直接返回执行结果。

### 2. Agent Event System
Agent 使用事件系统来传递执行结果：
- `agent.subscribe(fn: (e: AgentEvent) => void)` - 订阅事件
- 需要通过事件监听器捕获 agent 的输出和状态

### 3. PageFactory.create() Return Type
从 `tokens.ts:125` 可以看到：
```typescript
create<TParameters extends TSchema = TSchema>(
  params: Static<TParameters>,
  injector: Injector
): Promise<RenderedContext>
```
返回 `RenderedContext` 类型，包含 `prompt` 和 `tools`。

### 4. Error Handling Pattern
参考 `net-request.action.ts:114-156`：
- 使用 try-catch 包裹执行逻辑
- 支持重试机制
- 最后抛出详细错误信息

## Design Decisions

### Response Schema 设计
应该包含：
1. `success: boolean` - 执行是否成功
2. `output?: string` - Agent 的文本输出
3. `error?: string` - 错误信息（如果失败）
4. `toolCalls?: number` - 工具调用次数（可选）

### Agent Result Capture Strategy
由于 `agent.prompt()` 返回 void，需要：
1. 使用 `agent.subscribe()` 订阅事件
2. 收集 assistant 消息作为输出
3. 监听错误事件
4. 等待 agent 完成（使用 `agent.waitForIdle()`）
