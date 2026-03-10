# main.ts 调整说明（按建议落地）

已按你的建议改造 `packages/os-v1/src/main.ts`：

1. 先创建一个任务（Task1）
- 使用固定请求：
```ts
const requestParams = {
  path: "novel://detail/novel-1773139842102-gm3yqdmv",
  prompt: "你是一个作家，正在创作《重生之我在异界开挂》。",
};
```

2. Task1 执行结束后再规划后续
- `onReplan` 在 Task 完成时触发。
- 完成 Task1 后，不再写死 Task2/Task3。
- 通过 `loop.request` 打开 `scheduler://detail/{workflowId}`，让 AI 基于任务详情页上下文输出 3 个后续任务 JSON。
- 主流程解析 JSON 并调用 `schedulerService.updateWorkflow()` 动态写入计划。

3. 验证目标
- 初始任务数断言：`1`
- 动态新增任务断言：`>= 3`（`Auto-*`）

4. 编译状态
- `npm run build --workspace @context-ai/os-v1` 已通过。

> 说明：`main.ts` 是真实调用模型与工具链的流程，运行耗时取决于模型响应与工具执行。
