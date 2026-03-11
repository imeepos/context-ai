# Bug 修复系统 - 完整实现

## 概述

实现了一个完整的自动化 Bug 修复系统，能够捕获、存储和智能修复系统中的所有错误。

## 架构设计

### 1. 数据层 (Database Layer)

#### BugReport Entity
位置：`packages/os-v1/src/addons/coding/entities/bug-report.entity.ts`

完整的 Bug 报告实体，包含：
- **错误信息**：`error_message`, `error_stack`, `error_type`
- **错误来源**：`source` (action | global | manual)
- **状态管理**：`status` (pending | fixing | fixed | failed | ignored)
- **修复追踪**：`fix_attempts`, `fix_method`, `fix_model`, `fix_result`
- **元数据**：`severity`, `tags`, `context`, `file_path`, `line_number`
- **时间戳**：`created_at`, `updated_at`, `fixed_at`, `last_fix_attempt_at`

### 2. 服务层 (Service Layer)

#### BugReportService
位置：`packages/os-v1/src/addons/coding/services/bug-report.service.ts`

提供完整的 CRUD 操作和统计功能：

**CRUD 操作**：
- `createBugReport()` - 创建新的 Bug 报告
- `listBugReports(filters?)` - 列出所有 Bug（支持按状态、严重程度、来源过滤）
- `getBugReport(id)` - 获取单个 Bug
- `updateBugStatus(id, status)` - 更新 Bug 状态
- `recordFixAttempt(id, method, model, result)` - 记录修复尝试
- `deleteBugReport(id)` - 删除 Bug

**统计查询**：
- `getBugStats()` - 获取完整统计信息
- `getRecentBugs(limit)` - 获取最近的 Bug
- `getBugsByExecutionId(executionId)` - 按执行 ID 查找

### 3. 展示层 (Presentation Layer)

#### Bugfix Page
位置：`packages/os-v1/src/addons/coding/bugfix.tsx`

React-based 终端 UI 页面，提供：

**统计面板**：
- 总 Bug 数
- 状态分布（pending, fixing, fixed, failed, ignored）
- 严重程度分布（critical, high, medium, low）
- 来源分布（action, global, manual）
- 修复成功率

**Bug 列表**：
- 表格展示所有 Bug
- 支持按状态和严重程度过滤
- 显示 ID、状态、严重程度、来源、错误信息、修复尝试次数等

**交互工具**：
- `viewBugDetail` - 查看 Bug 完整详情（包括堆栈、上下文）
- `autoFixBug` - 智能自动修复（AI 选择 Claude 或 Codex）
- `fixWithClaude` - 强制使用 Claude 修复（开发中）
- `fixWithCodex` - 强制使用 Codex 修复（开发中）
- `updateBugStatus` - 手动更新 Bug 状态

### 4. 自动捕获层 (Auto-Capture Layer)

#### GlobalErrorHandler (增强版)
位置：`packages/os-v1/src/core/global-error-handler.ts`

**新增功能**：
- 自动将捕获的全局错误保存到数据库
- 智能判断错误严重程度（critical, high, medium, low）
- 自动标记错误来源（global）和标签（auto-captured）

#### AutoRecoveryService (增强版)
位置：`packages/os-v1/src/core/auto-recovery.service.ts`

**新增功能**：
- 自动创建 Bug 报告当 Action 失败时
- 记录每次修复尝试的结果
- 更新 Bug 状态（fixing → fixed/failed）
- 关联 Bug 报告 ID 到恢复记录

## 智能修复决策

### AI 自动选择策略

在 `autoFixBug` 工具中实现：

```typescript
const shouldUseClaude =
    bug.severity === 'critical' ||
    bug.severity === 'high' ||
    (bug.error_message?.includes('logic') ||
     bug.error_message?.includes('design') ||
     bug.error_message?.includes('architecture'));

const method = shouldUseClaude ? 'claude' : 'codex';
```

**决策规则**：
- **使用 Claude**：
  - 严重程度为 critical 或 high
  - 错误信息包含 logic/design/architecture 关键词
  - 适合复杂推理和架构问题

- **使用 Codex**：
  - 严重程度为 medium 或 low
  - 语法、类型类错误
  - 适合快速修复

## 数据流

### 错误捕获流程

```
1. 错误发生
   ├─ Action 执行失败 → ACTION_FAILED_EVENT
   └─ 全局错误（uncaughtException/unhandledRejection）→ GlobalErrorHandler

2. Bug 报告创建
   ├─ GlobalErrorHandler → BugReportService.createBugReport()
   └─ AutoRecoveryService → BugReportService.createBugReport()

3. 自动修复触发
   └─ AutoRecoveryService → Codex 执行修复

4. 修复结果记录
   └─ BugReportService.recordFixAttempt()
        ├─ success: true → status = 'fixed'
        └─ success: false → status = 'failed' (if max attempts reached)
```

### 手动修复流程

```
1. 用户访问 coding://bugfix 页面

2. 查看 Bug 列表和统计

3. 选择 Bug 执行操作：
   ├─ viewBugDetail → 查看完整错误信息
   ├─ autoFixBug → AI 智能修复
   ├─ fixWithClaude → 强制 Claude 修复
   ├─ fixWithCodex → 强制 Codex 修复
   └─ updateBugStatus → 手动更新状态

4. 修复结果自动保存到数据库
```

## 注册与集成

### 1. Entity 注册
在 `packages/os-v1/src/addons/coding/index.ts`：

```typescript
entities: [
    BugReport
]
```

### 2. Service 注册
在 `packages/os-v1/src/addons/coding/index.ts`：

```typescript
providers: [
    { provide: BugReportService, useClass: BugReportService },
    { provide: ENTITIES, useValue: BugReport, multi: true }
]
```

### 3. Page 注册
在 `packages/os-v1/src/addons/coding/index.ts`：

```typescript
pages: [
    {
        name: 'coding-bugfix',
        description: 'Bug 报告管理系统...',
        path: 'coding://bugfix',
        props: BugfixPropsSchema,
        factory: BugfixFactory
    }
]
```

### 4. 依赖注入
- GlobalErrorHandler：`@Optional(BugReportService)`
- AutoRecoveryService：`@Optional(BugReportService)`

使用 `@Optional()` 确保如果 BugReportService 不可用，系统仍能正常运行。

## 使用示例

### 访问 Bugfix 页面

```typescript
// 查看所有 Bug
await loop({ path: 'coding://bugfix' })

// 按状态过滤
await loop({ path: 'coding://bugfix', status: 'pending' })

// 按严重程度过滤
await loop({ path: 'coding://bugfix', severity: 'critical' })

// 组合过滤
await loop({ path: 'coding://bugfix', status: 'failed', severity: 'high' })
```

### 查看 Bug 详情

```
Tool: viewBugDetail
Parameters: { bugId: "abc12345" }
```

### 智能修复 Bug

```
Tool: autoFixBug
Parameters: {
  bugId: "abc12345",
  reason: "This bug is blocking the deployment"
}
```

## 配置

### GlobalErrorHandler 配置

在 `main.ts` 或 bootstrap 中：

```typescript
const globalErrorHandler = injector.get(GlobalErrorHandler);
globalErrorHandler.install({
    enabled: true,
    captureUnhandledRejection: true,
    captureUncaughtException: true,
    exitOnError: false,
    exitDelayMs: 30000  // 30 秒
});
```

### AutoRecoveryService 配置

```typescript
const autoRecovery = injector.get(AutoRecoveryService);
autoRecovery.start({
    enabled: true,
    maxRetries: 3,
    excludedActions: ['codex.execute', 'claude.execute'],
    codexModel: 'claude-sonnet-4.5',
    codexTimeout: 300000  // 5 分钟
});
```

## 统计信息

通过 `BugReportService.getBugStats()` 获取：

```typescript
{
    total: number,              // 总 Bug 数
    pending: number,            // 待处理
    fixing: number,             // 修复中
    fixed: number,              // 已修复
    failed: number,             // 修复失败
    ignored: number,            // 已忽略
    bySeverity: {
        critical: number,
        high: number,
        medium: number,
        low: number
    },
    bySource: {
        action: number,
        global: number,
        manual: number
    },
    fixSuccessRate: number     // 修复成功率（%）
}
```

## 数据库表结构

### bug_report 表

| 字段 | 类型 | 说明 |
|------|------|------|
| id | uuid | 主键 |
| error_message | text | 错误消息 |
| error_stack | text | 错误堆栈 |
| error_type | varchar(100) | 错误类型 |
| source | varchar(50) | 来源 (action/global/manual) |
| token | varchar(255) | Action Token |
| execution_id | varchar(100) | 执行 ID |
| status | varchar(50) | 状态 (pending/fixing/fixed/failed/ignored) |
| context | simple-json | 上下文信息 (JSON) |
| file_path | text | 错误文件路径 |
| line_number | integer | 错误行号 |
| fix_attempts | integer | 修复尝试次数 |
| fix_method | varchar(50) | 修复方法 (claude/codex/manual/auto) |
| fix_model | varchar(100) | 使用的模型 |
| fix_result | simple-json | 修复结果 (JSON) |
| severity | varchar(50) | 严重程度 (critical/high/medium/low) |
| auto_fixable | boolean | 是否可自动修复 |
| tags | simple-json | 标签 (JSON Array) |
| created_at | datetime | 创建时间 |
| updated_at | datetime | 更新时间 |
| fixed_at | datetime | 修复时间 |
| last_fix_attempt_at | datetime | 最后修复尝试时间 |

## 测试

建议添加以下测试：

1. **单元测试**：
   - BugReportService CRUD 操作
   - 统计功能准确性
   - 严重程度判断逻辑

2. **集成测试**：
   - GlobalErrorHandler 自动捕获
   - AutoRecoveryService 自动修复
   - Bug 报告创建和更新流程

3. **E2E 测试**：
   - Bugfix 页面渲染
   - Bug 列表过滤
   - 修复工具执行

## 未来改进

1. **手动修复工具完善**：
   - 完成 `fixWithClaude` 工具实现
   - 完成 `fixWithCodex` 工具实现

2. **AI 决策优化**：
   - 基于历史修复成功率动态调整
   - 学习最佳修复策略

3. **批量操作**：
   - 批量修复相似 Bug
   - 批量更新状态

4. **高级过滤**：
   - 按时间范围过滤
   - 按标签过滤
   - 全文搜索

5. **可视化增强**：
   - Bug 趋势图表
   - 修复成功率趋势
   - 热点错误分析

## 总结

完整实现了从错误捕获、存储、展示到智能修复的闭环系统：

✅ **数据层**：完整的 BugReport Entity
✅ **服务层**：全功能的 BugReportService
✅ **展示层**：交互式的 Bugfix Page
✅ **自动捕获**：GlobalErrorHandler 和 AutoRecoveryService 集成
✅ **智能修复**：AI 自动选择 Claude 或 Codex
✅ **类型安全**：TypeScript 严格类型检查通过
✅ **构建成功**：无编译错误

系统已准备好投入使用！
