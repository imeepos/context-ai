# @context-ai/os 应用开发指导手册

## 目录

1. [项目概述](#1-项目概述)
2. [架构设计](#2-架构设计)
3. [核心概念](#3-核心概念)
4. [快速开始](#4-快速开始)
5. [应用开发指南](#5-应用开发指南)
6. [服务开发指南](#6-服务开发指南)
7. [系统服务参考](#7-系统服务参考)
8. [测试指南](#8-测试指南)
9. [最佳实践](#9-最佳实践)

---

## 1. 项目概述

`@context-ai/os` 是一个 LLM 驱动的 OS 能力层，为 CTP (Context Protocol) 框架提供统一的系统服务编排。它将操作系统能力（文件、Shell、网络等）抽象为服务接口，通过内核进行治理和调度。

### 1.1 主要特性

- **内核治理**: 统一的权限管理、策略引擎、审计日志、指标收集
- **应用管理**: 完整的应用生命周期管理（安装、升级、回滚、卸载）
- **服务化架构**: 所有能力通过 `OSService` 接口封装，支持依赖注入
- **沙箱安全**: 文件路径沙箱、命令执行策略、网络访问控制
- **可观测性**: 全面的审计日志、性能指标、错误追踪、健康检查

### 1.2 模块概览

```
src/
├── kernel/           # 内核 - 系统治理中枢
├── app-manager/      # 应用管理 - 生命周期与路由
├── file-service/     # 文件服务 - 读写查找编辑
├── shell-service/    # Shell 服务 - 命令执行
├── net-service/      # 网络服务 - HTTP 请求与熔断
├── store-service/    # 存储服务 - KV 存储
├── scheduler-service/# 调度服务 - 定时任务
├── system-service/   # 系统服务 - 监控告警治理
├── task-runtime/     # 任务运行时 - 任务分解与执行
├── planner/          # 规划器 - 应用选择与工具编排
└── llm-os.ts         # 默认 LLM OS 工厂
```

---

## 2. 架构设计

### 2.1 分层架构

```
┌─────────────────────────────────────────────────────────────┐
│                      Application Layer                      │
│              (应用实现页面渲染、业务逻辑)                      │
├─────────────────────────────────────────────────────────────┤
│                       Service Layer                         │
│  file.read/write  shell.execute  store.get/set  net.request │
├─────────────────────────────────────────────────────────────┤
│                      Kernel Layer                           │
│  ServiceRegistry │ PolicyEngine │ AuditLog │ EventBus       │
│  PermissionCheck │ ResourceGovernor │ Metrics │ Logger       │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 核心组件

#### 2.2.1 LLMOSKernel (内核)

内核是系统的治理中枢，负责：

- **服务注册**: 通过 `ServiceRegistry` 管理服务
- **权限检查**: 通过 `PolicyEngine` 验证权限
- **资源治理**: 通过 `ResourceGovernor` 控制配额和限流
- **审计记录**: 通过 `AuditLog` 记录所有操作
- **事件总线**: 通过 `EventBus` 发布订阅事件
- **指标收集**: 通过 `KernelMetrics` 收集性能指标

```typescript
import { createLLMOSKernel } from "@context-ai/os";

const kernel = createLLMOSKernel({
  policyEngine: customPolicyEngine,      // 可选：自定义策略引擎
  logger: customLogger,                  // 可选：自定义日志
  resourceGovernor: customGovernor,      // 可选：自定义资源治理器
});
```

#### 2.2.2 AppManager (应用管理)

应用管理器负责应用的全生命周期：

- **注册表**: 维护已安装应用的清单
- **路由系统**: 管理 `appId://pageId` 格式的路由
- **生命周期**: 状态机管理 (installed -> resolved -> active -> running)
- **配额管理**: 控制应用的资源使用
- **回滚支持**: 支持安装/升级后的回滚操作

### 2.3 服务接口

所有服务必须实现 `OSService<Request, Response>` 接口：

```typescript
export interface OSService<Request, Response> {
  name: string;                          // 服务唯一名称
  requiredPermissions?: string[];        // 所需权限
  dependencies?: string[];               // 依赖的其他服务
  execute(req: Request, ctx: OSContext): Promise<Response>;
}
```

---

## 3. 核心概念

### 3.1 OSContext (执行上下文)

每次服务执行都携带上下文信息：

```typescript
interface OSContext {
  appId: string;           // 调用方应用 ID
  sessionId: string;       // 会话 ID
  permissions: string[];   // 已授予的权限列表
  workingDirectory: string;// 工作目录
  traceId?: string;        // 追踪 ID (用于链路追踪)
  tenantId?: string;       // 租户 ID (多租户场景)
}
```

### 3.2 权限系统

权限采用冒号分隔的层级命名：

- `app:manage` - 应用管理权限
- `app:read` - 应用读取权限
- `file:read` - 文件读取权限
- `file:write` - 文件写入权限
- `shell:exec` - Shell 执行权限
- `store:read` - 存储读取权限
- `store:write` - 存储写入权限
- `system:read` - 系统服务读取权限

### 3.3 错误码

系统定义了标准化的错误码：

| 错误码 | 说明 |
|--------|------|
| `E_PERMISSION_DENIED` | 权限被拒绝 |
| `E_POLICY_DENIED` | 策略拒绝 |
| `E_SERVICE_NOT_FOUND` | 服务未找到 |
| `E_SERVICE_EXECUTION` | 服务执行失败 |
| `E_VALIDATION_FAILED` | 参数校验失败 |
| `E_DEPENDENCY_ERROR` | 依赖错误 |
| `E_EXTERNAL_FAILURE` | 外部调用失败 |
| `E_QUOTA_EXCEEDED` | 配额超限 |
| `E_APP_NOT_REGISTERED` | 应用未注册 |
| `E_NET_CIRCUIT_OPEN` | 网络熔断器开启 |

### 3.4 应用清单 (AppManifest)

应用清单定义应用的结构和元数据：

```typescript
interface AppManifestV1 {
  id: string;              // 应用唯一标识
  name: string;            // 应用名称
  version: string;         // 版本号
  entry: {
    pages: AppPageEntry[]; // 页面入口列表
  };
  permissions: string[];   // 申请的权限列表
  metadata?: Record<string, string>; // 元数据
  signing?: {              // 签名信息
    keyId: string;
    signature: string;
  };
}

interface AppPageEntry {
  id: string;              // 页面 ID
  route: string;           // 路由 (格式: appId://pageId)
  name: string;            // 页面名称
  description: string;     // 页面描述
  path: string;            // 页面实现路径
  tags?: string[];         // 标签
  default?: boolean;       // 是否为默认页面
}
```

---

## 4. 快速开始

### 4.1 安装与构建

```bash
# 安装依赖
npm install

# 构建项目
npm run build -w @context-ai/os

# 运行测试
npm run test -w @context-ai/os
```

### 4.2 创建默认 LLM OS 实例

```typescript
import { createDefaultLLMOS } from "@context-ai/os";

const os = createDefaultLLMOS({
  // 文件路径策略
  pathPolicy: {
    allow: [process.cwd()],
    deny: ["/etc", "/usr"]
  },
  // 包签名密钥 (可选)
  packageSigningSecret: "optional-signing-secret",
  // 网络日志限制
  netJournalLimit: 1000,
  // 通知去重窗口
  notificationDedupeWindowMs: 1000,
  // 通知速率限制
  notificationRateLimit: { limit: 20, windowMs: 60_000 },
  // 通知保留限制
  notificationRetentionLimit: 5000,
  // 启用/禁用特定服务
  enabledServices: {
    "package.install": true,
    "host.execute": true,
  },
});
```

### 4.3 执行基本操作

```typescript
// 1) 先安装应用（默认内核会校验 app 是否已注册）
const installerContext = {
  appId: "app.demo",
  sessionId: "session-1",
  permissions: ["app:manage"],
  workingDirectory: process.cwd(),
};

await os.kernel.execute("app.install", {
  manifest: {
    id: "app.demo",
    name: "Demo",
    version: "1.0.0",
    entry: "index.js",
    permissions: ["file:read", "file:write", "store:read", "store:write", "shell:exec"],
  },
}, installerContext);

// 2) 使用已授权上下文执行业务服务
const context = {
  appId: "app.demo",
  sessionId: "session-1",
  permissions: ["file:read", "file:write", "store:read", "store:write", "shell:exec"],
  workingDirectory: process.cwd(),
};

// 文件操作
const content = await os.kernel.execute("file.read", { path: "./test.txt" }, context);
await os.kernel.execute("file.write", { path: "./output.txt", content: "Hello" }, context);

// 存储操作
await os.kernel.execute("store.set", { key: "name", value: "World" }, context);
const value = await os.kernel.execute("store.get", { key: "name" }, context);

// Shell 执行
const result = await os.kernel.execute("shell.execute", {
  command: "ls -la",
  timeoutMs: 5000
}, context);
console.log(result.stdout);
```

---

## 5. 应用开发指南

### 5.1 创建应用清单

```typescript
const manifest = {
  id: "app.myapp",
  name: "My Application",
  version: "1.0.0",
  entry: {
    pages: [
      {
        id: "main",
        route: "app.myapp://main",
        name: "Main Page",
        description: "Main entry page",
        path: "./pages/main.js",
        default: true,
      },
      {
        id: "settings",
        route: "app.myapp://settings",
        name: "Settings",
        description: "Settings page",
        path: "./pages/settings.js",
      },
    ],
  },
  permissions: ["file:read", "store:read", "store:write"],
};
```

### 5.2 安装应用

```typescript
// 安装应用
const result = await os.kernel.execute("app.install", {
  manifest,
  quota: {
    maxTokens: 100000,
    maxToolCalls: 1000,
  },
}, context);

// 返回安装报告
console.log(result.report);
// {
//   appId: "app.myapp",
//   version: "1.0.0",
//   addedPages: ["app.myapp://main", "app.myapp://settings"],
//   addedPolicies: ["file:read", "store:read", "store:write"],
//   addedObservability: ["audit:app.myapp", "metrics:app.myapp", "events:app.myapp"],
//   rollbackToken: "app.myapp@1.0.0:xxx"
// }
```

### 5.3 页面渲染

应用需要提供页面渲染器：

```typescript
import { render as renderCTP } from "@context-ai/ctp";

const renderer = {
  render: async ({ appId, page, context }) => {
    // 加载页面实现
    const pageModule = await import(page.path);

    // 使用 CTP JSX 渲染，产出 prompt/tools/dataViews/metadata
    const ctpNode = await pageModule.getContext({ appId, page, context });
    const ctpRendered = await renderCTP(ctpNode);

    return {
      prompt: ctpRendered.prompt,
      tools: ctpRendered.tools,
      dataViews: ctpRendered.dataViews,
      metadata: ctpRendered.metadata,
    };
  },
};

// 自建 kernel 时注册渲染服务（createDefaultLLMOS 已内置 app.page.render / render）
kernel.registerService(createAppPageRenderService(appManager, renderer));

// 渲染页面
const rendered = await os.kernel.execute("app.page.render", {
  route: "app.myapp://main"
}, context);
```

### 5.4 应用升级与回滚

```typescript
// 升级应用
await os.kernel.execute("app.upgrade", {
  manifest: { ...manifest, version: "1.1.0" }
}, context);

// 回滚到上一版本
await os.kernel.execute("app.install.rollback", {
  appId: "app.myapp",
  rollbackToken: result.report.rollbackToken,
}, context);
```

### 5.5 应用生命周期管理

```typescript
// 查看应用状态
const list = await os.kernel.execute("app.list", { _: "list" }, context);

// 设置应用状态
await os.kernel.execute("app.state.set", {
  appId: "app.myapp",
  state: "suspended",  // installed, resolved, active, running, suspended, stopped
}, context);

// 禁用/启用应用
await os.kernel.execute("app.disable", { appId: "app.myapp" }, context);
await os.kernel.execute("app.enable", { appId: "app.myapp" }, context);

// 卸载应用
await os.kernel.execute("app.uninstall", { appId: "app.myapp" }, context);
```

---

## 6. 服务开发指南

### 6.1 创建自定义服务

```typescript
import type { OSService, OSContext } from "@context-ai/os";

// 定义请求和响应类型
interface MyServiceRequest {
  input: string;
  options?: {
    flag?: boolean;
  };
}

interface MyServiceResponse {
  result: string;
  processedAt: string;
}

// 创建服务
function createMyService(): OSService<MyServiceRequest, MyServiceResponse> {
  return {
    name: "my.custom.service",
    requiredPermissions: ["my:permission"],
    dependencies: ["store.get"],  // 依赖其他服务
    execute: async (req, ctx: OSContext) => {
      // 实现服务逻辑
      const result = processInput(req.input, req.options);

      return {
        result,
        processedAt: new Date().toISOString(),
      };
    },
  };
}

// 注册服务
kernel.registerService(createMyService());

// 执行服务
const response = await kernel.execute("my.custom.service", {
  input: "test",
  options: { flag: true },
}, context);
```

### 6.2 服务依赖管理

```typescript
function createDependentService(): OSService<Request, Response> {
  return {
    name: "dependent.service",
    requiredPermissions: ["app:read"],
    dependencies: ["store.get", "file.read"],  // 声明依赖
    execute: async (req, ctx) => {
      // 内核确保依赖服务已注册
      // 可以安全地调用依赖服务
      const storeValue = await kernel.execute("store.get", { key: "data" }, ctx);
      const fileContent = await kernel.execute("file.read", { path: "./data.json" }, ctx);

      // 处理数据...
    },
  };
}
```

### 6.3 批量注册服务

```typescript
import { ServiceRegistry } from "@context-ai/os";

const services = [
  createFileReadService(fileService),
  createFileWriteService(fileService),
  createStoreGetService(storeService),
  createStoreSetService(storeService),
];

// 批量注册并自动解析依赖
kernel.services.registerMany(services);
```

---

## 7. 系统服务参考

### 7.1 文件服务

| 服务名 | 权限 | 描述 |
|--------|------|------|
| `file.read` | `file:read` | 读取文件内容 |
| `file.write` | `file:write` | 写入文件内容 |
| `file.list` | `file:read` | 列出目录内容 |
| `file.find` | `file:read` | 递归查找文件 |
| `file.grep` | `file:read` | 文件内容搜索 |
| `file.edit` | `file:write` | 文件内容替换 |

```typescript
// 文件读取
const { content } = await kernel.execute("file.read", { path: "./test.txt" }, ctx);

// 文件写入
await kernel.execute("file.write", { path: "./output.txt", content: "Hello" }, ctx);

// 目录列表
const { entries } = await kernel.execute("file.list", { path: "./" }, ctx);

// 文件查找
const { paths } = await kernel.execute("file.find", { path: "./src", nameContains: "test" }, ctx);

// 内容搜索
const { matches } = await kernel.execute("file.grep", { path: "./file.txt", pattern: "TODO" }, ctx);

// 内容编辑
const { changed } = await kernel.execute("file.edit", {
  path: "./file.txt",
  search: "old text",
  replace: "new text",
}, ctx);
```

### 7.2 Shell 服务

| 服务名 | 权限 | 描述 |
|--------|------|------|
| `shell.execute` | `shell:exec` | 执行命令 |
| `shell.env.set` | `shell:exec` | 设置环境变量 |
| `shell.env.unset` | `shell:exec` | 取消环境变量 |
| `shell.env.list` | `shell:exec` | 列出环境变量 |

```typescript
// 执行命令
const result = await kernel.execute("shell.execute", {
  command: "ls -la",
  timeoutMs: 5000,
  profile: "restricted",  // 执行策略
}, ctx);

// 环境变量管理
await kernel.execute("shell.env.set", { key: "MY_VAR", value: "123" }, ctx);
await kernel.execute("shell.env.unset", { key: "MY_VAR" }, ctx);
const { env } = await kernel.execute("shell.env.list", { _: "list" }, ctx);
```

### 7.3 存储服务

| 服务名 | 权限 | 描述 |
|--------|------|------|
| `store.get` | `store:read` | 读取键值 |
| `store.set` | `store:write` | 设置键值 |

```typescript
// 支持多种数据类型
type StoreValue = string | number | boolean | null | { [k: string]: StoreValue } | StoreValue[];

await kernel.execute("store.set", {
  key: "config",
  value: { theme: "dark", language: "zh" }
}, ctx);

const { value } = await kernel.execute("store.get", { key: "config" }, ctx);
```

### 7.4 网络服务

| 服务名 | 权限 | 描述 |
|--------|------|------|
| `net.request` | `net:request` | HTTP 请求 |

```typescript
const response = await kernel.execute("net.request", {
  url: "https://api.example.com/data",
  method: "GET",
  headers: { "Authorization": "Bearer token" },
}, ctx);
```

### 7.5 调度服务

| 服务名 | 权限 | 描述 |
|--------|------|------|
| `scheduler.scheduleOnce` | `scheduler:write` | 一次性任务 |
| `scheduler.scheduleInterval` | `scheduler:write` | 周期性任务 |
| `scheduler.cancel` | `scheduler:write` | 取消任务 |
| `scheduler.list` | `scheduler:read` | 列出任务 |

```typescript
// 一次性任务
await kernel.execute("scheduler.scheduleOnce", {
  id: "cleanup-task",
  executeAt: Date.now() + 60000,
  payload: { action: "cleanup" },
}, ctx);

// 周期性任务
await kernel.execute("scheduler.scheduleInterval", {
  id: "heartbeat",
  intervalMs: 30000,
  payload: { action: "ping" },
}, ctx);
```

### 7.6 通知服务

| 服务名 | 权限 | 描述 |
|--------|------|------|
| `notification.send` | `notification:write` | 发送通知 |
| `notification.list` | `notification:read` | 列出通知 |
| `notification.ack` | `notification:write` | 确认通知 |
| `notification.stats` | `notification:read` | 统计信息 |

### 7.7 系统监控服务

| 服务名 | 权限 | 描述 |
|--------|------|------|
| `system.health` | `system:read` | 健康检查 |
| `system.metrics` | `system:read` | 系统指标 |
| `system.audit` | `system:read` | 审计日志查询 |
| `system.routes` | `system:read` | 路由查询 |
| `system.errors` | `system:read` | 错误统计 |
| `system.snapshot` | `system:read` | 系统快照 |

```typescript
// 健康检查
const health = await kernel.execute("system.health", {}, ctx);
// { services: [...], metrics: [...] }

// 系统指标
const metrics = await kernel.execute("system.metrics", {}, ctx);
// { metrics: [...] }

// 审计查询
const audit = await kernel.execute("system.audit", {
  sessionId: "session-1",
  limit: 100,
}, ctx);

// 错误统计
const errors = await kernel.execute("system.errors", {
  windowMinutes: 30,
  limit: 200,
}, ctx);
// { byService: {...}, byErrorCode: {...}, topReasons: [...], recent: [...] }
```

### 7.8 告警服务

| 服务名 | 权限 | 描述 |
|--------|------|------|
| `system.alerts` | `system:read` | 查询告警 |
| `system.alerts.stats` | `system:read` | 告警统计 |
| `system.alerts.policy` | `system:read` | 告警策略 |
| `system.alerts.clear` | `system:write` | 清除告警 |

### 7.9 配额服务

| 服务名 | 权限 | 描述 |
|--------|------|------|
| `system.quota` | `system:read` | 配额查询 |
| `system.quota.adjust` | `system:write` | 调整配额 |
| `system.quota.hotspots` | `system:read` | 热点识别 |

### 7.10 回滚治理服务

| 服务名 | 权限 | 描述 |
|--------|------|------|
| `system.app.rollback.state.export` | `system:read` | 导出回滚状态 |
| `system.app.rollback.state.import` | `system:write` | 导入回滚状态 |
| `system.app.rollback.stats` | `system:read` | 回滚统计 |
| `system.app.rollback.gc` | `system:write` | 垃圾回收 |

---

## 8. 测试指南

### 8.1 单元测试

```typescript
import { describe, it, expect, beforeEach } from "vitest";
import { createLLMOSKernel } from "@context-ai/os";

describe("MyService", () => {
  let kernel: ReturnType<typeof createLLMOSKernel>;

  beforeEach(() => {
    kernel = createLLMOSKernel();
    kernel.registerService(createMyService());
  });

  it("should execute successfully", async () => {
    const context = {
      appId: "test",
      sessionId: "session-1",
      permissions: ["my:permission"],
      workingDirectory: process.cwd(),
    };

    const result = await kernel.execute("my.custom.service", {
      input: "test",
    }, context);

    expect(result.result).toBe("processed");
  });

  it("should fail without permission", async () => {
    const context = {
      appId: "test",
      sessionId: "session-1",
      permissions: [],  // 缺少权限
      workingDirectory: process.cwd(),
    };

    await expect(
      kernel.execute("my.custom.service", { input: "test" }, context)
    ).rejects.toThrow("Permission denied");
  });
});
```

### 8.2 集成测试

```typescript
import { describe, it, expect } from "vitest";
import { createDefaultLLMOS } from "@context-ai/os";

describe("FileService Integration", () => {
  it("should read and write files", async () => {
    const os = createDefaultLLMOS({
      pathPolicy: { allow: ["/tmp/test"], deny: [] }
    });

    const context = {
      appId: "test",
      sessionId: "session-1",
      permissions: ["file:read", "file:write"],
      workingDirectory: "/tmp/test",
    };

    // 写入文件
    await os.kernel.execute("file.write", {
      path: "/tmp/test/hello.txt",
      content: "Hello World",
    }, context);

    // 读取文件
    const { content } = await os.kernel.execute("file.read", {
      path: "/tmp/test/hello.txt",
    }, context);

    expect(content).toBe("Hello World");
  });
});
```

### 8.3 模拟依赖

```typescript
import { vi } from "vitest";

it("should mock external service", async () => {
  const mockExecute = vi.fn();
  mockExecute.mockResolvedValueOnce({ data: "mocked" });

  // 使用注入的 mock 执行器
  const service = createMyService(mockExecute);

  // 测试...
});
```

---

## 9. 最佳实践

### 9.1 权限设计

- **最小权限原则**: 只申请应用真正需要的权限
- **权限分组**: 将相关权限组织在一起管理
- **动态权限**: 敏感操作要求用户明确授权

```typescript
// 好的权限设计
const manifest = {
  permissions: [
    "file:read",     // 基础读取
    "store:read",
    "store:write",
  ],
};

// 运行时权限检查
function requirePermission(ctx: OSContext, permission: string): void {
  if (!ctx.permissions.includes(permission)) {
    throw new OSError("E_PERMISSION_DENIED", `Requires ${permission}`);
  }
}
```

### 9.2 错误处理

```typescript
import { OSError } from "@context-ai/os";

async function safeExecute() {
  try {
    return await kernel.execute("service.name", request, context);
  } catch (error) {
    if (error instanceof OSError) {
      switch (error.code) {
        case "E_PERMISSION_DENIED":
          // 处理权限错误
          break;
        case "E_QUOTA_EXCEEDED":
          // 处理配额超限
          break;
        default:
          // 处理其他错误
      }
    }
    throw error;
  }
}
```

### 9.3 资源管理

```typescript
// 使用配额限制资源使用
const quota = {
  maxTokens: 100000,
  maxToolCalls: 1000,
};

await kernel.execute("app.install", { manifest, quota }, context);

// 监控资源使用
const stats = await kernel.execute("system.quota", { appId: "app.myapp" }, context);
```

### 9.4 日志与审计

```typescript
// 所有操作自动记录审计日志
const { result, meta } = await kernel.executeWithMeta("service.name", request, context);

// 使用 traceId 追踪调用链
console.log(`Trace ID: ${meta.traceId}`);

// 查询审计记录
const audit = await kernel.execute("system.audit", { traceId: meta.traceId }, context);
```

### 9.5 性能优化

```typescript
// 批量操作减少调用次数
const results = await Promise.all([
  kernel.execute("store.get", { key: "key1" }, ctx),
  kernel.execute("store.get", { key: "key2" }, ctx),
  kernel.execute("store.get", { key: "key3" }, ctx),
]);

// 使用缓存减少重复计算
const cache = new Map();
async function cachedExecute(service: string, request: unknown, ctx: OSContext) {
  const key = JSON.stringify({ service, request });
  if (cache.has(key)) return cache.get(key);

  const result = await kernel.execute(service, request, ctx);
  cache.set(key, result);
  return result;
}
```

### 9.6 安全实践

1. **路径验证**: 始终验证文件路径，防止目录遍历攻击
2. **命令注入防护**: 使用参数化命令，避免字符串拼接
3. **输入验证**: 对所有用户输入进行验证
4. **敏感数据脱敏**: 日志和审计中不要记录敏感信息

```typescript
// 路径验证
function sanitizePath(inputPath: string): string {
  const resolved = resolve(inputPath);
  if (!resolved.startsWith(allowedBasePath)) {
    throw new OSError("E_POLICY_DENIED", "Path not allowed");
  }
  return resolved;
}

// 命令参数化
const safeCommand = `grep "${escapeShellArg(pattern)}" "${escapeShellArg(filePath)}"`;
```

---

## 附录

### A. 类型定义

```typescript
// 导出所有类型
export type {
  OSContext,
  OSService,
  OSAuditRecord,
  OSErrorCode,
  OSExecutionMeta,
  AppManifest,
  AppManifestV1,
  AppPageEntry,
  AppQuota,
  AppInstallRequest,
  AppInstallDeltaReport,
  StoreValue,
  FileReadRequest,
  FileWriteRequest,
  ShellExecuteRequest,
  ShellExecutionResult,
  // ... 更多类型
} from "@context-ai/os";
```

### B. 变更日志

当前包未单独维护 `CHANGELOG.md`，请以 Git 提交历史和 README 的“破坏性变更”章节为准。

### C. 相关资源

- [README.md](./README.md) - 项目概览和快速开始
- [TODO.md](./TODO.md) - 开发计划和里程碑
- [TODO_V1.0.md](./TODO_V1.0.md) - V1.0 顶级技术方案与执行清单

---

**版本**: 0.1.0
**最后更新**: 2026-03-06
