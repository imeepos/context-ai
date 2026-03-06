# @context-ai/os

LLM 驱动的 OS 能力层，面向 CTP 框架提供统一的系统服务编排。

## 破坏性变更（2026-03-06）
- 已移除遗留源码目录：`src/bash`、`src/file-manager`
- 已移除未接入服务链的历史工具模块：`src/config.ts`、`src/core/settings-manager.ts`、`src/utils/*`（旧 shell/file/tool 辅助实现）
- 已移除旧入口导出：`./bash/*`、`./file-manager/*`
- 包导出已收口：仅公开包根入口 `@context-ai/os`（通过 `exports` 锁定）
- 统一迁移到服务化接口：
  - 文件能力：`FileService` + `file.read/file.write/file.list/file.find/file.grep/file.edit`
  - Shell 能力：`ShellService` + `shell.execute/shell.env.set/shell.env.unset/shell.env.list`
- `build` 已改为“先清理 `dist` 再编译”，防止旧产物残留到发布包

## 当前能力
- 内核治理：`service-registry`（含 `registerMany` 批量依赖解析）、`policy-engine`、`audit-log`、`logger`、`metrics`
- 应用管理：`app.install / app.install.rollback / app.install.v1 / app.start / app.page.render / render / app.upgrade / app.list / app.state.set / app.disable / app.enable / app.uninstall`
- 文件能力：`file.read / file.write / file.list / file.find / file.grep / file.edit`
- Shell：`shell.execute`（支持 profile） + `shell.env.set / shell.env.unset / shell.env.list`
- 网络与安全：`net.request` + `security.redact`
- 存储与调度：`store.set / store.get`、`scheduler.scheduleOnce / scheduler.scheduleInterval / scheduler.cancel / scheduler.list / scheduler.failures.clear / scheduler.failures.replay / scheduler.state.export / scheduler.state.import / scheduler.state.persist / scheduler.state.recover`、retryable task + DLQ + state recovery + store adapter persistence
- 通知能力：`notification.send / notification.ack / notification.ackAll / notification.cleanup / notification.list / notification.mute / notification.mute.list / notification.unmute / notification.stats / notification.policy.update / notification.channel.configure / notification.channel.stats`（支持 dedupe window + mute window + since/until + rate limit + retention limit + runtime policy patch + channel adapter retry）
- 系统服务：`system.health`、`system.dependencies`、`system.routes`、`system.routes.stats`、`system.app.install.report`（含 `lastAction/updatedAt`）、`system.app.delta`、`system.app.rollback.state.export`（默认脱敏，`includeSensitive=true` 可导出完整 token/state）、`system.app.rollback.state.import`、`system.app.rollback.state.persist`、`system.app.rollback.state.recover`、`system.app.rollback.stats`、`system.app.rollback.gc`、`system.app.rollback.audit`、`system.metrics`、`system.audit`、`system.audit.export`、`system.audit.keys.rotate`、`system.audit.keys.list`、`system.audit.keys.activate`、`system.governance.state.export`、`system.governance.state.import`、`system.governance.state.persist`、`system.governance.state.recover`、`system.topology(含 boot order)`、`system.events`、`system.capabilities`、`system.capabilities.list`、`system.policy`、`system.policy.evaluate`、`system.policy.update`、`system.policy.version.create`、`system.policy.version.list`、`system.policy.version.rollback`、`system.policy.simulate.batch`、`system.policy.guard.apply`、`system.net.circuit`、`system.net.circuit.reset`、`system.scheduler.failures`、`system.alerts`、`system.alerts.policy`、`system.alerts.unacked`、`system.alerts.clear`、`system.alerts.export`、`system.alerts.stats`、`system.alerts.topics`、`system.alerts.trends`、`system.alerts.slo`、`system.alerts.incidents`、`system.alerts.digest`、`system.alerts.report`、`system.alerts.report.compact`、`system.alerts.flapping`、`system.alerts.timeline`、`system.alerts.hotspots`、`system.alerts.recommendations`、`system.alerts.feed`、`system.alerts.backlog`、`system.alerts.breaches`、`system.alerts.health`、`system.alerts.auto-remediate.plan`、`system.alerts.auto-remediate.execute`、`system.alerts.auto-remediate.audit`、`system.slo`、`system.slo.rules.upsert`、`system.slo.rules.list`、`system.slo.rules.evaluate`、`system.quota`、`system.quota.adjust`、`system.quota.policy.upsert`、`system.quota.policy.list`、`system.quota.policy.apply`、`system.quota.hotspots`、`system.quota.hotspots.isolate`、`system.chaos.run`、`system.chaos.baseline.capture`、`system.chaos.baseline.verify`、`system.snapshot`、`system.errors`、`system.errors.export`、`system.errors.keys.rotate`、`system.errors.keys.list`、`system.errors.keys.activate`
- 诊断摘要：`system.snapshot.resilience` 包含 `openNetCircuits` 与 `schedulerFailures`
- 错误观测：`system.errors` 提供 `byErrorCode`、`byReason`、`topReasons`、`byService`、`recent` 与 `trend`，支持 `service/servicePrefix/errorCode/windowMinutes/limit/order/offset/recentLimit/bucketMinutes` 查询约束；`system.errors.export` 支持 `json/csv` 导出、`gzip+base64` 压缩、`signature` 与 `contentSha256` 完整性校验，且支持 key 轮换与激活（`system.errors.keys.*`）
- 任务与编排：`task.submit / task.decompose / task.loop`、`planner.selectApps / planner.composeTools`、`runner.executePlan`、`runtime.tools.validate / runtime.risk.confirm`
- 扩展服务：`model.generate`、`ui.render`、`media.inspect`、`package.install`、`package.list`、`host.execute`
- 回滚治理增强：`system.app.rollback.state.import` 对快照/报告结构做强校验，且按“原子导入”语义执行（校验失败不污染已有状态）；`system.app.rollback.stats` 支持 `soonToExpireWindowMs` 并返回 `soonToExpireSnapshots`、`oldestCreatedAt/newestCreatedAt`；`system.app.rollback.gc` 支持 `dryRun/limit` 且返回 `eligible`
- 回滚恢复语义：`system.app.rollback.state.recover` 对损坏持久化状态执行“安全失败”返回（`recovered=false, reason=invalid_state, errorCode`），避免把坏状态引入运行时

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
    entry: {
      pages: [
        {
          id: "main",
          route: "app.demo://main",
          name: "Main",
          description: "Default app page",
          path: "index.js",
          default: true,
        },
      ],
    },
    permissions: context.permissions,
  },
}, context);

await os.kernel.execute("store.set", { key: "hello", value: "world" }, context);
const value = await os.kernel.execute("store.get", { key: "hello" }, context);
const rendered = await os.kernel.execute("app.page.render", { route: "app.demo://main" }, context);
const quick = await os.kernel.execute("render", { route: "app.demo://main" }, context);

const started = await os.kernel.execute("app.start", { appId: "app.demo" }, context);
const task = await os.kernel.execute("task.submit", {
  text: "Summarize current app status",
  route: "app.demo://main",
}, context);
const routes = await os.kernel.execute("system.routes", {
  appId: "app.demo",
  prefix: "app.demo://",
  offset: 0,
  limit: 10,
}, context);
const routeStats = await os.kernel.execute("system.routes.stats", {
  appId: "app.demo",
}, context);
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

## 运维排障示例
```ts
// 1) 先看最近 30 分钟、最近 200 条失败概况
const errors = await os.kernel.execute(
  "system.errors",
  { windowMinutes: 30, limit: 200 },
  context,
);

// 2) 锁定高频失败服务（byService）与高频根因（topReasons）
console.log(errors.byService, errors.topReasons);

// 3) 针对某服务做窄化查询
const netErrors = await os.kernel.execute(
  "system.errors",
  { service: "net.request", windowMinutes: 10, limit: 50 },
  context,
);

// 4) 结合 recent 里的 traceId 去 system.audit 精确回放链路
const traceId = netErrors.recent[0]?.traceId;
if (traceId) {
  const traceAudit = await os.kernel.execute(
    "system.audit",
    { traceId },
    context,
  );
  console.log(traceAudit.records);
}
```

## 测试与构建
```bash
npm run test -w @context-ai/os
npm run build -w @context-ai/os
```
