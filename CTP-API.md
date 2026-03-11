# CTP-Lite API 参考

## 目录

- [核心 API](#核心-api)
- [配置接口](#配置接口)
- [组件 API](#组件-api)
- [状态管理](#状态管理)
- [路由系统](#路由系统)
- [调度器](#调度器)
- [错误处理](#错误处理)
- [类型定义](#类型定义)

---

## 核心 API

### `configure(config)`

初始化 CTP-Lite 全局配置。应在应用启动时调用一次。

```typescript
import { configure } from '@context-ai/core';

await configure({
  contexts: {
    lazy: {
      OrderList: () => import('./contexts/OrderList'),
      Dashboard: () => import('./contexts/Dashboard'),
    },
  },
  server: {
    url: 'https://api.example.com',
    auth: {
      type: 'bearer',
      tokenProvider: () => localStorage.getItem('token'),
    },
  },
  llm: {
    default: 'openai',
    providers: {
      openai: {
        proxyUrl: 'https://api.example.com/llm',
        model: 'gpt-4',
        timeout: 30000,
      },
    },
  },
  security: {
    sri: true,
  },
});
```

**参数：**
- `config: CTPConfig` - 全局配置对象

**返回值：**
- `Promise<void>`

**错误：**
- `ConfigError` - 配置无效
- `NetworkError` - CDN 加载失败

---

### `run(config)`

启动 CTP-Lite 执行循环。

```typescript
import { run } from '@context-ai/core';

const controller = await run({
  entry: 'Dashboard',
  instanceId: 'session-123',
  storage: {
    type: 'indexedDB',
    key: 'ctp-state',
    isolated: true,
    encryption: true,
  },
  safety: {
    maxCycles: 10,
    maxDuration: 60000,
    maxToolCallsPerCycle: 5,
  },
  hooks: {
    onCycle: (result) => console.log('Cycle completed:', result.contextName),
    onError: (error) => console.error('Error:', error),
  },
});

// 停止执行
await controller.stop();

// 等待完成
await controller.waitForCompletion();
```

**参数：**
- `config: RuntimeConfig` - 运行时配置

**返回值：**
- `Promise<RunController>` - 运行控制器

**错误：**
- `RuntimeError` - 执行错误
- `SafetyError` - 触发安全限制

---

## 配置接口

### `CTPConfig`

全局配置接口。

```typescript
interface CTPConfig {
  /**
   * 上下文组件注册表
   */
  contexts: ContextRegistryConfig;

  /**
   * 服务器配置
   */
  server: ServerConfig;

  /**
   * LLM Provider 配置
   */
  llm: LLMManagerConfig;

  /**
   * 安全策略
   */
  security?: SecurityConfig;

   /**
   * 缓存策略
   */
  cache?: CacheConfig;

  /**
   * 中间件
   */
  middlewares?: Middleware[];

  /**
   * 开发配置
   */
  dev?: DevConfig;
}
```

### `ContextRegistryConfig`

```typescript
interface ContextRegistryConfig {
  /**
   * 同步注册的上下文
   */
  sync?: Record<string, ContextComponent>;

  /**
   * 懒加载的上下文（推荐）
   */
  lazy?: Record<string, () => Promise<{ default: ContextComponent }>>;

  /**
   * 预加载的上下文列表
   */
  preload?: string[];
}
```

### `ServerConfig`

```typescript
interface ServerConfig {
  /**
   * 服务器基础 URL
   */
  url: string;

  /**
   * 认证配置
   */
  auth?: {
    type: 'bearer' | 'basic' | 'custom';
    tokenProvider?: () => string | Promise<string>;
    header?: string;
  };

  /**
   * 请求超时
   */
  timeout?: number;

  /**
   * 自定义请求头
   */
  headers?: Record<string, string>;
}
```

### `LLMManagerConfig`

```typescript
interface LLMManagerConfig {
  /**
   * 默认 Provider ID
   */
  default: string;

  /**
   * Provider 配置映射
   */
  providers: Record<string, LLMProviderConfig>;
}

interface LLMProviderConfig {
  /**
   * 代理 URL（推荐，保护 API Key）
   */
  proxyUrl?: string;

  /**
   * 直接连接配置（仅开发使用）
   */
  direct?: {
    baseUrl: string;
    apiKey: string;
  };

  /**
   * 模型名称
   */
  model: string;

  /**
   * 支持的能力
   */
  capabilities?: ('chat' | 'tool' | 'vision')[];

  /**
   * 超时时间（毫秒）
   */
  timeout?: number;

  /**
   * 重试配置
   */
  retry?: RetryConfig;
}
```

### `RuntimeConfig`

```typescript
interface RuntimeConfig {
  /**
   * 入口上下文名称
   */
  entry: string;

  /**
   * 实例标识（用于状态隔离）
   */
  instanceId?: string;

  /**
   * 存储配置
   */
  storage: StorageConfig;

  /**
   * 调度配置
   */
  schedule?: ScheduleConfig;

  /**
   * 安全限制
   */
  safety?: SafetyConfig;

  /**
   * 事件钩子
   */
  hooks?: RuntimeHooks;
}
```

### `StorageConfig`

```typescript
interface StorageConfig {
  /**
   * 存储类型
   */
  type: 'localStorage' | 'indexedDB' | 'memory' | 'custom';

  /**
   * 存储键名
   */
  key: string;

  /**
   * 是否启用实例隔离
   */
  isolated?: boolean;

  /**
   * 是否加密敏感数据
   */
  encryption?: boolean;

  /**
   * 是否压缩
   */
  compression?: boolean;

  /**
   * 数据过期时间（毫秒）
   */
  ttl?: number;

  /**
   * 淘汰策略
   */
  eviction?: 'lru' | 'fifo';

  /**
   * 最大存储大小（字节）
   */
  maxSize?: number;
}
```

### `SafetyConfig`

```typescript
interface SafetyConfig {
  /**
   * 最大循环次数
   */
  maxCycles?: number;

  /**
   * 最大执行时间（毫秒）
   */
  maxDuration?: number;

  /**
   * 单轮最大工具调用数
   */
  maxToolCallsPerCycle?: number;

  /**
   * 最大 Token 数
   */
  maxTokens?: number;

  /**
   * 熔断配置
   */
  circuitBreaker?: {
    failureThreshold: number;
    recoveryTimeout: number;
  };

  /**
   * 停止条件
   */
  until?: (state: State) => boolean;
}
```

### `RuntimeHooks`

```typescript
interface RuntimeHooks {
  /**
   * 每个循环完成时调用
   */
  onCycle?: (result: CycleResult) => void;

  /**
   * 发生错误时调用
   * 返回 true 继续执行，false 停止
   */
  onError?: (error: CTPError) => boolean | void;

  /**
   * 执行完成时调用
   */
  onComplete?: (result: RunResult) => void;

  /**
   * 执行停止时调用
   */
  onStop?: () => void;
}
```

---

## 组件 API

### `<Context>`

上下文容器组件。

```typescript
interface ContextProps {
  /**
   * 上下文名称
   */
  name: string;

  /**
   * 描述
   */
  description?: string;

  /**
   * 优先级
   */
  priority?: 'high' | 'medium' | 'low';

  /**
   * 继承的上下文
   */
  extends?: string;

  /**
   * 指定 LLM Provider
   */
  model?: string;

  /**
   * 子元素
   */
  children?: React.ReactNode;
}
```

**示例：**
```tsx
<Context name="订单管理" description="处理用户订单" priority="high">
  {/* 子组件 */}
</Context>
```

---

### `<Text>`

文本内容组件。

```typescript
interface TextProps {
  /**
   * 优先级
   */
  priority?: 'high' | 'medium' | 'low';

  /**
   * 文本内容
   */
  children: React.ReactNode;
}
```

**示例：**
```tsx
<Text priority="high">这是一个重要通知。</Text>
<Text>普通文本内容。</Text>
```

---

### `<Data>`

数据展示组件。

```typescript
interface DataProps<T = unknown> {
  /**
   * 数据源 URL 或数据对象
   */
  source: string | T[];

  /**
   * 数据格式
   */
  format?: 'list' | 'table' | 'json' | 'text' | 'csv';

  /**
   * 字段选择
   */
  fields?: string[];

  /**
   * 最大条目数
   */
  maxItems?: number;

  /**
   * 缓存配置
   */
  cache?: {
    key?: string;
    ttl?: number;
    staleWhileRevalidate?: boolean;
  };

  /**
   * 虚拟化配置
   */
  virtualize?: {
    enabled: boolean;
    itemHeight: number;
    overscan: number;
  };
}
```

**示例：**
```tsx
<Data source="/api/orders" format="list" fields={['id', 'status']} maxItems={20} />
<Data source={orders} format="table" cache={{ ttl: 60000 }} />
```

---

### `<Example>`

示例对话组件，用于 few-shot prompting。

```typescript
interface ExampleProps {
  /**
   * 示例标题
   */
  title?: string;

  /**
   * 示例类型
   */
  type?: 'user' | 'assistant' | 'tool';

  /**
   * 子元素
   */
  children: React.ReactNode;
}
```

**示例：**
```tsx
<Example title="创建订单示例">
  <Text type="user">帮我创建一个订单</Text>
  <Text type="assistant">我来帮您创建订单。</Text>
  <Tool name="create_order" args={{ customerId: "123" }} />
</Example>
```

---

### `<Tool>`

工具定义组件。

```typescript
interface ToolProps {
  /**
   * 工具名称
   */
  name: string;

  /**
   * 工具描述
   */
  description: string;

  /**
   * 执行器函数
   */
  executor: Executor;

  /**
   * 是否需要确认
   */
  confirm?: boolean;

  /**
   * 风险等级
   */
  risk?: 'low' | 'medium' | 'high';

  /**
   * 是否允许重新渲染
   */
  allowReRender?: boolean;

  /**
   * 最大递归深度
   */
  maxRecursionDepth?: number;

  /**
   * 错误处理
   */
  onError?: (error: Error, params: unknown) => ExecutorResult;

  /**
   * 参数 Schema（TypeBox）
   * 使用 TypeBox 定义参数结构和验证规则
   * @example
   * parameters: Type.Object({
   *   customerId: Type.String({ format: 'uuid' }),
   *   items: Type.Array(Type.Object({
   *     productId: Type.String(),
   *     quantity: Type.Integer({ minimum: 1, maximum: 100 })
   *   }), { minItems: 1 })
   * })
   */
  parameters?: TSchema;
}

type Executor<T = Record<string, unknown>> = (
  params: T,
  context: ExecutionContext
) => Promise<ExecutorResult>;

type ExecutorResult =
  | JSX.Element    // 返回 JSX → 重新渲染
  | object         // 返回数据
  | void           // 无返回
  | {
      result: object;
      nextContext?: JSX.Element;
    };
```

**示例：**

**TypeBox Schema 示例（推荐）**
```tsx
import { Type, type Static } from '@sinclair/typebox';

// 1. 定义 Schema
const createOrderSchema = Type.Object({
  customerId: Type.String({
    format: 'uuid',
    description: "必须是有效的 UUID"
  }),
  items: Type.Array(
    Type.Object({
      productId: Type.String({
        minLength: 1,
        description: "商品ID不能为空"
      }),
      quantity: Type.Integer({
        minimum: 1,
        maximum: 100,
        description: "数量至少为1，最多为100"
      }),
      price: Type.Optional(Type.Number({
        minimum: 0,
        description: "价格必须为正数"
      })),
    }),
    { minItems: 1, description: "至少需要一件商品" }
  ),
  shippingAddress: Type.Optional(Type.Object({
    street: Type.String(),
    city: Type.String(),
    zipCode: Type.String({
      pattern: '^\\d{6}$',
      description: "邮编必须是6位数字"
    }),
  })),
  notes: Type.Optional(Type.String({
    maxLength: 500,
    description: "备注不能超过500字"
  })),
});

// 2. 推断类型
type CreateOrderParams = Static<typeof createOrderSchema>;

// 3. 使用 Schema
<Tool
  name="create_order"
  description="创建新订单"
  parameters={createOrderSchema}  // 传入 TypeBox Schema
  execute={async (params: CreateOrderParams) => {
    // params 已自动验证，类型安全
    const result = await fetch('/api/orders', {
      method: 'POST',
      body: JSON.stringify(params),
    }).then(r => r.json());

    return result;
  }}
/>
```

---

### Schema 转换

CTP 会自动将 TypeBox Schema 转换为 LLM 可理解的 JSON Schema：

```typescript
import { Type, type Static } from '@sinclair/typebox';

const schema = Type.Object({
  name: Type.String({ description: "用户姓名" }),
  age: Type.Optional(Type.Number()),
});

// TypeBox 直接生成 JSON Schema：
// {
//   type: "object",
//   properties: {
//     name: { type: "string", description: "用户姓名" },
//     age: { type: "number" }
//   },
//   required: ["name"]
// }
```

---

### `<Param>`

工具参数定义组件。

```typescript
interface ParamProps {
  /**
   * 参数名
   */
  name: string;

  /**
   * 参数类型
   */
  type: 'string' | 'number' | 'boolean' | 'array' | 'object' | 'enum';

  /**
   * 是否必需
   */
  required?: boolean;

  /**
   * 默认值
   */
  default?: unknown;

  /**
   * 枚举值（type='enum' 时使用）
   */
  enum?: string[];

  /**
   * 描述
   */
  description?: string;

  /**
   * 验证规则
   */
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    minLength?: number;
    maxLength?: number;
  };
}
```

**示例：**
```tsx
<Param name="orderId" type="string" required description="订单ID" />
<Param name="status" type="enum" enum={['pending', 'done']} default="pending" />
<Param name="quantity" type="number" required validation={{ min: 1, max: 100 }} />
```

---

### TypeBox Schema 支持

#### `TSchema` 类型

CTP 原生使用 [TypeBox](https://github.com/sinclairzx81/typebox) 进行参数定义和验证。

```typescript
import { Type, type Static, type TSchema } from '@sinclair/typebox';

// TypeBox Schema 类型
type TSchema = any; // TypeBox 导出的基础 Schema 类型

// 从 Schema 推断 TypeScript 类型
type InferType<T extends TSchema> = Static<T>;
```

#### 常用 TypeBox 类型

| TypeBox 类型 | JSON Schema 输出 | 说明 |
|----------|-----------------|------|
| `Type.String()` | `{ type: "string" }` | 字符串 |
| `Type.Number()` | `{ type: "number" }` | 数字 |
| `Type.Integer()` | `{ type: "integer" }` | 整数 |
| `Type.Boolean()` | `{ type: "boolean" }` | 布尔值 |
| `Type.Array(T)` | `{ type: "array", items: ... }` | 数组 |
| `Type.Object({})` | `{ type: "object", properties: {} }` | 对象 |
| `Type.Enum([...])` | `{ enum: [...] }` | 枚举 |
| `Type.Optional(T)` | 从 required 中移除 | 可选 |
| `Type.String({ format: 'email' })` | 添加 format | 邮箱格式 |
| `Type.String({ format: 'uri' })` | 添加 format | URL 格式 |
| `Type.String({ format: 'uuid' })` | 添加 format | UUID 格式 |
| `Type.String({ pattern: '...' })` | 添加 pattern | 正则匹配 |

#### 复杂 Schema 示例

```typescript
import { Type, type Static } from '@sinclair/typebox';

// 定义嵌套结构
const addressSchema = Type.Object({
  street: Type.String({ minLength: 1, description: "街道不能为空" }),
  city: Type.String(),
  country: Type.String({ default: "中国" }),
  zipCode: Type.String({
    pattern: '^\\d{6}$',
    description: "邮编必须是6位数字"
  }),
});

const orderItemSchema = Type.Object({
  productId: Type.String({ format: 'uuid' }),
  name: Type.String({ description: "商品名称" }),
  quantity: Type.Integer({ minimum: 1 }),
  price: Type.Number({ minimum: 0 }),
  options: Type.Optional(Type.Record(Type.String(), Type.String())), // 额外选项
});

const createOrderSchema = Type.Object({
  customerId: Type.String({ format: 'uuid' }),
  items: Type.Array(orderItemSchema, { minItems: 1 }),
  shippingAddress: addressSchema,
  billingAddress: Type.Optional(addressSchema),
  couponCode: Type.Optional(Type.String({ minLength: 8, maxLength: 8 })),
  notes: Type.Optional(Type.String({ maxLength: 500 })),
  metadata: Type.Optional(Type.Record(Type.String(), Type.Unknown())),
});

// 类型推断
type CreateOrderParams = Static<typeof createOrderSchema>;

// 使用
<Tool
  name="create_order"
  parameters={createOrderSchema}
  execute={async (params: CreateOrderParams) => {
    // params 类型：Static<typeof createOrderSchema>
    // 已自动验证，无需手动检查
    return createOrder(params);
  }}
/>
```

---

### `<Group>`

内容分组组件。

```typescript
interface GroupProps {
  /**
   * 分组标题
   */
  title?: string;

  /**
   * 优先级
   */
  priority?: 'high' | 'medium' | 'low';

  /**
   * 是否默认折叠
   */
  collapsed?: boolean;

  /**
   * 子元素
   */
  children: React.ReactNode;
}
```

**示例：**
```tsx
<Group title="订单信息" priority="high">
  <Text>订单号：{order.id}</Text>
  <Text>状态：{order.status}</Text>
</Group>
```

---

### `<Slot>` / `<Fill>`

插槽系统用于上下文扩展。

```typescript
interface SlotProps {
  name: string;
}

interface FillProps {
  slot: string;
  children: React.ReactNode;
}
```

**示例：**
```tsx
// 基础上下文定义插槽
<Context name="基础页面">
  <Slot name="header" />
  <Slot name="content" />
  <Slot name="actions" />
</Context>

// 扩展上下文填充插槽
<Context name="订单页面" extends="基础页面">
  <Fill slot="header">
    <Text>订单管理</Text>
  </Fill>
  <Fill slot="content">
    <Data source="/api/orders" />
  </Fill>
  <Fill slot="actions">
    <Tool name="create_order" description="创建订单" />
  </Fill>
</Context>
```

---

## 状态管理

### `state` API

全局状态管理接口。

```typescript
interface StateAPI {
  /**
   * 获取状态值
   */
  get<T>(key: string): T | undefined;

  /**
   * 设置状态值
   */
  set<T>(key: string, value: T): void;

  /**
   * 删除状态值
   */
  remove(key: string): void;

  /**
   * 清空所有状态
   */
  clear(): void;

  /**
   * 获取所有状态
   */
  all(): Record<string, unknown>;

  /**
   * 订阅状态变更
   */
  subscribe<T>(key: string, callback: (newVal: T, oldVal: T) => void): () => void;

  /**
   * 批量操作
   */
  batch(operations: () => void): void;
}
```

**示例：**
```typescript
import { state } from '@context-ai/core';

// 基本操作
state.set('user', { id: '123', name: 'John' });
const user = state.get<{ id: string; name: string }>('user');

// 订阅变更
const unsubscribe = state.subscribe('user', (newVal, oldVal) => {
  console.log('User changed:', oldVal, '->', newVal);
});

// 批量操作
state.batch(() => {
  state.set('a', 1);
  state.set('b', 2);
  state.set('c', 3);
  // 只会触发一次更新
});
```

---

## 路由系统

### `router` API

上下文路由导航。

```typescript
interface RouterAPI {
  /**
   * 注册路由映射
   */
  register(routes: Record<string, string>): void;

  /**
   * 导航到指定路径
   */
  navigate(path: string, params?: Record<string, unknown>): Promise<void>;

  /**
   * 获取当前路径
   */
  current(): string;

  /**
   * 返回上一页
   */
  back(): Promise<void>;

  /**
   * 获取历史记录
   */
  history(): string[];
}
```

**示例：**
```typescript
import { router } from '@context-ai/core';

// 注册路由
router.register({
  '/orders': 'OrderList',
  '/orders/:id': 'OrderDetail',
  '/dashboard': 'Dashboard',
});

// 导航
await router.navigate('/orders/123', { highlight: true });
```

---

## 调度器

### `scheduler` API

定时任务调度。

```typescript
interface SchedulerAPI {
  /**
   * 注册定时任务
   */
  register(
    config: ScheduleConfig,
    callback: () => Promise<void>
  ): string;

  /**
   * 取消定时任务
   */
  cancel(id: string): void;

  /**
   * 暂停定时任务
   */
  pause(id: string): void;

  /**
   * 恢复定时任务
   */
  resume(id: string): void;

  /**
   * 获取所有任务
   */
  list(): ScheduleTask[];

  /**
   * 清理所有任务
   */
  clear(): void;
}

interface ScheduleConfig {
  /**
   * 执行间隔（毫秒）
   */
  interval?: number;

  /**
   * Cron 表达式
   */
  cron?: string;

  /**
   * 是否立即执行
   */
  immediate?: boolean;

  /**
   * 执行次数限制
   */
  maxExecutions?: number;

  /**
   * 任务优先级
   */
  priority?: 'high' | 'medium' | 'low';
}

interface ScheduleTask {
  id: string;
  config: ScheduleConfig;
  status: 'pending' | 'running' | 'paused' | 'completed';
  nextRun: Date;
  lastRun?: Date;
  executionCount: number;
}
```

**示例：**
```typescript
import { scheduler } from '@context-ai/core';

// 注册间隔任务
const taskId = scheduler.register(
  { interval: 5 * 60 * 1000, immediate: true },
  async () => {
    await syncOrders();
  }
);

// 注册 Cron 任务
const cronId = scheduler.register(
  { cron: '0 2 * * *' },  // 每天凌晨 2 点
  async () => {
    await generateDailyReport();
  }
);

// 取消任务
scheduler.cancel(taskId);
```

---

## 错误处理

### 错误类型

```typescript
/**
 * 基础错误类
 */
class CTPError extends Error {
  /**
   * 错误类型
   */
  type: string;

  /**
   * 错误代码
   */
  code: string;

  /**
   * 是否可恢复
   */
  recoverable: boolean;

  /**
   * 上下文信息
   */
  context?: Record<string, unknown>;
}

/**
 * 配置错误
 */
class ConfigError extends CTPError {
  type = 'CONFIG_ERROR';
}

/**
 * 网络错误
 */
class NetworkError extends CTPError {
  type = 'NETWORK_ERROR';
}

/**
 * 渲染错误
 */
class RenderError extends CTPError {
  type = 'RENDER_ERROR';
}

/**
 * 工具执行错误
 */
class ToolError extends CTPError {
  type = 'TOOL_ERROR';
}

/**
 * AI 调用错误
 */
class AIError extends CTPError {
  type = 'AI_ERROR';
}

/**
 * 安全限制错误
 */
class SafetyError extends CTPError {
  type = 'SAFETY_ERROR';
}

/**
 * 存储错误
 */
class StorageError extends CTPError {
  type = 'STORAGE_ERROR';
}
```

### 错误处理示例

```typescript
await run({
  entry: 'Dashboard',
  hooks: {
    onError: (error) => {
      switch (error.type) {
        case 'CONFIG_ERROR':
          console.error('配置错误:', error.message);
          return false; // 停止执行

        case 'NETWORK_ERROR':
          console.error('网络错误:', error.message);
          return true;  // 继续执行（可能重试）

        case 'AI_ERROR':
          if (error.code === 'RATE_LIMIT') {
            // 限流错误，等待后重试
            await delay(5000);
            return true;
          }
          return false;

        case 'SAFETY_ERROR':
          console.error('触发安全限制:', error.context);
          return false; // 停止执行

        default:
          console.error('未知错误:', error);
          return false;
      }
    },
  },
});
```

---

## 类型定义

### 核心类型

```typescript
/**
 * 上下文组件类型
 */
type ContextComponent<P = Record<string, unknown>> = (
  props: P
) => Promise<JSX.Element>;

/**
 * 渲染结果
 */
interface RenderedContext {
  /**
   * 渲染后的提示词
   */
  prompt: string;

  /**
   * 工具定义列表
   */
  tools: ToolDefinition[];

  /**
   * 元数据
   */
  meta: {
    contextName: string;
    renderTime: number;
    componentCount: number;
  };
}

/**
 * 工具定义
 */
interface ToolDefinition {
  name: string;
  description: string;
  parameters: JSONSchema;
  risk?: 'low' | 'medium' | 'high';
  confirm?: boolean;
}

/**
 * 工具调用
 */
interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

/**
 * 循环结果
 */
interface CycleResult {
  cycleId: string;
  contextName: string;
  prompt: string;
  tools: ToolDefinition[];
  toolCalls: ToolCall[];
  response: string;
  duration: number;
  newState: State;
}

/**
 * 运行结果
 */
interface RunResult {
  success: boolean;
  cycles: CycleResult[];
  totalDuration: number;
  finalState: State;
  error?: CTPError;
}

/**
 * 运行控制器
 */
interface RunController {
  /**
   * 停止执行
   */
  stop(): Promise<void>;

  /**
   * 暂停执行
   */
  pause(): void;

  /**
   * 恢复执行
   */
  resume(): void;

  /**
   * 等待完成
   */
  waitForCompletion(): Promise<RunResult>;

  /**
   * 获取当前状态
   */
  getStatus(): 'idle' | 'running' | 'paused' | 'completed' | 'error';
}

/**
 * 状态类型
 */
interface State {
  [key: string]: unknown;
  _meta?: {
    version: number;
    lastUpdated: number;
    instanceId: string;
  };
}

/**
 * 执行上下文
 */
interface ExecutionContext {
  /**
   * 当前状态
   */
  state: State;

  /**
   * 当前上下文名称
   */
  contextName: string;

  /**
   * 循环信息
   */
  cycle: {
    id: string;
    number: number;
    startTime: number;
  };

  /**
   * 工具调用历史
   */
  toolHistory: ToolCall[];
}

/**
 * JSON Schema 类型
 */
interface JSONSchema {
  type: 'object';
  properties: Record<string, {
    type: string;
    description?: string;
    enum?: string[];
    items?: JSONSchema;
  }>;
  required?: string[];
}
```
