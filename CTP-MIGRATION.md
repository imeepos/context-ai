# CTP-Lite 迁移指南

本指南帮助开发者从原 CTP 协议迁移到 CTP-Lite。

---

## 主要变化概览

| 特性 | 原 CTP | CTP-Lite |
|------|--------|----------|
| 渲染位置 | Server-side | Client-side (Node.js) |
| 协议 | WebSocket | HTTP REST / 直接调用 |
| 初始化 | 复杂配置 | `configure()` + `run()` |
| 自动循环 | 无 | 内置 |
| 定时任务 | 无 | `scheduler` API |
| 状态管理 | Server 维护 | Client 维护 |
| 存储 | Server 数据库 | file / sqlite / redis |

---

## 快速迁移步骤

### 1. 安装新包

```bash
# 安装新包
npm install @context-ai/core

# 开发依赖
npm install -D ts-node typescript @types/node
```

### 2. 更新入口文件

#### 原 CTP（Server-side）

```typescript
// server.ts - 原 CTP
import { CTPHandler } from '@context-protocol/server';

const handler = new CTPHandler({
  contextsPath: './contexts',
  llm: {
    apiKey: process.env.OPENAI_KEY,
    model: 'gpt-4',
  },
});

handler.listen(3000);
```

#### CTP-Lite（CLI）

```typescript
// cli.ts - CTP-Lite
import { configure, run } from '@context-ai/core';
import 'dotenv/config';

// 1. 配置
await configure({
  contexts: {
    lazy: {
      OrderList: () => import('./contexts/OrderList'),
      Dashboard: () => import('./contexts/Dashboard'),
    },
  },
  llm: {
    default: 'openai',
    providers: {
      openai: {
        apiKey: process.env.OPENAI_API_KEY!,
        model: 'gpt-4',
      },
    },
  },
  storage: {
    type: 'file',
    path: './data/state.json',
  },
});

// 2. 启动
await run({
  entry: 'OrderList',
  storage: { type: 'memory' },
  onCycle: (result) => {
    console.log('AI:', result.response);
  },
});
```

### 3. 运行方式

```bash
# 原 CTP
node server.ts

# CTP-Lite
ts-node cli.ts
```

---

### 4. 更新 Context 组件

#### 数据获取方式

**原 CTP：**
```tsx
// 数据由服务器注入
export function OrderListContext(props: { orders: Order[] }) {
  return (
    <Context name="订单列表">
      <Data source={props.orders} />
    </Context>
  );
}
```

**CTP-Lite：**
```tsx
// 客户端主动获取
export async function OrderListContext() {
  // 直接从客户端获取
  const orders = await fetch('/api/orders').then(r => r.json());

  return (
    <Context name="订单列表">
      <Data source={orders} />
    </Context>
  );
}
```

#### 状态访问方式

**原 CTP：**
```tsx
// 通过 props 或上下文
export function OrderListContext(props: { userId: string }) {
  // ...
}
```

**CTP-Lite：**
```tsx
import { state } from '@context-ai/core';

export async function OrderListContext() {
  // 通过 state API 获取
  const userId = state.get<string>('userId');
  // ...
}
```

#### 组件变为异步

**原 CTP：**
```tsx
export function OrderListContext() {
  return <Context>...</Context>;
}
```

**CTP-Lite：**
```tsx
export async function OrderListContext() {
  // 注意：函数变为 async
  const data = await fetchData();
  return <Context>...</Context>;
}
```

---

### 5. 更新 Tool 定义

#### 工具执行器

**原 CTP：**
```tsx
<Tool
  name="create_order"
  handler="/api/orders/create"
>
  <Param name="customerId" type="string" />
</Tool>
```

**CTP-Lite：**
```tsx
<Tool
  name="create_order"
  description="创建订单"
  executor={async (params) => {
    const result = await fetch('/api/orders', {
      method: 'POST',
      body: JSON.stringify(params),
    }).then(r => r.json());

    // 可以直接返回 JSX 跳转
    return <OrderDetail orderId={result.id} />;
  }}
>
  <Param name="customerId" type="string" required />
</Tool>
```

---

### 6. 更新状态管理

**原 CTP：**
```typescript
// 状态由服务器维护
// 通过 WebSocket 同步
```

**CTP-Lite：**
```typescript
import { state } from '@context-ai/core';

// 客户端状态管理
state.set('user', { id: '123', name: 'John' });
const user = state.get<{ id: string; name: string }>('user');

// 持久化到存储
await run({
  entry: 'Dashboard',
  storage: {
    type: 'file',
    path: './data/state.json',
  },
});
```

---

## 存储迁移

### 从 Server Database 到本地存储

**原 CTP：**
```typescript
// 状态存储在服务器数据库
```

**CTP-Lite：**
```typescript
// 选择存储后端
await run({
  entry: 'Dashboard',
  storage: {
    type: 'sqlite',  // 或 'file', 'redis'
    path: './data/ctp.db',
  },
});
```

### 数据迁移脚本

```typescript
// migrate.ts
import { oldDatabase } from './old-database';
import { configure, state } from '@context-ai/core';

await configure({
  storage: {
    type: 'file',
    path: './data/state.json',
  },
});

// 从旧数据库迁移数据
const oldData = await oldDatabase.getAll();
for (const [key, value] of Object.entries(oldData)) {
  state.set(key, value);
}

console.log('迁移完成');
```

---

## 详细迁移对照

### 配置迁移

| 原 CTP | CTP-Lite | 说明 |
|--------|----------|------|
| `contextsPath` | `contexts.lazy` | 改为懒加载配置 |
| `llm.apiKey` | `llm.providers.*.apiKey` | 直接使用（注意环境变量） |
| `websocket.url` | 移除 | 不再需要 WebSocket |
| 无 | `storage` | 新增客户端存储配置 |
| 无 | `safety` | 新增安全限制配置 |

### 组件迁移

| 原 CTP | CTP-Lite | 说明 |
|--------|----------|------|
| `<Context>` | `<Context>` | 相同，支持 `extends` |
| `<Text>` | `<Text>` | 相同 |
| `<Data>` | `<Data>` | 相同，新增 `cache` 属性 |
| `<Tool>` | `<Tool>` | 不同，新增 `executor` 属性 |
| `<Param>` | `<Param>` | 相同，新增 `validation` |
| 无 | `<Example>` | 新增 |
| 无 | `<Group>` | 新增 |
| 无 | `<Slot>`/`<Fill>` | 新增 |

### API 迁移

| 原 CTP | CTP-Lite | 说明 |
|--------|----------|------|
| `CTPHandler` | `configure` + `run` | 完全不同的 API |
| `server.listen()` | `run()` | 直接启动 |
| WebSocket 事件 | `hooks` | 通过钩子处理 |

---

## 服务器端调整

### 原 CTP 服务器

原 CTP 需要专门的 WebSocket 服务器来处理渲染和状态管理。

### CTP-Lite

CTP-Lite 是纯客户端库，只需要标准的 REST API 服务器提供业务数据。

```typescript
// server.ts - 简单的 Express 服务器（仅提供数据）
import express from 'express';

const app = express();

// 业务 API
app.get('/api/orders', authenticate, getOrders);
app.post('/api/orders', authenticate, createOrder);
app.get('/api/orders/:id', authenticate, getOrderDetail);

app.listen(3000);
```

---

## 构建配置

### tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "esModuleInterop": true,
    "strict": true,
    "jsx": "react-jsx",
    "jsxImportSource": "@context-ai/core",
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules"]
}
```

### package.json

```json
{
  "name": "my-ctp-app",
  "type": "module",
  "scripts": {
    "dev": "tsx watch cli.ts",
    "build": "tsc",
    "start": "node dist/cli.js"
  },
  "dependencies": {
    "@context-ai/core": "^1.0.0",
    "dotenv": "^16.0.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "tsx": "^4.0.0",
    "typescript": "^5.0.0"
  }
}
```

---

## 常见问题

### Q: 如何处理用户认证？

**原 CTP：**
认证由服务器处理，通过 WebSocket 连接传递。

**CTP-Lite：**
```typescript
// 使用环境变量或配置文件
await configure({
  llm: {
    providers: {
      openai: {
        apiKey: process.env.OPENAI_API_KEY!,
      },
    },
  },
});

// 业务 API 认证
const token = process.env.API_TOKEN;
const orders = await fetch('/api/orders', {
  headers: { Authorization: `Bearer ${token}` },
});
```

### Q: 如何处理实时更新？

**原 CTP：**
通过 WebSocket 实时推送。

**CTP-Lite：**
```typescript
// 方式 1: 轮询
scheduler.register(
  { interval: 5000 },
  async () => {
    await refreshData();
  }
);

// 方式 2: Server-Sent Events
import EventSource from 'eventsource';

export async function RealtimeContext() {
  const eventSource = new EventSource('/api/events');

  eventSource.onmessage = (event) => {
    const data = JSON.parse(event.data);
    state.set('realtimeData', data);
    // 触发重新渲染
  };

  // ...
}
```

### Q: 如何共享状态？

**原 CTP：**
服务器维护全局状态。

**CTP-Lite：**
```typescript
// 使用 state API
import { state } from '@context-ai/core';

// 在任意 Context 中设置
state.set('sharedKey', value);

// 在其他 Context 中获取
const value = state.get('sharedKey');

// 使用订阅
state.subscribe('sharedKey', (newVal, oldVal) => {
  console.log('State changed:', oldVal, '->', newVal);
});

// 多实例隔离
await run({
  entry: 'Dashboard',
  instanceId: `user-${userId}`, // 每个用户独立实例
  storage: {
    type: 'file',
    path: `./data/state-${userId}.json`,
  },
});
```

---

## 迁移检查清单

### 准备阶段
- [ ] 评估现有 Context 数量和复杂度
- [ ] 识别依赖的原 CTP 特性
- [ ] 制定测试计划

### 代码迁移
- [ ] 更新包依赖
- [ ] 重写入口文件
- [ ] 迁移 Context 组件（改为 async）
- [ ] 迁移 Tool 定义（添加 executor）
- [ ] 更新数据获取逻辑
- [ ] 更新状态管理

### 配置迁移
- [ ] 创建 tsconfig.json
- [ ] 更新 package.json
- [ ] 配置环境变量

### 测试验证
- [ ] 单元测试
- [ ] 集成测试
- [ ] 性能测试

---

## 回滚计划

如果迁移遇到问题，可以暂时回滚：

1. 保留原 CTP 服务器作为 fallback
2. 通过特性开关切换
3. 灰度发布验证

```typescript
// 特性开关示例
const useCTPLite = process.env.USE_CTP_LITE === 'true';

if (useCTPLite) {
  await runCTPLite();
} else {
  await runCTPLegacy();
}
```

---

## 获取帮助

- [GitHub Issues](https://github.com/context-ai/core/issues)
- [Discord 社区](https://discord.gg/context-ai)
- [邮件支持](mailto:support@context-ai.dev)
