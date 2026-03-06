# @context-ai/core

企业级依赖注入（DI）框架，受 Angular 启发，为 TypeScript/Node.js 应用提供优雅的依赖管理。

## 核心理念

依赖注入不应繁琐复杂。`@context-ai/core` 提供类型安全、层次化、易用的依赖管理方案，让您专注于业务逻辑而非基础设施。

## 特性

- 🎯 **类型安全** - 完整的 TypeScript 类型推导与检查
- 🏗️ **层次化注入器** - 支持多级作用域（root → platform → application → feature）
- 🔄 **循环依赖检测** - 自动检测并报告循环依赖
- 🚀 **性能优化** - 实例缓存、位标志优化、ForwardRef 缓存
- 🎨 **多种提供者** - Value、Class、Factory、Existing、Constructor
- 🔗 **多值注入** - 支持同一令牌提供多个值
- ♻️ **生命周期管理** - `OnInit` 和 `OnDestroy` 钩子
- 🧩 **灵活的作用域** - 自动解析 `providedIn` 服务
- 🔧 **初始化器系统** - 支持异步初始化和依赖排序

## 快速开始

### 安装

```bash
pnpm add @context-ai/core reflect-metadata
```

### 基础使用

```typescript
import { Injectable, createRootInjector, Inject } from '@context-ai/core';

// 定义服务
@Injectable({ providedIn: 'root' })
class UserService {
  getUsers() {
    return ['Alice', 'Bob', 'Charlie'];
  }
}

@Injectable({ providedIn: 'root' })
class AppService {
  constructor(
    @Inject(UserService) private userService: UserService
  ) {}

  start() {
    console.log('Users:', this.userService.getUsers());
  }
}

// 创建注入器
const injector = createRootInjector();

// 获取服务实例
const app = injector.get(AppService);
app.start();
```

## 核心概念

### 1. 注入器层次结构

```
NullInjector (抛出错误)
    ↓
RootInjector (全局基础服务)
    ↓
PlatformInjector (跨应用共享)
    ↓
ApplicationInjector (应用级服务)
    ↓
FeatureInjector (功能模块服务)
```

```typescript
import {
  createRootInjector,
  createPlatformInjector,
  createApplicationInjector,
  createFeatureInjector
} from '@context-ai/core';

// 1. 创建根注入器
const root = createRootInjector([
  { provide: 'VERSION', useValue: '1.0.0' }
]);

// 2. 创建平台注入器（自动使用 root 作为父级）
const platform = createPlatformInjector([
  { provide: LoggerService, useClass: PlatformLogger }
]);

// 3. 创建应用注入器（自动使用 platform 作为父级）
const app = createApplicationInjector([
  { provide: ApiService, useClass: RestApiService }
]);

// 4. 创建功能注入器
const feature = createFeatureInjector([
  { provide: FeatureService, useClass: FeatureServiceImpl }
], app);
```

### 2. @Injectable 装饰器

```typescript
import { Injectable } from '@context-ai/core';

// 自动在根注入器注册（推荐）
@Injectable({ providedIn: 'root' })
class GlobalService {}

// 在平台注入器注册
@Injectable({ providedIn: 'platform' })
class PlatformService {}

// 在应用注入器注册
@Injectable({ providedIn: 'application' })
class AppService {}

// 在功能模块注册
@Injectable({ providedIn: 'feature' })
class FeatureService {}

// 最灵活：在任何注入器自动解析
@Injectable({ providedIn: 'auto' })
class FlexibleService {}

// 不自动注册，需手动配置
@Injectable({ providedIn: null })
class ManualService {}
```

### 3. 提供者类型

```typescript
// 值提供者
{ provide: 'API_URL', useValue: 'https://api.example.com' }

// 类提供者
{ provide: UserService, useClass: UserServiceImpl }

// 工厂提供者
{
  provide: DatabaseService,
  useFactory: (config: Config) => new DatabaseService(config),
  deps: [Config]
}

// 别名提供者
{ provide: 'Logger', useExisting: ConsoleLogger }

// 构造函数提供者（简写）
{ provide: UserService }  // 等同于 useClass: UserService
```

### 4. 依赖注入

```typescript
import { Injectable, Inject } from '@context-ai/core';

@Injectable()
class UserService {
  constructor(
    @Inject('API_URL') private apiUrl: string,
    @Inject(HttpClient) private http: HttpClient
  ) {}

  getUsers() {
    return this.http.get(`${this.apiUrl}/users`);
  }
}
```

### 5. 注入选项

```typescript
import { Injectable, Inject, Optional, Self, SkipSelf, Host } from '@context-ai/core';

@Injectable()
class MyService {
  constructor(
    // 可选依赖：找不到返回 null，不抛错误
    @Inject(LoggerService) @Optional() logger?: LoggerService,

    // 只在当前注入器查找
    @Inject(ConfigService) @Self() config: ConfigService,

    // 跳过当前注入器，从父级开始查找
    @Inject(CacheService) @SkipSelf() cache: CacheService,

    // 在宿主（根）注入器查找
    @Inject(GlobalState) @Host() state: GlobalState
  ) {}
}
```

### 6. 多值注入

```typescript
// 定义多值提供者
const providers = [
  { provide: 'PLUGINS', useValue: pluginA, multi: true },
  { provide: 'PLUGINS', useValue: pluginB, multi: true },
  { provide: 'PLUGINS', useValue: pluginC, multi: true }
];

const injector = createRootInjector(providers);

// 获取所有值（返回数组）
const plugins = injector.get('PLUGINS'); // [pluginA, pluginB, pluginC]
```

### 7. 生命周期管理

```typescript
import { Injectable, OnInit } from '@context-ai/core';

@Injectable()
@OnInit()
class DatabaseService implements OnInit {
  async onInit() {
    // 初始化时自动调用
    await this.connect();
  }

  async onDestroy() {
    // 销毁时自动调用
    await this.disconnect();
  }
}

// 使用
const injector = createRootInjector([DatabaseService]);
await injector.init();     // 触发所有 @OnInit 服务的 onInit()
await injector.destroy();  // 触发所有服务的 onDestroy()
```

### 8. 应用初始化器

```typescript
import { APP_INITIALIZER, Initializer } from '@context-ai/core';

const databaseInitializer: Initializer = {
  provide: new InjectionToken('DB_INIT'),
  init: async () => {
    await connectToDatabase();
  }
};

const cacheInitializer: Initializer = {
  provide: new InjectionToken('CACHE_INIT'),
  deps: [new InjectionToken('DB_INIT')], // 依赖数据库先初始化
  init: async () => {
    await initializeCache();
  }
};

const injector = createRootInjector([
  { provide: APP_INITIALIZER, useValue: databaseInitializer, multi: true },
  { provide: APP_INITIALIZER, useValue: cacheInitializer, multi: true }
]);

// 按依赖顺序执行初始化器
await injector.init();
```

### 9. InjectionToken（类型安全令牌）

```typescript
import { InjectionToken } from '@context-ai/core';

// 创建类型安全的令牌
const API_URL = new InjectionToken<string>('API_URL');
const MAX_RETRIES = new InjectionToken<number>('MAX_RETRIES');

const injector = createRootInjector([
  { provide: API_URL, useValue: 'https://api.example.com' },
  { provide: MAX_RETRIES, useValue: 3 }
]);

// 类型安全的获取
const url: string = injector.get(API_URL);
const retries: number = injector.get(MAX_RETRIES);
```

### 10. ForwardRef（循环引用解决方案）

```typescript
import { Injectable, Inject, forwardRef } from '@context-ai/core';

@Injectable()
class ServiceA {
  constructor(
    @Inject(forwardRef(() => ServiceB)) private serviceB: ServiceB
  ) {}
}

@Injectable()
class ServiceB {
  constructor(
    @Inject(forwardRef(() => ServiceA)) private serviceA: ServiceA
  ) {}
}
```

## 高级用法

### 动态添加提供者

```typescript
const injector = createRootInjector([
  { provide: 'CONFIG', useValue: { debug: true } }
]);

// 运行时添加新的提供者
injector.set([
  { provide: UserService, useClass: UserServiceImpl },
  LoggerService  // 简写形式
]);
```

### 默认值处理

```typescript
// 获取时提供默认值
const config = injector.get('CONFIG', { debug: false });
```

### 循环依赖检测

```typescript
// 框架自动检测循环依赖
@Injectable()
class A {
  constructor(@Inject(B) b: B) {}
}

@Injectable()
class B {
  constructor(@Inject(A) a: A) {}
}

// 抛出错误：检测到循环依赖: A -> B -> A
injector.get(A);
```

## API 参考

### 创建注入器

- `createRootInjector(providers?)` - 创建全局根注入器（单例）
- `createPlatformInjector(providers?)` - 创建平台注入器（单例）
- `createApplicationInjector(providers?)` - 创建应用注入器
- `createFeatureInjector(providers, parent)` - 创建功能注入器
- `createInjector(providers, parent?, scope?)` - 通用注入器创建

### 获取注入器

- `getRootInjector()` - 获取全局根注入器
- `getPlatformInjector()` - 获取全局平台注入器

### 重置注入器（测试用）

- `resetRootInjector()` - 重置根注入器
- `resetPlatformInjector()` - 重置平台注入器

### 装饰器

- `@Injectable(options?)` - 标记类为可注入
- `@Inject(token, options?)` - 指定依赖令牌
- `@Optional()` - 可选依赖
- `@Self()` - 只在当前注入器查找
- `@SkipSelf()` - 跳过当前注入器
- `@Host()` - 在宿主注入器查找
- `@OnInit()` - 标记需要初始化的服务

### 注入器方法

- `injector.get(token, defaultValue?)` - 获取依赖实例
- `injector.set(providers)` - 动态添加提供者
- `injector.init()` - 初始化注入器
- `injector.destroy()` - 销毁注入器

### 工具类

- `InjectionToken<T>` - 创建类型安全的令牌
- `forwardRef(() => Type)` - 解决循环引用
- `APP_INITIALIZER` - 应用初始化器令牌

## 最佳实践

### 1. 使用 `providedIn: 'root'` 实现自动注册

```typescript
// ✅ 推荐：自动注册，无需手动配置
@Injectable({ providedIn: 'root' })
class UserService {}

// ❌ 避免：需要手动注册
@Injectable({ providedIn: null })
class ManualService {}

const injector = createRootInjector([
  ManualService  // 必须手动添加
]);
```

### 2. 合理使用注入器层次

```typescript
// ✅ 全局服务放在 root
@Injectable({ providedIn: 'root' })
class ConfigService {}

// ✅ 跨应用共享放在 platform
@Injectable({ providedIn: 'platform' })
class LoggerService {}

// ✅ 应用级服务放在 application
@Injectable({ providedIn: 'application' })
class ApiService {}

// ✅ 功能模块服务放在 feature
@Injectable({ providedIn: 'feature' })
class FeatureService {}
```

### 3. 优先使用类型而非字符串令牌

```typescript
// ✅ 推荐：类型安全
@Inject(UserService) private userService: UserService

// ⚠️ 避免：字符串容易拼写错误
@Inject('UserService') private userService: any
```

### 4. 使用 InjectionToken 代替字符串

```typescript
// ✅ 推荐：类型安全
const API_URL = new InjectionToken<string>('API_URL');
@Inject(API_URL) private apiUrl: string

// ❌ 避免：无类型检查
@Inject('API_URL') private apiUrl: any
```

### 5. 异步初始化使用 APP_INITIALIZER

```typescript
// ✅ 推荐：使用初始化器
const dbInit: Initializer = {
  init: async () => await connectDB()
};

providers: [
  { provide: APP_INITIALIZER, useValue: dbInit, multi: true }
]

// ❌ 避免：在构造函数中异步初始化
constructor() {
  connectDB();  // 反模式
}
```

### 6. 测试时重置注入器

```typescript
import { resetRootInjector, resetPlatformInjector } from '@context-ai/core';

afterEach(() => {
  resetRootInjector();
  resetPlatformInjector();
});
```

## 设计哲学

这个依赖注入框架遵循代码艺术家的核心原则：

- **存在即合理** - 每个类、方法、属性都有不可替代的存在理由
- **优雅即简约** - 代码自我解释，无需冗余注释
- **性能即艺术** - 位标志优化、缓存机制、零运行时开销
- **错误处理如为人处世的哲学** - 清晰的错误消息引导用户
- **日志是思想的表达** - 有意义的上下文信息

## 技术亮点

### 1. 位标志性能优化

使用位运算代替对象属性检查，提升性能：

```typescript
// packages/core/src/internal-inject-flags.ts
enum InternalInjectFlags {
  Default = 0,
  Optional = 1 << 0,  // 0001
  SkipSelf = 1 << 1,  // 0010
  Self = 1 << 2,      // 0100
  Host = 1 << 3       // 1000
}
```

### 2. ForwardRef 缓存机制

避免重复解析同一 ForwardRef：

```typescript
// packages/core/src/forward-ref.ts:81-103
const forwardRefCache = new WeakMap<ForwardRef, any>();
```

### 3. 循环依赖检测

运行时自动检测循环依赖并提供清晰的错误路径：

```typescript
// packages/core/src/environment-injector.ts:245-252
if (this.resolvingTokens.has(resolvedToken)) {
  const pathStr = this.dependencyPath
    .map((t) => this.getTokenName(t))
    .join(' -> ');
  throw new Error(`检测到循环依赖: ${pathStr} -> ${tokenName}`);
}
```

### 4. 初始化器依赖排序

支持异步初始化器的依赖关系管理：

```typescript
// packages/core/src/initializer-graph.ts
// 使用有向无环图（DAG）拓扑排序
```

## 与 Angular DI 的对比

| 特性         | @context-ai/core   | Angular DI |
| ------------ | ------------------ | ---------- |
| 装饰器语法   | ✅ 相似             | ✅          |
| 层次化注入器 | ✅                  | ✅          |
| providedIn   | ✅                  | ✅          |
| 多值注入     | ✅                  | ✅          |
| 循环依赖检测 | ✅                  | ✅          |
| ForwardRef   | ✅                  | ✅          |
| 生命周期钩子 | ✅ OnInit/OnDestroy | ✅ 更多钩子 |
| 模块系统     | ❌ 轻量化设计       | ✅ NgModule |
| 编译时优化   | ❌ 运行时           | ✅ Ivy      |

## 许可证

Private（内部使用）

## 贡献

这是 Sker 项目的内部包，欢迎团队成员贡献代码。

---

**代码即文档，简约即优雅。**
