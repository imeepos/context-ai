# LLM OS V1.0 顶级技术方案（最终修正版）

## 0. 共识基线（来自本轮讨论，作为硬约束）
1. 人类与 LLM-OS 的核心交互是文字：`Text In -> Text Out`。
2. LLM-OS 使用应用的核心路径是：
   `LLM 调用应用提供的 CTP JSX -> 渲染工具与上下文 -> model.run(systemContext, taskGoal, tools)`。
3. 系统之外的业务功能全部由应用提供；OS 负责编排与运行时治理。
4. 应用入口必须提供 `jsx(page)`（CTP 上下文页面），不是仅文件路径字符串。

## 1. 回答三个核心问题（统一定义）

### 1.1 应用是什么
- 应用是“给 LLM-OS 编排调用的能力插件”，不是给人直接操作的 UI 程序。
- 应用最小组成：
1. `CTP JSX Page`（上下文入口）
2. `Tool Set`（可调用工具 + schema）
3. `Policy`（权限/风险/副作用）
4. `Observability`（日志/事件/错误码/审计字段）

### 1.2 人类如何使用应用
- 人类不直接调用应用函数。
- 人类输入文本任务，LLM-OS 选择多个应用并编排执行，再以文本反馈结果和必要执行过程。

### 1.3 安装应用后系统新增什么
- 不只是 registry 记录，而是“能力增量”：
1. 新增可调用工具
2. 新增可渲染上下文页面
3. 新增策略边界
4. 新增观测维度
5. 新增可编排任务节点

## 2. 总体架构（Text-Native + CTP-Native）

```text
Human Text Input (CLI/UI/API 都是文本载体)
            |
            v
Task Gateway (text task)
            |
            v
Planner / Decomposer
  - task goal split
  - select apps
  - choose tools
            |
            v
CTP Render Runtime (from app jsx(page))
  - system context
  - tools
  - data views
            |
            v
Model Run Loop
  run(systemContext, taskGoal, tools)
            |
            v
OS Runtime Infrastructure
  - process/event/log/error/alert/retry/compensation
            |
            v
Text Result + Execution Summary
```

## 3. 运行主循环（核心中的核心）
1. 接收文本任务
2. 分解任务目标与约束
3. 选择应用集合
4. 调用应用提供的 CTP JSX 页面并渲染上下文与工具
5. 大模型执行 `run(systemContext, taskGoal, tools)`
6. 运行时收集事件、日志、错误、告警
7. LLM 基于运行时信息处理异常（重试、降级、换工具、补偿）
8. 循环直到完成或达到终止边界

终止边界（必须）：
1. `maxSteps`
2. `timeoutMs`
3. `budget`
4. `stopCondition`

## 4. 应用入口标准（强约束）

### 4.0 统一页面路由协议（新增）
- 每个应用页面必须有可解析路由，统一格式：
  `appId://pageId`
- 示例：
1. `todo://list`
2. `todo://detail`
3. `crm://customer_profile`

运行时统一调用：
```ts
render("todo://list") -> { prompt, tools, dataViews, metadata }
```

协议要求：
1. `appId` 必须与 manifest.id 一致。
2. `pageId` 必须在 `entry.pages` 中存在。
3. 全局路由唯一（不可冲突）。
4. 路由必须可直接用于快速渲染，不依赖额外人工拼接。

### 4.1 Manifest V1.0（修正版）
```ts
interface AppManifestV1 {
  id: string;
  name: string;
  version: string;
  entry: {
    pages: AppPageEntry[]; // 必填：一个或多个 CTP JSX page 入口
  };
  permissions: string[];
  metadata?: Record<string, string>;
  signing?: { keyId: string; signature: string };
}

interface AppPageEntry {
  id: string;           // 页面唯一标识
  route: string;        // 必填：如 todo://list
  name: string;         // 页面名称
  description: string;  // 页面用途描述
  path: string;         // JSX page 模块路径或注册键
  tags?: string[];
  default?: boolean;    // 默认入口页
}
```

### 4.2 Entry 必须满足
1. `entry.pages` 必须至少包含一个 page。
2. 每个 page 都必须可被加载并成功 render。
3. 至少一个 page 标记为默认入口（`default: true`）或可推导默认页。
4. 每个 page 必须提供合法且唯一的 `route`（`appId://pageId`）。
5. 工具属于运行时渲染结果，不作为安装期静态清单强校验。
6. 不允许“仅注册 app 元数据、无可渲染 page”。

### 4.3 Runtime Tool Contract（渲染期）
- 工具由 `entry.pages` 渲染后动态给出（CTP `tools`）。
- 校验时机：运行时执行前（policy + schema + permission），而非安装时静态枚举。

## 5. 安装增量契约（Install Delta Contract）

### 5.1 安装结果必须返回
```ts
interface AppInstallDeltaReport {
  appId: string;
  version: string;
  addedPages: string[];          // 新增 CTP JSX 页面入口
  addedPolicies: string[];       // 新增策略约束
  addedObservability: string[];  // 新增审计/指标/告警维度
  rollbackToken: string;
}
```

### 5.2 判定规则
- `addedPages` 为空 -> 默认拒绝安装（无能力增量）。

## 6. OS 与 App 的职责边界

### 6.1 OS 负责
1. 文本任务接入与分解
2. 应用选择与工具编排
3. 运行时基础设施：进程、事件、日志、错误、告警、重试、补偿
4. 安全治理：权限、策略、审批、配额、审计

### 6.2 App 负责
1. 提供 CTP JSX page（上下文页面）
2. 在页面渲染时动态提供可调用工具与 schema
3. 提供领域数据视图和示例
4. 提供错误语义与恢复建议

## 7. V1.0 里程碑（按依赖顺序）

### M1 Text Task Runtime
- [x] `task.submit(text)` 统一入口（CLI/UI/API 归一）
- [x] `task.decompose` 任务拆解器
- [x] `task.loop`（maxSteps/timeout/budget/stopCondition）

### M2 App Entry 升级（JSX Page First）
- [x] `AppManifestV1`（`entry.pages[]` 强校验）
- [x] `route-registry`（`appId://pageId` 注册、冲突检测、反查）
- [x] `app.page.render`（加载并渲染 CTP JSX 页面）
- [x] `runtime.tools.validate`（运行前 schema/permission 校验）

### M3 Planner + Orchestration
- [x] `planner.selectApps`（基于任务目标选择应用）
- [x] `planner.composeTools`（多应用工具编排）
- [x] `runner.executePlan`（工具执行 + 失败恢复循环）

### M4 Install Delta + Governance
- [x] `system.app.install.report`
- [x] `system.app.delta`
- [x] 空增量安装拒绝策略 + `force` 开关
- [x] 审计/指标/告警接入安装增量

## 8. DoD（V1.0）
1. 任一入口（CLI/UI/API）提交文本任务，执行链一致。
2. 每个应用都必须通过 `entry.pages[]` 渲染与工具契约校验。
3. 任务执行必须走“选择应用 -> CTP render -> model run -> runtime loop”链路。
4. 每次安装都能输出系统能力增量报告。
5. Vitest 覆盖关键链路（install/render/plan/run/recover/report）。

## 9. Next 10（立即执行）
1. [x] 新增 `AppManifestV1` 与迁移适配器（旧 `entry: string` -> `entry.pages[]`）
2. [x] 实现 `app.page.render` 服务
3. [x] 实现 `route-registry` 与 `render(route)` 入口
4. [x] 实现 `runtime.tools.validate` 服务
5. [x] 实现 `task.submit` 文本任务入口
6. [x] 实现 `planner.selectApps`
7. [x] 实现 `planner.composeTools`
8. [x] 实现 `runner.executePlan`（含失败恢复）
9. [x] 实现 `system.app.install.report`
10. [x] 增加端到端测试：`text task -> render(todo://list) -> orchestration -> text result`

## 10. 详细开发 TODO LIST（执行版）

### P0 基础契约（已完成）
- [x] 定义 `AppManifestV1`、`AppPageEntry`、`AppEntryV1`
- [x] 增加旧版 manifest 迁移函数（`entry: string` -> `entry.pages[]`）
- [x] 增加 route 协议校验（`appId://pageId`）
- [x] 安装期校验：pages 非空、route 唯一、默认页规则
- [x] 增加单测：合法/非法/冲突/迁移

### P1 路由与渲染
- [x] `route-registry`（注册、冲突检测、查找、卸载）
- [x] `app.page.render(route)` 服务
- [x] `render(route)` 快速入口
- [x] 渲染返回标准化（`prompt/tools/dataViews/metadata`）
- [x] 增加单测：路由成功/不存在/冲突

### P2 安装流水线
- [x] `app.install.v1` 安装流程（鉴权、验签、校验、注册）
- [x] 安装回滚令牌
- [x] `AppInstallDeltaReport`
- [x] 空增量拒绝 + `force` 覆盖
- [x] 增加集成测试：安装成功/失败/回滚令牌

### P3 文本任务入口
- [x] `task.submit(text)` 入口
- [x] `task.decompose`
- [x] `task.loop`（maxSteps/timeout/budget/stopCondition）
- [x] 统一响应（`result/meta/audit/summary`）
- [x] 增加测试：终止边界与正常完成

### P4 编排执行
- [x] `planner.selectApps`
- [x] `planner.composeTools`
- [x] `runner.executePlan`
- [x] 异常恢复（重试/降级/补偿）
- [x] 增加测试：多应用协作与恢复

### P5 治理与可观测
- [x] `runtime.tools.validate`（运行前）
- [x] 风险确认（low/medium/high）
- [x] 审计/指标/事件/告警贯通
- [x] 导出完整性（`signature + contentSha256`）
- [x] 增加测试：拒绝路径与审计可追溯
