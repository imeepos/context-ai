# CTP LLM OS 顶层架构设计与功能规划

## 实施状态（2026-03-06）
- [x] M8(架构收敛)-1: 移除遗留模块 `src/bash` 与 `src/file-manager`，统一收口到 `shell-service` / `file-service`
- [x] M8(架构收敛)-2: 清理未接入服务链的遗留 `config/core/utils` 孤岛模块，避免重复实现与发布污染
- [x] M8(架构收敛)-3: `package.json` 公开面收口（`exports`）并剔除未使用依赖，降低供应链与维护成本
- [x] 全部规划项已落地，当前进入维护与增量迭代阶段（tests: 130 passed, build: pass）
- [x] M7(补缺)-11: 治理状态统一快照与恢复 `system.governance.state.export/import/persist/recover`
- [x] M6(自治运维阶段)-1: 自动修复计划 `system.alerts.auto-remediate.plan`（规则化动作编排）
- [x] M6(自治运维阶段)-2: 自动修复执行 `system.alerts.auto-remediate.execute`（审批开关 + dry-run）
- [x] M6(治理阶段)-3: 策略版本化 `system.policy.version.create/list/rollback`
- [x] M6(治理阶段)-4: 批量策略预演 `system.policy.simulate.batch`
- [x] M6(可靠性阶段)-5: 调度持久化 `scheduler.state.export/import`（任务与失败恢复）
- [x] M6(通知阶段)-6: 通知通道适配器 `NotificationChannelAdapter` + 失败重试
- [x] M6(SLO阶段)-7: 全局 SLO `system.slo`（服务成功率/P95 + 告警确认）
- [x] M6(审计阶段)-8: 审计增量导出 `system.audit.export`（cursor + gzip + signature）
- [x] M6(配额阶段)-9: 动态配额 `system.quota/system.quota.adjust`（load/priority 调节）
- [x] M6(演练阶段)-10: 混沌演练 `system.chaos.run`（policy/scheduler/alert storm drill）
- [x] M7(闭环阶段)-1: 自动修复执行审批加固（approver + approvalExpiresAt 必填校验）
- [x] M7(闭环阶段)-2: 自动修复全链路审计 `system.alerts.auto-remediate.audit`
- [x] M7(闭环阶段)-3: 策略变更守护 `system.policy.guard.apply`（变更前模拟 + 变更后健康检查 + 自动回滚）
- [x] M7(生产阶段)-4: 调度持久化存储适配器（`StoreSchedulerStateAdapter` + auto persist/recover）
- [x] M7(生产阶段)-5: 通知通道标准化配置 `notification.channel.configure/stats`（Webhook/Slack/Email）
- [x] M7(生产阶段)-6: SLO 阈值规则管理 `system.slo.rules.upsert/list/evaluate`
- [x] M7(多租户阶段)-7: 配额策略中心 `system.quota.policy.upsert/list/apply`（tier/time/load）
- [x] M7(多租户阶段)-8: 热点租户隔离 `system.quota.hotspots / system.quota.hotspots.isolate`
- [x] M7(安全阶段)-9: 审计签名密钥轮换/托管 `system.audit.keys.rotate/list/activate`
- [x] M7(质量阶段)-10: 混沌演练扩展与基线 `system.chaos.run(scheduler_replay)` + `system.chaos.baseline.capture/verify`
- [x] M5(稳定性阶段)-1: NetService 熔断器（Circuit Breaker）+ `system.net.circuit` 运行态查询
- [x] M5(稳定性阶段)-2: Scheduler 死信队列（DLQ）+ `system.scheduler.failures` 查询
- [x] M5(稳定性阶段)-3: DLQ 运维动作 `scheduler.failures.clear`（按 id / 全量清理）
- [x] M5(稳定性阶段)-4: Notification 去重窗口（dedupe window）防告警风暴
- [x] M5(稳定性阶段)-5: `net.journal` 容量上限（ring buffer）防止存储无限增长
- [x] M5(稳定性阶段)-6: DLQ 重放能力 `scheduler.failures.replay` + replay 事件
- [x] M5(稳定性阶段)-7: `system.snapshot` 增加稳定性摘要（open circuit / scheduler failures）
- [x] M5(稳定性阶段)-8: 工厂级通知去重配置 `notificationDedupeWindowMs`
- [x] M5(稳定性阶段)-9: 熔断运维动作 `system.net.circuit.reset`（按 host / 全量）
- [x] M5(稳定性阶段)-10: `system.scheduler.failures` 支持按任务 id 过滤查询
- [x] M5(稳定性阶段)-11: `system.alerts` 聚合查询（topic/severity/limit + bySeverity）
- [x] M5(稳定性阶段)-12: 通知静默窗口（mute/unmute）与 severity 分级
- [x] M5(稳定性阶段)-13: 告警运维动作 `system.alerts.clear`（按 topic/severity 清理）
- [x] M5(稳定性阶段)-14: 告警时间窗过滤（`since/until`）支持 `notification.list/system.alerts`
- [x] M5(稳定性阶段)-15: 告警导出接口 `system.alerts.export`（json/csv）
- [x] M5(稳定性阶段)-16: 静默可观测性 `notification.mute.list`
- [x] M5(稳定性阶段)-17: 告警洪峰保护（per-topic rate limit）+ `system.alerts.stats`
- [x] M5(稳定性阶段)-18: 告警主题聚合 `system.alerts.topics`（sent/dropped/total）
- [x] M5(稳定性阶段)-19: 告警确认闭环 `notification.ack` + `system.alerts.unacked`
- [x] M5(稳定性阶段)-20: 批量确认 `notification.ackAll`（topic/severity/time-window 过滤）
- [x] M5(稳定性阶段)-21: 运维清理 `notification.cleanup`（历史告警 + 过期静默）
- [x] M5(稳定性阶段)-22: 告警策略查询 `system.alerts.policy` + retention cap
- [x] M5(稳定性阶段)-23: 告警趋势 `system.alerts.trends`（windowMinutes 聚合）
- [x] M5(稳定性阶段)-24: 告警确认 SLO `system.alerts.slo`（avg/p95 ack latency）
- [x] M5(稳定性阶段)-25: 告警事件簇 `system.alerts.incidents`（按签名聚合未确认告警）
- [x] M5(稳定性阶段)-26: 告警摘要 `system.alerts.digest`（severity + top incidents 文本）
- [x] M5(稳定性阶段)-27: 一体化告警报告 `system.alerts.report`（policy/stats/trends/slo/digest）
- [x] M5(稳定性阶段)-28: 紧凑告警报告 `system.alerts.report.compact`（token-friendly）
- [x] M5(稳定性阶段)-29: 告警抖动检测 `system.alerts.flapping`（window + threshold）
- [x] M5(稳定性阶段)-30: 告警时间线 `system.alerts.timeline`（window + bucket 聚合）
- [x] M5(稳定性阶段)-31: 告警热点 `system.alerts.hotspots`（当前窗 vs 上一窗 delta）
- [x] M5(稳定性阶段)-32: 运维建议 `system.alerts.recommendations`（规则化动作建议）
- [x] M5(稳定性阶段)-33: 分页告警流 `system.alerts.feed`（offset/limit）
- [x] M5(稳定性阶段)-34: 超标检测 `system.alerts.breaches`（critical/unacked/ack-p95 阈值）
- [x] M5(稳定性阶段)-35: 通知策略热更新 `notification.policy.update`（dedupe/rate/retention runtime patch）
- [x] M5(稳定性阶段)-36: 告警积压观测 `system.alerts.backlog`（unacked age/overdue/severity 分布）
- [x] M5(稳定性阶段)-37: 告警健康评分 `system.alerts.health`（score/level + indicators + breaches）
- [x] M1: Kernel + 三大核心域（AppManager / FileService / ShellService）
- [x] M2: NetService / StoreService / SchedulerService / SecurityService / NotificationService
- [x] 统一工厂：`createDefaultLLMOS()` 与默认服务注册
- [x] 安全治理：`PolicyEngine`（路径、命令、网络、权限）+ `AuditLog`
- [x] 可观测基础：服务执行审计、Shell 执行审计、事件总线
- [x] TDD：已引入 `vitest`，完成 130 个测试并通过
- [x] P1: `MediaService / UIService / PackageService`
- [x] P2: `HostAdapterRegistry`（位置/蓝牙/传感器插件化入口）
- [x] Model 运行服务：`ModelService`（provider registry + 统一调用）
- [x] 可观测增强：`KernelLogger`（结构化日志）+ Trace ID 贯穿执行
- [x] 错误治理：`OSError` + 统一错误码（权限/策略/执行）
- [x] 失败自动告警：`kernel.service.failed -> NotificationService(system.alert)`
- [x] 调度增强：`SchedulerService.scheduleRetryable()`（重试/退避）
- [x] 存储增强：Store Adapter（memory/json-file/sqlite-like）
- [x] CTP 集成收口：`OSService -> CTP Tool` 适配器（`createCTPTool`）
- [x] 多租户资源治理：`TenantQuotaGovernor` + `AppQuotaGovernor` 接入 kernel 执行链
- [x] 文件能力补齐：`file.list/find/grep/edit` 统一纳入 `FileService`
- [x] Shell 执行档位：`ExecutionProfile`（standard/restricted/read-only）
- [x] 统一响应封装：CTP Tool 返回 `{ result, meta, audit }`
- [x] 可观测指标：`KernelMetrics`（success rate / error rate / p95）
- [x] 错误语义完善：服务缺失统一 `E_SERVICE_NOT_FOUND`
- [x] 插件市场签名机制：`PackageService` 支持签名校验（可配置）
- [x] 依赖链落地：`NetService` 请求审计通过 `StoreService` 持久化（net.journal）
- [x] 调度链路落地：`SchedulerService` 发布 retried/succeeded/failed 事件并联动告警
- [x] 服务启停治理：`createDefaultLLMOS({ enabledServices })` 支持按服务开关注册
- [x] 运维可观测入口：`system.health` 服务输出服务列表与指标快照
- [x] 应用声明强校验：未注册应用拒绝执行 + 上下文权限必须受 Manifest 授权
- [x] 应用生命周期补齐：`app.disable/app.enable/app.uninstall` 与执行链联动
- [x] 网络策略补齐：Domain + Method + RateLimit（PolicyEngine/NetService）
- [x] 服务依赖治理：注册时依赖校验 + 依赖图查询（ServiceRegistry）
- [x] 系统依赖可视化：`system.dependencies` 暴露服务依赖图
- [x] 外部消费文档：`packages/os/README.md` 重写为可运行指南
- [x] 策略拒绝错误码化：统一抛出 `E_POLICY_DENIED` 并进入审计链
- [x] 运维指标查询：`system.metrics` 支持全量/单服务指标读取
- [x] 权限一致性校验覆盖：`E_APP_PERMISSION_MISMATCH` 增加集成测试
- [x] 审计查询能力：`system.audit` 支持按 session/trace/service 过滤
- [x] 调度服务对外化：新增 `scheduler.scheduleOnce / scheduler.scheduleInterval` kernel 服务
- [x] 调度可观测补齐：新增 `scheduler.list` 服务
- [x] CTP 批量适配：`createCTPToolsFromKernel()` 支持一键导出工具清单
- [x] 系统拓扑查询：`system.topology` 输出 services + deps + metrics
- [x] 通知查询能力：`notification.list` 支持 topic/limit 过滤
- [x] 事件历史查询：`system.events` 支持 topic/limit 检索 EventBus 历史
- [x] 启动顺序可视化：`ServiceRegistry.bootOrder()` 并接入 `system.topology`
- [x] 能力注册可查询：`system.capabilities` 读取 App 能力集合
- [x] 应用升级能力：`app.upgrade` 支持版本/权限升级并同步能力表
- [x] 批量服务编排：`ServiceRegistry.registerMany()` 支持同批依赖解析与环检测
- [x] Shell 会话隔离对外化：`shell.env.set / shell.env.unset / shell.env.list`
- [x] 策略快照查询：`system.policy` 暴露当前 PolicyEngine 生效规则
- [x] 一体化诊断：`system.snapshot` 聚合 health/topology/policy/audit 摘要
- [x] 能力全量查询：`system.capabilities.list` + capability remove/listAll
- [x] 错误聚合查询：`system.errors` 支持按服务统计失败错误码
- [x] 策略预判接口：`system.policy.evaluate` 支持无副作用策略评估

## 0. 目标与范围
- 目标：在 `packages/os` 中构建一个由大模型驱动的“操作系统层”，为 CTP Agent 提供统一的系统能力编排。
- 范围：优先落地三大核心域
1. 应用管理（Application Management）
2. 文件管理（File Management）
3. 命令行工具（Shell / CLI Tools）
- 约束：遵循真实操作系统“上层依赖下层”的原则，适配 CTP 的工具调用模型与跨运行时特性。

## 1. 现状基线（Current Baseline）
- 当前入口 `src/index.ts` 已统一导出系统化服务（`app/file/shell/net/store/system/scheduler/security/notification/...`），不再导出遗留 `file-manager/bash` 模块。
- 已有基础能力：
1. 文件工具：`read / write / ls / find / grep / edit`
2. 命令执行：`bash`（带超时、中止、输出截断、临时日志）
3. 基础配置：`settings-manager`、`config`
4. 辅助工具：路径、mime、图像、外部二进制工具管理（`fd`、`rg`）
- 缺口：缺少完整“系统层”设计，尤其是应用生命周期、权限、安全、任务调度、事件总线、服务注册与治理。

## 2. LLM OS 分层架构（类比真实 OS）

```text
┌────────────────────────────────────────────────────────────┐
│ 应用层 Application Layer                                  │
│  - Chat App / Workflow App / Plugin App                  │
└───────────────────────┬────────────────────────────────────┘
                        │
┌───────────────────────▼────────────────────────────────────┐
│ 交互层 Interaction Layer                                   │
│  - 会话 UI 协议 / CLI / Tool-call 路由                    │
└───────────────────────┬────────────────────────────────────┘
                        │ 依赖系统服务
┌───────────────────────▼────────────────────────────────────┐
│ 系统服务层 System Services                                 │
│  - AppManager / FileService / ShellService                │
│  - NetService / StoreService / NotifyService              │
│  - ModelService / PolicyService / Scheduler               │
└───────────────────────┬────────────────────────────────────┘
                        │ 通过抽象接口访问宿主能力
┌───────────────────────▼────────────────────────────────────┐
│ 运行时抽象层 Runtime HAL                                   │
│  - FS Adapter / Process Adapter / HTTP Adapter            │
│  - DB Adapter / Secret Adapter / Timer Adapter            │
└───────────────────────┬────────────────────────────────────┘
                        │
┌───────────────────────▼────────────────────────────────────┐
│ 宿主层 Host Environment                                   │
│  - Node/Bun/Deno + OS(Windows/Linux/macOS)               │
└────────────────────────────────────────────────────────────┘
```

对应关系（真实 OS -> CTP LLM OS）：
- Hardware -> Host Environment
- HAL -> Runtime Adapters
- System Services -> OS Services（工具与能力治理）
- UI Layer -> CTP 会话与调用协议层
- Application -> Agent App / Skills / Plugins

## 3. 核心子系统设计

## 3.1 应用管理（AppManager）[P0]
职责：
1. 应用注册、安装、卸载、升级、禁用
2. 应用生命周期：`install -> resolve -> activate -> run -> suspend -> stop`
3. 应用声明文件（Manifest）校验
4. 应用权限申请与授权缓存
5. 应用资源配额（token、CPU 时间、工具调用次数、文件访问范围）

关键对象：
1. `AppManifest`
2. `AppInstance`
3. `AppPermission`
4. `AppPolicy`

建议文件结构：
- `src/app-manager/registry.ts`
- `src/app-manager/lifecycle.ts`
- `src/app-manager/manifest.ts`
- `src/app-manager/permissions.ts`
- `src/app-manager/quota.ts`

## 3.2 文件管理（FileService）[P0]
职责：
1. 统一封装当前已有文件工具
2. 路径沙箱（workspace allowlist / denylist）
3. 原子写入与并发锁
4. 版本快照与可回滚编辑（edit + diff）
5. 大文件流式读写与分块策略

接口分层：
1. User API：`read/write/edit/find/grep/ls`
2. Guard Layer：权限、路径校验、大小阈值控制
3. Adapter Layer：Node FS / 未来可扩展远端存储

建议文件结构：
- `src/file-service/index.ts`
- `src/file-service/guard.ts`
- `src/file-service/transaction.ts`
- `src/file-service/snapshot.ts`

## 3.3 命令行工具（ShellService）[P0]
职责：
1. 统一 shell 执行入口（复用 `bash.ts`）
2. 命令白名单/黑名单策略
3. 会话级环境变量隔离
4. 输出流治理（截断、持久化、检索）
5. 可审计执行日志（命令、参数、退出码、耗时）

增强点：
1. `CommandPolicy`（危险命令拦截）
2. `ExecutionProfile`（标准/受限/只读）
3. `ShellSession`（会话复用）

建议文件结构：
- `src/shell-service/index.ts`
- `src/shell-service/policy.ts`
- `src/shell-service/session.ts`
- `src/shell-service/audit.ts`

## 4. 系统能力规划（类比 Android/iOS/Linux/Windows）

## 4.1 P0（必须）
1. 文件系统：`FileService`（已具备基础）
2. 网络：`NetService`（HTTP 客户端、重试、超时、证书策略）
3. 数据存储：`StoreService`（KV + SQLite 适配）
4. 后台任务：`SchedulerService`（cron/queue/retry）
5. 安全加密：`SecurityService`（密钥、签名、敏感信息脱敏）
6. 通知：`EventBus + NotificationService`（系统内事件）

## 4.2 P1（高优先）
1. 媒体能力：`MediaService`（图像处理扩展，复用 photon）
2. UI 协议能力：`UIService`（结构化渲染协议，不绑定具体前端）
3. 插件市场：`PackageService`（应用源、签名、版本）

## 4.3 P2（按需）
1. 位置服务、蓝牙、传感器：通过 Host Adapter 插件化接入
2. 图形渲染：面向前端宿主输出 Render Protocol

## 5. 关键依赖链（落地版）

1. 网络 -> 安全 -> 存储
- `NetService` 所有出站请求必须走 `SecurityService`（签名、鉴权、脱敏）
- 请求与响应摘要可落库到 `StoreService`

2. 媒体 -> 文件系统 -> 渲染协议
- 媒体输入来自 `FileService`
- 处理结果统一输出为文件引用 + 元数据

3. 通知 -> 调度器 -> 应用生命周期
- `SchedulerService` 触发后台任务
- 任务状态通过 `EventBus` 推送到应用

4. 应用 -> 权限 -> 工具执行
- `AppManager` 根据权限策略授权工具调用
- `ShellService/FileService/NetService` 二次校验

## 6. CTP 集成设计（重点）

统一能力注册中心：
- `src/kernel/service-registry.ts`
- `src/kernel/capability-registry.ts`

统一调用协议：
1. CTP Context 产出 tool schema
2. OS Kernel 负责路由到具体 Service
3. Service 返回标准响应对象（含 `result/meta/audit`）

建议接口：
```ts
interface OSService<Request, Response> {
  name: string;
  execute(req: Request, ctx: OSContext): Promise<Response>;
}

interface OSContext {
  appId: string;
  sessionId: string;
  permissions: string[];
  workingDirectory: string;
}
```

## 7. 安全与治理模型

策略层（Policy Engine）：
1. 路径访问策略（Path Policy）
2. 命令执行策略（Command Policy）
3. 网络访问策略（Domain / Method / Rate Policy）
4. 数据脱敏策略（Secret Redaction Policy）

审计层（Audit）：
1. 每次 tool call 生成审计记录
2. 支持按 `appId/sessionId/toolName` 检索
3. 关键失败自动上报到 `NotificationService`

## 8. 可观测性与 SLO

核心指标：
1. Tool 调用成功率
2. P95 执行时延
3. 错误率（按服务维度）
4. 重试命中率
5. 输出截断比例（bash/file）

日志标准：
1. 结构化 JSON 日志
2. Trace ID 贯穿一次 agent turn
3. 关键服务统一错误码

## 9. 代码组织建议（目标目录）

```text
packages/os/src
  /kernel
    service-registry.ts
    capability-registry.ts
    policy-engine.ts
    event-bus.ts
  /app-manager
  /file-service
  /shell-service
  /net-service
  /store-service
  /security-service
  /scheduler-service
  /notification-service
  /types
  index.ts
```

入口导出建议（已实现）：
1. 仅保留系统化服务导出，移除 `file-manager`、`bash` 兼容导出
2. 提供默认工厂 `createDefaultLLMOS()`
3. 工厂支持按配置启停服务

## 10. 里程碑（Roadmap）

M1: Kernel + 三大核心域（P0）
1. 完成 `AppManager/FileService/ShellService` 统一接口
2. 接入 `PolicyEngine` 与 `Audit`
3. 交付最小可运行 `createLLMOSKernel`

M2: 系统能力扩展（P0 完整）
1. `NetService/StoreService/SchedulerService/SecurityService`
2. 事件与通知链路跑通

M3: 平台化能力（P1）
1. 插件市场与签名机制
2. UI 协议与媒体能力增强

M4: 高级能力（P2）
1. Host 传感器类能力插件
2. 多租户资源治理与配额系统完善

## 11. 验收标准（Definition of Done）
1. 三大核心域具备统一接口、权限控制、审计日志
2. 任一应用可通过 Manifest 声明能力并被系统验证
3. 关键服务具备集成测试（成功路径 + 权限拒绝 + 超时中止）
4. 所有服务可通过 CTP tool 形式稳定调用
5. 文档、类型定义、导出入口一致且可被外部包消费

## 12. 下一步实施顺序（建议）
1. 先实现 `kernel + app-manager`，建立治理中枢
2. 将现有 `file-manager/bash` 迁入 `file-service/shell-service` 并适配统一上下文（已完成并移除遗留目录）
3. 补齐 `PolicyEngine + Audit`，再扩展网络与存储服务
