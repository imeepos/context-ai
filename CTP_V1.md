# Context Protocol Lite (CTP-Lite)

> React for AI Context Engineering

## 核心思想

```
JSX 组件 → 打包 CDN → AI Client 加载 → 自动循环执行

传统: React → DOM → Human GUI
现在: React → Context → AI Agent
```

**核心公式:**

```
init(config) → bootstrap({ entry, storage, schedule }) → 定时/立即执行循环：render → chat → tool → render → ...
```

---

## 架构

```
┌─────────────────────────────────────────────────────────────────────┐
│                                                                     │
│   开发阶段                                                          │
│   ────────                                                          │
│   contexts/                    build                 CDN            │
│   ├── OrderList.tsx    ──────> bundle.js    ──────> cdn.x.com/v1/   │
│   ├── OrderDetail.tsx                                          │
│   └── index.ts                                                 │
│                                                                     │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   运行阶段                                                          │
│   ────────                                                          │
│                                                                     │
│   ┌─────────────────────────────────────────────────────────────┐  │
│   │                     AI Client                                │  │
│   │                                                             │  │
│   │   init({ cdns, serverUrl, apiKey, baseUrl, model })         │  │
│   │                                                             │  │
│   │   bootstrap({ entry, storage, schedule })                   │  │
│   │       │                                                     │  │
│   │       ▼                                                     │  │
│   │   ┌─────────────────────────────────────────┐               │  │
│   │   │            Auto Loop                     │               │  │
│   │   │                                         │               │  │
│   │   │   1. render(context) → prompt + tools   │               │  │
│   │   │              │                          │               │  │
│   │   │              ▼                          │               │  │
│   │   │   2. chat(prompt, tools) → response     │               │  │
│   │   │              │                          │               │  │
│   │   │              ▼                          │               │  │
│   │   │   3. tool.call() → result              │               │  │
│   │   │              │                          │               │  │
│   │   │              ▼                          │               │  │
│   │   │   4. render(newContext) ...            │               │  │
│   │   │                                         │               │  │
│   │   └─────────────────────────────────────────┘               │  │
│   │                                                             │  │
│   └─────────────────────────────────────────────────────────────┘  │
│                              │                                     │
│                              │ HTTP                                │
│                              ▼                                     │
│   ┌─────────────────────────────────────────────────────────────┐  │
│   │                     Server API                               │  │
│   │                                                             │  │
│   │   - 业务数据: GET/POST /api/...                             │  │
│   │   - 工具执行: POST /api/tools/...                           │  │
│   │                                                             │  │
│   └─────────────────────────────────────────────────────────────┘  │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## API

### 安装

```bash
npm install @context-ai/core
```

或 CDN:

```html
<script src="https://cdn.x.com/context-ai/core/1.0.0/min.js"></script>
```

### 初始化

```typescript
import { init, bootstrap } from '@context-ai/core';

// 1. 初始化配置
await init({
  // Context Bundle CDN 地址
  cdns: [
    'https://cdn.x.com/contexts/v1.2.3/bundle.js',
  ],

  // 后台 API 地址
  serverUrl: 'https://api.example.com',

  // 大模型配置
  apiKey: 'sk-xxx',
  baseUrl: 'https://api.openai.com/v1',
  model: 'gpt-4',
});

// 2. 启动，自动循环执行
await bootstrap({
  // 初始上下文（名称或路由）
  entry: 'Dashboard',  // 或 entry: '/orders'

  // 存储配置
  storage: {
    type: 'localStorage',  // 'localStorage' | 'indexedDB' | 'memory'
    key: 'ctp-state',
  },

  // 可选：循环回调
  onCycle: (result) => {
    console.log('Cycle:', result.contextName, result.toolCalls);
  },

  // 可选：错误处理
  onError: (error) => {
    console.error('Error:', error);
  },
});
```

### 配置定义

```typescript
interface InitConfig {
  // Context Bundle CDN 地址列表
  cdns: string[];

  // 后台 API 地址
  serverUrl: string;

  // 大模型配置
  apiKey: string;
  baseUrl: string;
  model: string;

  // 可选
  headers?: Record<string, string>;      // 自定义请求头
  timeout?: number;                      // 请求超时
}

interface BootstrapConfig {
  // 初始上下文
  entry: string;  // Context 名称或路由路径

  // 存储配置
  storage: {
    type: 'localStorage' | 'indexedDB' | 'memory';
    key?: string;
  };

  // 定时调度（可选）
  schedule?: {
    interval?: number;      // 间隔执行（毫秒）
    cron?: string;          // Cron 表达式
    immediate?: boolean;    // 是否立即执行第一次
  };

  // 可选
  until?: (state: State) => boolean;     // 停止条件
  onCycle?: (result: CycleResult) => void;
  onError?: (error: Error) => void;
  maxCycles?: number;                    // 最大循环次数
}

interface CycleResult {
  contextName: string;
  prompt: string;
  toolCalls: ToolCall[];
  response: string;
  newState: State;
}
```

### 导出的 API

```typescript
// @context-ai/core

export {
  // 生命周期
  init,
  bootstrap,

  // 状态管理
  state: {
    get: (key: string) => unknown;
    set: (key: string, value: unknown) => void;
    delete: (key: string) => void;
    clear: () => void;
    getAll: () => Record<string, unknown>;
  },

  // 路由
  router: {
    register: (routes: Record<string, string>) => void;
    navigate: (path: string) => Promise<void>;
    current: () => string;
  },

  // 渲染
  render: (name: string, props?: object) => Promise<RenderedContext>,

  // 定时调度
  scheduler: {
    register: (config: ScheduleConfig, callback: () => Promise<void>) => string;
    cancel: (id: string) => void;
    list: () => ScheduleTask[];
  },

  // Context 注册（打包时使用）
  registerContexts: (contexts: Record<string, ContextComponent>) => void;

  // 元信息
  version: string;
  contexts: () => string[];
};

interface ScheduleConfig {
  interval?: number;      // 间隔执行（毫秒）
  cron?: string;          // Cron 表达式
  immediate?: boolean;    // 是否立即执行第一次
}

interface ScheduleTask {
  id: string;
  config: ScheduleConfig;
  nextRun: Date;
  lastRun?: Date;
}
```

---

## 基础组件（8 个原子组件）

```
┌─────────────────────────────────────────────────────────────┐
│                    基础组件层次                              │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  内容层（信息）          行为层（操作）         结构层（组织） │
│  ─────────────          ─────────────         ───────────── │
│  Text (文本)            Tool (工具)           Context (上下文)│
│  Data (数据)            Param (参数)          Group (分组)    │
│  Example (示例)                               Slot (插槽)    │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 组件定义

### 1. `<Context>` - 上下文容器

```tsx
interface ContextProps {
  name: string;                        // 上下文名称
  description?: string;                // 场景描述
  priority?: 'high' | 'medium' | 'low';
  extends?: string;                    // 继承
}

<Context name="订单管理" description="处理用户订单">
  {/* 子组件 */}
</Context>

// 可嵌套
<Context name="工作台">
  <Context name="待办">{/* ... */}</Context>
</Context>
```

### 2. `<Text>` - 文本

```tsx
interface TextProps {
  priority?: 'high' | 'medium' | 'low';
}

<Text>这是一个订单管理系统。</Text>
<Text>当前用户：{user.name}</Text>
```

### 3. `<Data>` - 动态数据

```tsx
interface DataProps {
  source: string;         // 数据源路径
  format?: 'list' | 'table' | 'json' | 'text';
  fields?: string[];
  maxItems?: number;
}

<Data source="/api/orders" format="list" fields={['id', 'status']} />
```

### 4. `<Example>` - 示例

```tsx
interface ExampleProps {
  title?: string;
}

<Example title="创建订单">
  <Text>用户：帮我创建订单</Text>
  <Text>AI：createOrder({ customerId: "123" })</Text>
</Example>
```

### 5. `<Tool>` - 工具

```tsx
interface ToolProps {
  name: string;
  description: string;
  executor: Executor;
  confirm?: boolean;
  risk?: 'low' | 'medium' | 'high';
}

type ExecutorResult =
  | JSX.Element    // 返回 JSX → 重新渲染
  | object         // 返回数据
  | void;

<Tool
  name="create_order"
  description="创建订单"
  executor={async (params) => {
    const result = await fetch('/api/orders', {
      method: 'POST',
      body: JSON.stringify(params),
    }).then(r => r.json());

    return <OrderDetail orderId={result.id} />;
  }}
>
  <Param name="customerId" type="string" required />
</Tool>
```

### 6. `<Param>` - 参数

```tsx
interface ParamProps {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'array' | 'object' | 'enum';
  required?: boolean;
  default?: unknown;
  enum?: string[];
  description?: string;
}

<Param name="orderId" type="string" required />
<Param name="status" type="enum" enum={['pending', 'done']} />
```

### 7. `<Group>` - 分组

```tsx
interface GroupProps {
  title?: string;
  priority?: 'high' | 'medium' | 'low';
  collapsed?: boolean;
}

<Group title="订单信息" priority="high">
  <Text>订单号：{order.id}</Text>
</Group>
```

### 8. `<Slot>` - 插槽

```tsx
interface SlotProps { name: string; }
interface FillProps { slot: string; children: React.ReactNode; }

// 定义
<Context name="基础">
  <Slot name="extensions" />
</Context>

// 填充
<Context name="订单" extends="基础">
  <Fill slot="extensions">
    <Tool name="createOrder" ... />
  </Fill>
</Context>
```

---

## Context 组件示例

```tsx
// contexts/OrderList.tsx
import { Context, Group, Text, Data, Tool, Param } from '@context-ai/core';
import { state } from '@context-ai/core';

interface Props {
  page?: number;
}

export async function OrderListContext({ page = 1 }: Props) {
  // 获取全局状态
  const token = state.get('token') as string;
  const role = state.get('role') as string;

  // 调用 Server API
  const orders = await fetch(`/api/orders?page=${page}`, {
    headers: { Authorization: `Bearer ${token}` },
  }).then(r => r.json());

  const canCreate = role === 'admin' || role === 'manager';

  return (
    <Context name="订单列表" description="订单管理页面">
      <Group title="概览" priority="high">
        <Text>共 {orders.total} 个订单</Text>
        <Text>第 {page} 页</Text>
      </Group>

      <Group title="订单列表">
        <Data
          source="/api/orders"
          format="list"
          fields={['id', 'customerName', 'status', 'amount']}
          maxItems={20}
        />
      </Group>

      {/* 动态工具 */}
      {orders.items.map(order => (
        <Tool
          key={order.id}
          name={`view_order_${order.id}`}
          description={`查看订单 #${order.id}`}
          executor={async () => {
            const detail = await fetch(`/api/orders/${order.id}`, {
              headers: { Authorization: `Bearer ${token}` },
            }).then(r => r.json());

            return <OrderDetailContext order={detail} />;
          }}
        />
      ))}

      {/* 创建工具 */}
      {canCreate && (
        <Tool
          name="create_order"
          description="创建新订单"
          executor={async (params) => {
            const result = await fetch('/api/orders', {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(params),
            }).then(r => r.json());

            return <OrderDetailContext orderId={result.id} />;
          }}
        >
          <Param name="customerId" type="string" required />
          <Param name="items" type="array" required />
        </Tool>
      )}

      {/* 分页 */}
      {page > 1 && (
        <Tool
          name="prev_page"
          description="上一页"
          executor={() => <OrderListContext page={page - 1} />}
        />
      )}
    </Context>
  );
}
```

---

## 渲染输出

```typescript
interface RenderedContext {
  prompt: string;              // 渲染后的提示词
  tools: ToolDefinition[];     // 工具列表
}

interface ToolDefinition {
  name: string;
  description: string;
  parameters: JSONSchema;
}
```

### 示例输出

```json
{
  "prompt": "## 订单列表\n\n共 50 个订单，第 1 页。\n\n### 可用操作\n你可以使用工具来操作订单。",
  "tools": [
    {
      "name": "view_order_1001",
      "description": "查看订单 #1001",
      "parameters": { "type": "object", "properties": {} }
    },
    {
      "name": "create_order",
      "description": "创建新订单",
      "parameters": {
        "type": "object",
        "properties": {
          "customerId": { "type": "string" },
          "items": { "type": "array" }
        },
        "required": ["customerId", "items"]
      }
    }
  ]
}
```

---

## Bootstrap 自动循环

```
bootstrap({ entry, storage })
    │
    ├── 1. 加载存储的状态
    │   state.load(storage)
    │
    ├── 2. 渲染初始 Context
    │   render(entry) → { prompt, tools }
    │
    ├── 3. 调用 AI
    │   ai.chat({ system: prompt, tools, messages })
    │
    ├── 4. 处理响应
    │   ├── 文本 → 保存到 messages，继续
    │   └── 工具调用 → 执行工具
    │
    ├── 5. 多轮工具执行
    |   loop tool
    │     result = tool.executor(params)
    |   end
    │   │
    │   ├── 返回 JSX → render(newContext) → 回到步骤 3
    │   ├── 返回数据 → 保存到 messages → 回到步骤 3
    │   └── 无返回 → 回到步骤 3
    │
    ├── 6. 检查停止条件
    │   if (until(state)) break
    │   if (maxCycles) break
    │
    └── 7. 保存状态
        state.save(storage)
```

---

## 定时任务示例

```typescript
import { init, bootstrap, scheduler } from '@context-ai/core';

await init({...});

// 方式 1: bootstrap 内置 schedule
await bootstrap({
  entry: 'SyncOrders',
  storage: { type: 'memory' },
  schedule: {
    interval: 5 * 60 * 1000,  // 每 5 分钟
    immediate: true,
  },
});

// 方式 2: 手动注册定时任务
const taskId = scheduler.register({
  cron: '0 2 * * *',  // 每天凌晨 2 点
}, async () => {
  await bootstrap({
    entry: 'DailyReport',
    storage: { type: 'memory' },
  });
});

// 取消定时任务
scheduler.cancel(taskId);

// 查看所有定时任务
console.log(scheduler.list());
```

---

## 完整使用示例

```html
<!DOCTYPE html>
<html>
<head>
  <title>Shop Assistant</title>
  <script src="https://cdn.x.com/context-ai/core/1.0.0/min.js"></script>
</head>
<body>
<div id="output"></div>

<script>
async function main() {
  const { init, bootstrap, state } = ContextAI;

  // 初始化
  await init({
    cdns: ['https://cdn.x.com/shop-contexts/v1.2.3/bundle.js'],
    serverUrl: 'https://api.shop.com',
    apiKey: localStorage.getItem('openai_key'),
    baseUrl: 'https://api.openai.com/v1',
    model: 'gpt-4',
  });

  // 设置初始状态
  state.set('token', localStorage.getItem('token'));

  // 启动
  await bootstrap({
    entry: 'Dashboard',
    storage: {
      type: 'localStorage',
      key: 'shop-assistant-state',
    },
    onCycle: (result) => {
      document.getElementById('output').innerHTML +=
        `<p><strong>AI:</strong> ${result.response}</p>`;
    },
    onError: (error) => {
      document.getElementById('output').innerHTML +=
        `<p class="error">${error.message}</p>`;
    },
  });
}

main();
</script>
</body>
</html>
```

---

## 打包配置

### tsup.config.ts

```typescript
import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['iife'],
  globalName: '__CTP_CONTEXTS__',
  outDir: 'dist',
  minify: true,
  sourcemap: true,
  external: ['@context-ai/core'],
  noExternal: ['./contexts/**'],
});
```

### src/index.ts

```typescript
import { registerContexts } from '@context-ai/core';
import { OrderListContext } from './contexts/OrderList';
import { OrderDetailContext } from './contexts/OrderDetail';
import { DashboardContext } from './contexts/Dashboard';

registerContexts({
  OrderList: OrderListContext,
  OrderDetail: OrderDetailContext,
  Dashboard: DashboardContext,
});
```

---

## Server API 规范

Server 只需要提供普通 REST API：

```typescript
// 数据接口
GET  /api/orders?page=1
GET  /api/orders/:id
POST /api/orders
PATCH /api/orders/:id
DELETE /api/orders/:id

// 认证
POST /api/auth/login
POST /api/auth/refresh
```

---

## 与原 CTP 对比

| 方面     | 原 CTP    | CTP-Lite                 |
| -------- | --------- | ------------------------ |
| 渲染位置 | Server    | Client                   |
| 组件存储 | 无        | CDN                      |
| 初始化   | 复杂      | `init()` + `bootstrap()` |
| 自动循环 | 无        | 内置                     |
| 定时任务 | 无        | `schedule` + `scheduler` |
| 状态管理 | Server    | Client                   |
| 输出格式 | 复杂 JSON | prompt + tools           |
| 协议     | WebSocket | HTTP REST                |

---

## 实现清单

### Phase 1: Core
- [ ] `init()` 配置初始化
- [ ] CDN Bundle 加载器
- [ ] 8 个原子组件
- [ ] `render()` 渲染函数

### Phase 2: Bootstrap
- [ ] 自动循环机制
- [ ] AI 对话集成
- [ ] 工具执行器
- [ ] 状态持久化

### Phase 3: Scheduler
- [ ] interval 定时器
- [ ] cron 解析器
- [ ] 任务注册/取消

### Phase 4: 工具链
- [ ] tsup 打包配置
- [ ] CLI 工具
- [ ] 开发服务器

---

## 总结

**CTP-Lite = React for AI Agent**

```
init({ cdns, serverUrl, apiKey, baseUrl, model })
    ↓
bootstrap({ entry, storage, schedule })
    ↓
定时/立即执行循环: render → chat → tool → render → ...
```

**核心特点：**

1. **CDN 分发** - JSX 组件打包到 CDN，确保版本一致
2. **客户端渲染** - AI Client 本地渲染，Server 只提供 API
3. **自动循环** - `bootstrap()` 自动执行任务
4. **定时任务** - 支持 interval 和 cron 表达式
5. **8 个原子组件** - 最小不可拆分的基础组件
6. **极简输出** - `prompt: string + tools: ToolDefinition[]`
