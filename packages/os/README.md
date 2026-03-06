# @context-ai/os

LLM 驱动的 OS 能力层，面向 CTP 框架提供统一的系统服务编排。

## 当前能力
- 内核治理：`service-registry`（含 `registerMany` 批量依赖解析）、`policy-engine`、`audit-log`、`logger`、`metrics`
- 应用管理：`app.install / app.upgrade / app.list / app.state.set / app.disable / app.enable / app.uninstall`
- 文件能力：`file.read / file.write / file.list / file.find / file.grep / file.edit`
- Shell：`shell.execute`（支持 profile） + `shell.env.set / shell.env.unset / shell.env.list`
- 网络与安全：`net.request` + `security.redact`
- 存储与调度：`store.set / store.get`、`scheduler.scheduleOnce / scheduler.scheduleInterval / scheduler.cancel / scheduler.list / scheduler.failures.clear / scheduler.failures.replay`、retryable task + DLQ
- 通知能力：`notification.send / notification.ack / notification.ackAll / notification.cleanup / notification.list / notification.mute / notification.mute.list / notification.unmute / notification.stats`（支持 dedupe window + mute window + since/until + rate limit + retention limit）
- 系统服务：`system.health`、`system.dependencies`、`system.metrics`、`system.audit`、`system.topology(含 boot order)`、`system.events`、`system.capabilities`、`system.capabilities.list`、`system.policy`、`system.policy.evaluate`、`system.net.circuit`、`system.net.circuit.reset`、`system.scheduler.failures`、`system.alerts`、`system.alerts.policy`、`system.alerts.unacked`、`system.alerts.clear`、`system.alerts.export`、`system.alerts.stats`、`system.alerts.topics`、`system.alerts.trends`、`system.alerts.slo`、`system.alerts.incidents`、`system.alerts.digest`、`system.alerts.report`、`system.alerts.report.compact`、`system.alerts.flapping`、`system.alerts.timeline`、`system.snapshot`、`system.errors`
- 诊断摘要：`system.snapshot.resilience` 包含 `openNetCircuits` 与 `schedulerFailures`
- 扩展服务：`model.generate`、`ui.render`、`media.inspect`、`package.install/list`、`host.execute`

## 快速开始
```ts
import { createDefaultLLMOS } from "@context-ai/os";

const os = createDefaultLLMOS({
  pathPolicy: { allow: [process.cwd()], deny: [] },
  packageSigningSecret: "optional-signing-secret",
  netJournalLimit: 1000,
  notificationDedupeWindowMs: 1000,
  notificationRateLimit: { limit: 20, windowMs: 60_000 },
  notificationRetentionLimit: 5000,
  enabledServices: {
    "package.install": true,
    "host.execute": true,
  },
});

const context = {
  appId: "app.demo",
  sessionId: "session-1",
  permissions: ["app:manage", "store:write", "store:read", "system:read"],
  workingDirectory: process.cwd(),
};

await os.kernel.execute("app.install", {
  manifest: {
    id: "app.demo",
    name: "Demo",
    version: "1.0.0",
    entry: "index.js",
    permissions: context.permissions,
  },
}, context);

await os.kernel.execute("store.set", { key: "hello", value: "world" }, context);
const value = await os.kernel.execute("store.get", { key: "hello" }, context);
const health = await os.kernel.execute("system.health", {}, context);
```

## CTP Tool 适配
```ts
import { createCTPTool } from "@context-ai/os";

const tool = createCTPTool(os.kernel, {
  name: "store.get",
  requiredPermissions: ["store:read"],
  execute: async (req, ctx) => os.kernel.execute("store.get", req, ctx),
}, {
  description: "Get value from store",
});
```

返回结构统一为：
- `result`
- `meta`（含 `traceId`）
- `audit`

也可以批量导出：
```ts
import { createCTPToolsFromKernel } from "@context-ai/os";

const tools = createCTPToolsFromKernel(os.kernel, {
  "store.get": { description: "Read from KV store" },
  "store.set": { description: "Write to KV store" },
});
```

## 测试与构建
```bash
npm run test -w @context-ai/os
npm run build -w @context-ai/os
```
