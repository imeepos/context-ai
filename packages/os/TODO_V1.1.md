# LLM OS V1.1 重构方案（基于 `@context-ai/core` 依赖注入）

## 0. 目标

V1.1 的核心目标不是继续给 `llm-os.ts` 增加手工 wiring，而是把 `@context-ai/os` 重构成一个基于 `@context-ai/core` 的层次化运行时：

1. `osInjector` 负责 OS 全局基础设施与共享服务。
2. `appInjector` 负责应用级隔离与应用私有配置。
3. `pageInjector` 负责单次页面渲染 / 单次任务执行的请求级上下文。
4. OS 内部不再大面积 `new XxxService()` 手工组装，而是由 Injector 管理依赖关系、生命周期和作用域。
5. 继续保留现有 `Token<Request, Response, Name>` 的 service token 体系。

目标调用形态：

```ts
const osInjector = createOSInjector(options);
const appInjector = createInjector(appProviders, osInjector, "application");
const pageInjector = createInjector(pageProviders, appInjector, "feature");
```

以及：

```ts
const system = pageInjector.get(SYSTEM_EXECUTOR);
await system.execute(FILE_READ, { path: "a.txt" }, pageContext);
```

## 1. 现状问题

当前 `@context-ai/os` 的主要问题：

1. `packages/os/src/llm-os.ts` 是巨型 composition root，手工 new 了几乎所有服务。
2. `createDefaultLLMOS()` 既负责创建基础设施，又负责注册服务，又负责事件订阅，又负责默认 system app 安装，职责过重。
3. 应用 / 页面上下文没有真正变成注入器作用域，而是通过函数参数和局部 bridge 透传。
4. 页面运行时、任务运行时、planner fallback runtime 都在重复拼装 `system.execute` 包装器。
5. app / page 级上下文没有统一 token 化，无法充分利用父子 injector 的隔离、覆盖和缓存。
6. 目前 service 级类型安全已经完成，但运行时实例图仍然是手工维护，不利于继续演进。

## 2. 设计原则

### 2.1 单一职责

- `@context-ai/core` 负责注入器、provider、生命周期、层级隔离。
- `@context-ai/os` 负责 OS 域模型、服务定义、策略和运行时编排。

### 2.2 显式作用域

- OS 共享状态必须放在 `osInjector`
- App 私有状态必须放在 `appInjector`
- Request / Page / Trace 上下文必须放在 `pageInjector`

### 2.3 Token First

- service 调用继续统一使用 `packages/os/src/tokens.ts`
- runtime context 也必须引入 `InjectionToken`
- 不建议直接把裸对象挂进 injector，然后在任意地方通过字符串键读取

### 2.4 渐进迁移

V1.1 允许保留一部分函数式 service factory，但它们的依赖必须从 injector 中取得，而不是上层手工传参。

## 3. 目标架构

### 3.1 注入器层级

```text
NULL_INJECTOR
    ↓
osInjector        // OS 全局共享层
    ↓
appInjector       // 每个 app 一个
    ↓
pageInjector      // 每次 render / task / request 一个
```

### 3.2 各层职责

#### `osInjector`

放置全局共享单例：

1. `LLMOSKernel`
2. `PolicyEngine`
3. `EventBus`
4. `AuditLog`
5. `KernelLogger`
6. `KernelMetrics`
7. `AppManager`
8. `StoreService`
9. `SchedulerService`
10. `NotificationService`
11. `SecurityService`
12. `HostAdapterRegistry`
13. `ModelService`
14. `PackageService`
15. `TenantQuotaGovernor`
16. 所有 system / file / shell / store / net / planner / task / app service provider

#### `appInjector`

放置应用级隔离状态：

1. 当前 app manifest
2. 当前 appId
3. app 级权限视图
4. app 级 quota 视图
5. app 级配置
6. app 专属扩展 provider
7. app 生命周期相关对象

#### `pageInjector`

放置请求级 / 渲染级状态：

1. `traceId`
2. `sessionId`
3. `workingDirectory`
4. 当前 page entry
5. route
6. request payload
7. page render context
8. page runtime system executor

## 4. 直接使用现有 `@context-ai/core` 能力

用户期望的调用方式是：

```ts
const appInjector = createInjector(appProviders, osInjector, "application");
const pageInjector = createInjector(pageProviders, appInjector, "feature");
```

当前 `@context-ai/core` 已经有：

1. `createInjector(providers, parent, scope)`
2. `createApplicationInjector(providers)`
3. `createFeatureInjector(providers, parent)`
4. `EnvironmentInjector.createWithAutoProviders(...)`

因此 V1.1 不需要为 core 增加新的实例 API，直接基于现有工厂函数即可。

### 4.1 使用 `createInjector` 显式创建子注入器

推荐：

```ts
const appInjector = createInjector(appProviders, osInjector, "application");
const pageInjector = createInjector(pageProviders, appInjector, "feature");
```

或者 page 层也可以用：

```ts
const pageInjector = createFeatureInjector(pageProviders, appInjector);
```

### 4.2 不建议直接支持 `create({ traceId, sessionId, request })`

裸对象创建 child injector 可读，但类型安全不足。  
建议对外如果要提供这个 ergonomics，只在 OS 层做语法糖：

```ts
createPageInjector(appInjector, {
  traceId,
  sessionId,
  request,
});
```

内部立即转换为 typed providers：

```ts
[
  { provide: PAGE_TRACE_ID, useValue: traceId },
  { provide: PAGE_SESSION_ID, useValue: sessionId },
  { provide: PAGE_REQUEST, useValue: request },
]
```

结论：

1. 不需要给 core 增加 `Injector.create`
2. 不建议给 core 增加 `create({ ... })`
3. `pageInjector` 的对象式创建建议由 OS 自己封装，再内部转成 typed providers

## 5. OS 中要新增的 InjectionToken 体系

V1.1 除了现有 service token 外，需要新增一组 runtime token。

### 5.1 全局 OS token

建议新增：

```ts
export const OS_OPTIONS = new InjectionToken<CreateDefaultLLMOSOptions>("os.options");
export const OS_KERNEL = new InjectionToken<LLMOSKernel>("os.kernel");
export const OS_POLICY_ENGINE = new InjectionToken<PolicyEngine>("os.policy");
export const OS_APP_MANAGER = new InjectionToken<AppManager>("os.app-manager");
export const OS_STORE = new InjectionToken<StoreService>("os.store");
export const OS_SCHEDULER = new InjectionToken<SchedulerService>("os.scheduler");
export const OS_NOTIFICATION = new InjectionToken<NotificationService>("os.notification");
export const OS_SECURITY = new InjectionToken<SecurityService>("os.security");
export const OS_HOST_ADAPTERS = new InjectionToken<HostAdapterRegistry>("os.host-adapters");
export const OS_SERVICE_DEFINITIONS = new InjectionToken<OSService<unknown, unknown>>("os.service-definitions");
```

`OS_SERVICE_DEFINITIONS` 应为 multi provider。

### 5.2 App 级 token

```ts
export const CURRENT_APP_ID = new InjectionToken<string>("os.current-app-id");
export const CURRENT_APP_MANIFEST = new InjectionToken<AppManifestV1>("os.current-app-manifest");
export const CURRENT_APP_PERMISSIONS = new InjectionToken<string[]>("os.current-app-permissions");
export const CURRENT_APP_QUOTA = new InjectionToken<AppQuota | undefined>("os.current-app-quota");
```

### 5.3 Page / Request 级 token

```ts
export const PAGE_TRACE_ID = new InjectionToken<string>("os.page.trace-id");
export const PAGE_SESSION_ID = new InjectionToken<string>("os.page.session-id");
export const PAGE_REQUEST = new InjectionToken<unknown>("os.page.request");
export const PAGE_ROUTE = new InjectionToken<string>("os.page.route");
export const PAGE_ENTRY = new InjectionToken<AppPageEntry>("os.page.entry");
export const PAGE_RENDER_CONTEXT = new InjectionToken<AppPageRenderContext>("os.page.render-context");
export const PAGE_SYSTEM_RUNTIME = new InjectionToken<AppPageSystemRuntime>("os.page.system-runtime");
export const SYSTEM_EXECUTOR = new InjectionToken<AppPageSystemRuntime>("os.system-executor");
```

## 6. `llm-os.ts` 的目标重构方向

### 6.1 当前问题

当前 `createDefaultLLMOS()` 里手工完成了：

1. 基础设施实例创建
2. governor 装配
3. service 实例装配
4. `SERVICES` 注册表创建
5. 默认 system task app 安装
6. event subscription
7. page renderer 与 runtime bridge 拼装

这会导致任何新能力都继续堆进 `llm-os.ts`。

### 6.2 V1.1 目标

`llm-os.ts` 应该退化成一个很薄的 composition root：

1. 构造 provider 列表
2. 创建 `osInjector`
3. 执行初始化器
4. 导出 facade

目标形态：

```ts
export function createOSInjector(options?: CreateDefaultLLMOSOptions): Injector
export const osInjector = createOSInjector()
export function createDefaultLLMOS(options?: CreateDefaultLLMOSOptions): DefaultLLMOS
```

其中：

- `createOSInjector()` 返回真正的 DI 根
- `createDefaultLLMOS()` 只是从 injector 中拿 facade，不负责手工 `new`

## 7. Service 注册模型重构

### 7.1 当前模型

当前是：

```ts
const SERVICES = {
  [FILE_READ]: () => createFileReadService(fileService),
  ...
}
```

问题：

1. 依赖仍然通过闭包手工传入
2. 注册和实例化耦合在一起
3. 不方便按 scope 覆盖

### 7.2 目标模型

改为 provider + multi provider：

```ts
[
  {
    provide: OS_SERVICE_DEFINITIONS,
    multi: true,
    useFactory: (fileService: FileService) => createFileReadService(fileService),
    deps: [OS_FILE_SERVICE],
  },
]
```

然后由单独的 `OS_SERVICE_REGISTRAR` 在 initializer 中读取：

```ts
const services = injector.get(OS_SERVICE_DEFINITIONS);
for (const service of services) kernel.registerService(service);
```

### 7.3 保留 `tokens.ts`

V1.1 不推翻现有 `packages/os/src/tokens.ts`。

保留：

1. service token 常量
2. request/response 类型绑定
3. `runtime.execute(FILE_READ, req, ctx)` 这种调用风格

DI 只是替换实例创建和作用域管理，不替换 service contract。

## 8. App 隔离重构

### 8.1 目标

每个 app 都应该有自己的 `appInjector`。

创建入口：

```ts
function createAppInjector(osInjector: Injector, manifest: AppManifestV1): Injector
```

### 8.2 appInjector 提供的能力

1. 注入当前 app metadata
2. 注入当前 app 权限视图
3. 注入当前 app quota 视图
4. 注入 app 自定义 providers
5. 允许 app 覆盖某些 feature-scope 服务

### 8.3 app 安装与 injector 联动

安装 app 后，除了 registry 记录，还要完成：

1. 构建该 app 的 provider manifest
2. 创建或刷新 `appInjector`
3. 建立 `appId -> appInjector` 索引
4. 卸载 app 时销毁对应 `appInjector`

建议新增 `AppRuntimeRegistry`：

```ts
interface AppRuntimeRegistry {
  get(appId: string): Injector;
  create(appId: string, manifest: AppManifestV1): Injector;
  destroy(appId: string): Promise<void>;
}
```

## 9. Page / Request 隔离重构

### 9.1 目标

页面渲染、task run、tool run 都必须在自己的 `pageInjector` 内执行。

### 9.2 pageInjector 创建入口

```ts
function createPageInjector(
  appInjector: Injector,
  input: {
    traceId: string;
    sessionId: string;
    request: unknown;
    route: string;
    page: AppPageEntry;
    context: AppPageRenderContext;
  },
): Injector
```

### 9.3 pageInjector 生命周期

1. 创建于 render / task 开始前
2. 注入 request-scope 数据
3. 在 page 执行结束后销毁

### 9.4 page 运行时取数方式

page 内部原则上不应依赖全局对象，而应通过 `pageInjector` 构建好的 `input` 获取：

1. `input.context`
2. `input.system`
3. `input.page`
4. `input.appId`

未来如果 CTP page 支持更深的 DI 上下文，可以直接注入 token。

## 10. `system.execute` 的最终形态

### 10.1 当前建议

系统调用仍保留：

```ts
execute<Request, Response, Name extends string>(
  service: Token<Request, Response, Name>,
  request: Request,
  context: AppPageRenderContext,
): Promise<Response>;
```

### 10.2 内部实现

`SYSTEM_EXECUTOR` 作为一个 app/page 可注入服务，由 `pageInjector` 提供：

```ts
{
  provide: SYSTEM_EXECUTOR,
  useFactory: (kernel: LLMOSKernel) => ({
    execute: (token, request, context) => kernel.execute(token, request, context),
    listServices: () => kernel.services.list(),
  }),
  deps: [OS_KERNEL],
}
```

这样：

1. 页面拿到的是当前 page scope 下的 system executor
2. 不需要继续在 `task-runtime`、`planner`、`app-manager` 里重复拼 bridge

## 11. 默认 system app 的重构方式

### 11.1 当前问题

默认 system task app 是在 `createDefaultLLMOS()` 里手工安装的。

### 11.2 V1.1 方案

默认内建 app 改成 initializer：

```ts
{
  provide: APP_INITIALIZER,
  multi: true,
  useFactory: (appManager, kernel) => async () => {
    appManager.install(systemTaskManifest);
    kernel.capabilities.set(systemTaskManifest.id, systemTaskManifest.permissions);
  },
  deps: [OS_APP_MANAGER, OS_KERNEL],
}
```

这样：

1. 启动流程可观测
2. 初始化次序明确
3. 测试中可以按需禁用

## 12. 推荐的迁移顺序

### Phase 0：定义 OS 层创建约定

- [ ] 明确 `appInjector` 统一使用 `createInjector(appProviders, osInjector, "application")`
- [ ] 明确 `pageInjector` 统一使用 `createInjector(pageProviders, appInjector, "feature")`
- [ ] 提供 OS 层 `createAppInjector` / `createPageInjector` 语法糖
- [ ] 明确不把裸对象创建 child injector 作为 core 通用 API

### Phase 1：引入 OS runtime token

- [ ] 新建 `packages/os/src/di/tokens.ts`
- [ ] 为 OS / App / Page 三层定义 InjectionToken
- [ ] `packages/os/package.json` 增加 `@context-ai/core` 依赖

### Phase 2：把基础设施搬进 osInjector

- [ ] `PolicyEngine`
- [ ] `LLMOSKernel`
- [ ] `AppManager`
- [ ] `StoreService`
- [ ] `SchedulerService`
- [ ] `NotificationService`
- [ ] `SecurityService`
- [ ] `HostAdapterRegistry`
- [ ] `ModelService`
- [ ] `PackageService`

### Phase 3：重构 service 注册

- [ ] 引入 `OS_SERVICE_DEFINITIONS` multi provider
- [ ] 把 `SERVICES` 闭包表改成 provider 列表
- [ ] 用 initializer 统一向 kernel 注册 service

### Phase 4：重构 app runtime

- [ ] 新建 `AppRuntimeRegistry`
- [ ] app 安装时创建 `appInjector`
- [ ] app 卸载 / 禁用时处理 injector 生命周期

### Phase 5：重构 page runtime

- [ ] `createPageInjector`
- [ ] `SYSTEM_EXECUTOR` provider
- [ ] 删除 `task-runtime` / `planner` / `app-manager` 中重复 bridge 逻辑

### Phase 6：重构 `createDefaultLLMOS`

- [ ] 提供 `createOSInjector(options)`
- [ ] 提供默认导出 `osInjector`
- [ ] `createDefaultLLMOS()` 改为 facade

### Phase 7：迁移 todo 示例

- [ ] `packages/todo` 改成从 `appInjector` / `pageInjector` 获取服务
- [ ] 用 injector 替换当前 todo runtime 手工拼装

## 13. 推荐的目录调整

建议新增：

```text
packages/os/src/di/
  tokens.ts
  providers.ts
  initializers.ts
  create-os-injector.ts
  create-app-injector.ts
  create-page-injector.ts
  app-runtime-registry.ts
```

同时：

1. `llm-os.ts` 只保留 facade
2. service factory 保留在原目录
3. provider 组装移入 `di/`

## 14. 测试计划

### 14.1 unit

- [ ] `osInjector` 能解析基础设施服务
- [ ] `appInjector` 可覆盖 app 级 token，不污染父级
- [ ] `pageInjector` 可覆盖 request token，不污染 app 级
- [ ] `SYSTEM_EXECUTOR` 使用 token 调用时类型和运行结果正确

### 14.2 integration

- [ ] 安装 app 后自动创建 `appInjector`
- [ ] 卸载 app 后销毁 `appInjector`
- [ ] page render 创建并销毁 `pageInjector`
- [ ] 多 app 并存时上下文不串

### 14.3 regression

- [ ] 现有 `packages/os` 199 个测试继续通过
- [ ] `todo` 示例仍可 build/run/install

## 15. DoD

V1.1 完成标准：

1. `@context-ai/os` 内部实例图不再依赖 `llm-os.ts` 手工 new 维护
2. 存在明确的 `osInjector -> appInjector -> pageInjector` 层级
3. 页面 / 请求级上下文全部通过 typed token 注入
4. app 卸载时能够销毁对应 injector
5. `system.execute(FILE_READ, req, ctx)` 这类 token 调用继续成立
6. 根级 `npm run build` 与 `packages/os` 全量测试通过

## 16. 关键决策

### 决策 1：`osInjector` 是否全局唯一

V1.1 推荐：

1. 对外提供默认单例 `osInjector`
2. 同时保留 `createOSInjector()` 工厂

也就是：

```ts
export const osInjector = createOSInjector();
export function createOSInjector(...) { ... }
```

这样既满足“默认全局 const osInjector”，也不把未来多实例路径堵死。

### 决策 2：是否让 core 直接接受 `create({ traceId, sessionId, request })`

不建议。

原因：

1. core 应保持通用 provider 模型
2. 裸对象不是 InjectionToken
3. request 上下文应在 OS 层映射为 typed token

建议 OS 提供语法糖：

```ts
const pageInjector = createPageInjector(appInjector, {
  traceId,
  sessionId,
  request,
});
```

## 17. 第一批最值得马上改的文件

1. `packages/os/package.json`
2. `packages/os/src/llm-os.ts`
3. `packages/os/src/app-manager/index.ts`
4. `packages/os/src/task-runtime/index.ts`
5. `packages/os/src/planner/index.ts`
6. `packages/os/src/system-service/index.ts`
7. `packages/os/src/tokens.ts`
8. `packages/os/src/di/create-os-injector.ts`
9. `packages/os/src/di/create-app-injector.ts`
10. `packages/os/src/di/create-page-injector.ts`
11. `packages/todo/src/os/createTodoOSRuntime.ts`

## 18. 一句话总结

V1.1 的本质不是“把 service factory 换一种写法”，而是把 `@context-ai/os` 从“手工拼装对象图”升级成“有明确作用域隔离的 DI runtime”：

- `osInjector` 管共享基础设施
- `appInjector` 管应用隔离
- `pageInjector` 管请求与渲染上下文

只有这样，后面 app 权限隔离、页面级审计、请求级 trace、运行时覆盖、测试替身注入，才能真正做干净。
