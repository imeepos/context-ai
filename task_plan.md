# Task Plan: Improve Loop Action Agent Logic

## Goal
完善 `loop.action.ts` 中的 agent 调用和结果返回逻辑，确保：
1. Agent 执行结果能够正确返回
2. 错误处理完善
3. 类型安全
4. 符合项目规范（禁止 as any，必须持久化存储等）

## Phases

### Phase 1: 分析现有代码 [complete]
**Status:** complete
**Description:** 理解当前实现的问题和改进点
**Files:**
- packages/os-v1/src/actions/loop.action.ts

**Findings:**
- 当前 agent.prompt() 的返回值未被捕获
- 响应 schema 过于简单（只有 ok 字段）
- 缺少错误处理
- 缺少 agent 执行结果的返回

### Phase 2: 查看相关依赖 [complete]
**Status:** complete
**Description:** 了解 createAgent 和相关类型定义
**Files checked:**
- @context-ai/agent 包的类型定义
- tokens.ts 中的 PAGES 定义
- net-request.action.ts 的错误处理参考
- AgentEvent 类型定义

**Key findings:**
- agent.prompt() 返回 Promise<void>
- 需要通过 agent.subscribe() 监听事件
- 使用 agent.waitForIdle() 等待完成
- AgentEvent 包含 agent_end 事件，携带最终 messages

### Phase 3: 设计改进方案 [complete]
**Status:** complete
**Description:** 设计新的响应结构和错误处理逻辑

**Design decisions:**
1. Response Schema 包含：
   - `success: boolean` - 执行是否成功
   - `output: string` - Agent 的输出内容
   - `error?: string` - 错误信息（可选）
   - `toolCallsCount: number` - 工具调用次数

2. Agent 结果捕获策略：
   - 使用 agent.subscribe() 订阅事件
   - 监听 "agent_end" 事件获取最终 messages
   - 提取 assistant 角色的消息作为输出
   - 使用 agent.waitForIdle() 等待执行完成

3. 错误处理：
   - try-catch 包裹整个执行逻辑
   - 捕获 page 查找失败
   - 捕获 agent 执行异常
   - 返回详细错误信息

### Phase 4: 实现改进 [complete]
**Status:** complete
**Description:** 修改代码实现
**Changes:**
- ✅ 更新 response schema（添加 success, output, error, toolCallsCount）
- ✅ 使用 agent.subscribe() 捕获执行结果
- ✅ 监听 agent_end 和 tool_execution_end 事件
- ✅ 提取 assistant 消息作为输出
- ✅ 添加完整的错误处理（page 查找失败、agent 执行异常）
- ✅ 使用 agent.waitForIdle() 等待完成
- ✅ 确保类型安全（无 as any）
- ✅ 修正命名（NET_REQUEST_TOKEN → LOOP_REQUEST_TOKEN）

### Phase 5: 验证实现 [complete]
**Status:** complete
**Description:** 检查代码质量
**Checks:**
- ✅ 类型检查通过（npx tsc --noEmit 无错误）
- ✅ 符合项目规范（禁止 as any，使用类型安全的方式）
- ✅ 错误处理完善（try-catch 包裹，详细错误信息）
- ✅ 依赖通过 _injector.get 获取
- ✅ Schema 描述清晰完整

## Errors Encountered
| Error | Attempt | Resolution |
|-------|---------|------------|
| - | - | - |
