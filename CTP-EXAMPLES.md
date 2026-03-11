# CTP-Lite 示例代码

本文档提供从简单到复杂的完整示例，帮助开发者快速上手 CTP-Lite。

---

## 目录

1. [基础示例](#基础示例)
2. [状态管理示例](#状态管理示例)
3. [数据获取示例](#数据获取示例)
4. [定时任务示例](#定时任务示例)
5. [完整应用示例](#完整应用示例)

---

## 基础示例

### Hello World

最简单的 Context 示例。

```tsx
// contexts/Hello.tsx
import { Context, Text, Tool, Param } from '@context-ai/core';

export async function HelloContext() {
  return (
    <Context name="问候" description="简单的问候示例">
      <Text priority="high">你好！我是 AI 助手。</Text>
      <Tool
        name="say_hello"
        description="向指定用户问好"
        executor={async (params: { name: string }) => {
          console.log(`你好，${params.name}！`);
          return `问候已发送给 ${params.name}`;
        }}
      >
        <Param name="name" type="string" required description="用户姓名" />
      </Tool>
    </Context>
  );
}
```

```typescript
// cli.ts
import { configure, run } from '@context-ai/core';

await configure({
  contexts: {
    sync: {
      Hello: () => import('./contexts/Hello'),
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
});

await run({
  entry: 'Hello',
  storage: { type: 'memory' },
  onCycle: (result) => {
    console.log('AI:', result.response);
  },
});
```

### 运行

```bash
ts-node cli.ts
```

---

### 计数器

展示状态管理的基础用法。

```tsx
// contexts/CounterContext.tsx
import { Context, Text, Tool } from '@context-ai/core';
import { state } from '@context-ai/core';

export async function CounterContext() {
  const count = state.get<number>('count') || 0;

  return (
    <Context name="计数器" description="简单的计数器示例">
      <Text priority="high">当前计数: {count}</Text>

      <Tool
        name="increment"
        description="增加计数"
        executor={async () => {
          state.set('count', count + 1);
          return { newCount: count + 1 };
        }}
      />

      <Tool
        name="decrement"
        description="减少计数"
        executor={async () => {
          state.set('count', Math.max(0, count - 1));
          return { newCount: Math.max(0, count - 1) };
        }}
      />

      <Tool
        name="reset"
        description="重置计数"
        confirm={true}
        executor={async () => {
          state.set('count', 0);
          return { reset: true };
        }}
      />
    </Context>
  );
}
```

---

## 状态管理示例

### 用户认证

展示登录状态管理和权限控制。

```tsx
// contexts/AuthContext.tsx
import { Context, Text, Tool, Group } from '@context-ai/core';
import { state } from '@context-ai/core';

interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'user' | 'guest';
}

export async function AuthContext() {
  const user = state.get<User>('user');
  const isAuthenticated = !!user;

  return (
    <Context name="认证" description="用户认证示例">
      {!isAuthenticated ? (
        <Group title="登录">
          <Text>请先登录以继续。</Text>

          <Tool
            name="login"
            description="使用邮箱和密码登录"
            executor={async (params: { email: string; password: string }) => {
              const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(params),
              });

              if (!response.ok) {
                return <ErrorContext message="登录失败，请检查邮箱和密码。" />;
              }

              const data = await response.json();
              state.set('user', data.user);
              state.set('token', data.token);

              // 登录成功后跳转到首页
              return <DashboardContext />;
            }}
          >
            <Param name="email" type="string" required />
            <Param name="password" type="string" required />
          </Tool>
        </Group>
      ) : (
        <Group title="用户信息">
          <Text>欢迎，{user.name}！</Text>
          <Text>角色: {user.role}</Text>
          <Text>邮箱: {user.email}</Text>

          <Tool
            name="logout"
            description="退出登录"
            executor={async () => {
              await fetch('/api/auth/logout', { method: 'POST' });
              state.clear();
              return <AuthContext />;
            }}
          />

          {user.role === 'admin' && (
            <Tool
              name="admin_panel"
              description="进入管理后台"
              executor={async () => <AdminContext />}
            />
          )}
        </Group>
      )}
    </Context>
  );
}
```

---

### 多语言支持

展示国际化状态管理。

```tsx
// contexts/I18nContext.tsx
import { Context, Text, Tool, Group } from '@context-ai/core';
import { state } from '@context-ai/core';

const translations = {
  zh: {
    welcome: '欢迎',
    goodbye: '再见',
    language: '语言',
  },
  en: {
    welcome: 'Welcome',
    goodbye: 'Goodbye',
    language: 'Language',
  },
  ja: {
    welcome: 'ようこそ',
    goodbye: 'さようなら',
    language: '言語',
  },
};

export async function I18nContext() {
  const locale = state.get<string>('locale') || 'zh';
  const t = translations[locale as keyof typeof translations];

  return (
    <Context name="国际化" description="多语言示例">
      <Group title={t.language}>
        <Text>{t.welcome}！</Text>
        <Text>当前语言: {locale}</Text>

        <Tool
          name="change_language"
          description="切换语言"
          executor={async (params: { lang: 'zh' | 'en' | 'ja' }) => {
            state.set('locale', params.lang);
            return { success: true, newLocale: params.lang };
          }}
        >
          <Param
            name="lang"
            type="enum"
            enum={['zh', 'en', 'ja']}
            required
          />
        </Tool>
      </Group>
    </Context>
  );
}
```

---

## 数据获取示例

### 使用 TypeBox Schema 定义参数

```tsx
// contexts/CreateOrderContext.tsx
import { Context, Text, Tool, Group } from '@context-ai/core';
import { Type, type Static } from '@sinclair/typebox';

// 定义 Schema
const createOrderSchema = Type.Object({
  customerId: Type.String({
    format: 'uuid',
    description: "必须是有效的客户ID"
  }),
  items: Type.Array(
    Type.Object({
      productId: Type.String({
        minLength: 1,
        description: "商品ID不能为空"
      }),
      name: Type.String({ description: "商品名称" }),
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
    street: Type.String({ minLength: 1, description: "街道不能为空" }),
    city: Type.String(),
    zipCode: Type.String({
      pattern: '^\\d{6}$',
      description: "邮编必须是6位数字"
    }),
  }, { description: "配送地址" })),
  notes: Type.Optional(Type.String({
    maxLength: 500,
    description: "备注不能超过500字"
  })),
});

// 推断类型
type CreateOrderParams = Static<typeof createOrderSchema>;

export async function CreateOrderContext() {
  return (
    <Context name="创建订单" description="创建新订单">
      <Group title="订单信息">
        <Text>请提供订单信息，系统将自动验证数据格式。</Text>

        <Tool
          name="submit_order"
          description="提交订单"
          parameters={createOrderSchema}  // 使用 TypeBox Schema
          executor={async (params: CreateOrderParams) => {
            // params 已自动验证，类型安全
            const response = await fetch('/api/orders', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(params),
            });

            if (!response.ok) {
              return <ErrorContext message="订单创建失败" />;
            }

            const result = await response.json();
            return <OrderDetailContext orderId={result.id} />;
          }}
        />
      </Group>
    </Context>
  );
}
```

---

### 订单列表

展示数据获取和分页。

```tsx
// contexts/OrderListContext.tsx
import { Context, Text, Data, Tool, Group, Param } from '@context-ai/core';
import { state } from '@context-ai/core';

interface Order {
  id: string;
  customerName: string;
  status: 'pending' | 'processing' | 'completed' | 'cancelled';
  amount: number;
  createdAt: string;
}

interface Props {
  page?: number;
  status?: string;
}

export async function OrderListContext({ page = 1, status }: Props) {
  const token = state.get<string>('token');

  // 构建查询参数
  const params = new URLSearchParams({ page: String(page) });
  if (status) params.append('status', status);

  // 获取数据
  const response = await fetch(`/api/orders?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    return <ErrorContext message="加载订单失败" />;
  }

  const { orders, total, totalPages } = await response.json();

  // 获取用户角色
  const user = state.get<{ role: string }>('user');
  const canCreate = user?.role === 'admin' || user?.role === 'manager';

  return (
    <Context name="订单列表" description="订单管理">
      <Group title="概览" priority="high">
        <Text>共 {total} 个订单</Text>
        <Text>第 {page}/{totalPages} 页</Text>
      </Group>

      <Group title="订单列表">
        <Data
          source={orders}
          format="table"
          fields={['id', 'customerName', 'status', 'amount', 'createdAt']}
        />
      </Group>

      {/* 分页工具 */}
      <Group title="分页操作">
        {page > 1 && (
          <Tool
            name="prev_page"
            description="上一页"
            executor={() => <OrderListContext page={page - 1} />}
          />
        )}

        {page < totalPages && (
          <Tool
            name="next_page"
            description="下一页"
            executor={() => <OrderListContext page={page + 1} />}
          />
        )}
      </Group>

      {/* 筛选工具 */}
      <Group title="筛选">
        <Tool
          name="filter_by_status"
          description="按状态筛选"
          executor={(params) => (
            <OrderListContext page={1} status={params.status} />
          )}
        >
          <Param
            name="status"
            type="enum"
            enum={['pending', 'processing', 'completed', 'cancelled']}
            required
          />
        </Tool>

        <Tool
          name="clear_filter"
          description="清除筛选"
          executor={() => <OrderListContext page={1} />}
        />
      </Group>

      {/* 创建订单 */}
      {canCreate && (
        <Group title="操作">
          <Tool
            name="create_order"
            description="创建新订单"
            executor={() => <CreateOrderContext />}
          />
        </Group>
      )}

      {/* 查看详情工具 */}
      {orders.map((order: Order) => (
        <Tool
          key={order.id}
          name={`view_order_${order.id}`}
          description={`查看订单 #${order.id} - ${order.customerName}`}
          executor={() => <OrderDetailContext orderId={order.id} />}
        />
      ))}
    </Context>
  );
}
```

---

## 定时任务示例

### 数据同步任务

```typescript
// scheduler.ts
import { configure, run, scheduler } from '@context-ai/core';

await configure({
  // ... 配置
});

// 注册定时同步任务
const syncTaskId = scheduler.register(
  {
    interval: 5 * 60 * 1000, // 每 5 分钟
    immediate: true, // 立即执行一次
  },
  async () => {
    console.log('开始同步订单数据...');

    await run({
      entry: 'SyncOrders',
      storage: { type: 'memory' },
      safety: { maxCycles: 1 }, // 单次执行
    });

    console.log('同步完成');
  }
);

// 注册每日报告任务
const reportTaskId = scheduler.register(
  {
    cron: '0 9 * * *', // 每天上午 9 点
  },
  async () => {
    await run({
      entry: 'DailyReport',
      storage: { type: 'memory' },
    });
  }
);

// 取消任务
// scheduler.cancel(syncTaskId);
```

```tsx
// contexts/SyncOrdersContext.tsx
import { Context, Text } from '@context-ai/core';
import { state } from '@context-ai/core';

export async function SyncOrdersContext() {
  const token = state.get<string>('token');
  const lastSync = state.get<string>('lastSyncTime');

  // 获取需要同步的订单
  const response = await fetch(
    `/api/orders/sync?since=${lastSync || ''}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );

  const { orders, syncTime } = await response.json();

  // 更新同步时间
  state.set('lastSyncTime', syncTime);

  // 存储到本地
  const existingOrders = state.get<Order[]>('orders') || [];
  const orderMap = new Map(existingOrders.map(o => [o.id, o]));

  for (const order of orders) {
    orderMap.set(order.id, order);
  }

  state.set('orders', Array.from(orderMap.values()));

  return (
    <Context name="同步订单" description="自动同步订单数据">
      <Text>同步完成</Text>
      <Text>同步时间: {syncTime}</Text>
      <Text>更新订单数: {orders.length}</Text>
    </Context>
  );
}
```

---

## 完整应用示例

### 电商助手

```tsx
// contexts/EcommerceAssistant.tsx
import { Context, Text, Data, Tool, Group, Example } from '@context-ai/core';
import { state } from '@context-ai/core';

export async function EcommerceAssistant() {
  const user = state.get<{ name: string; role: string }>('user');
  const cart = state.get<{ items: Array<{ id: string; name: string; quantity: number }> }>('cart') || { items: [] };

  return (
    <Context
      name="电商助手"
      description="智能电商购物助手"
      priority="high"
    >
      {/* 欢迎语 */}
      <Group title="欢迎" priority="high">
        <Text>你好{user ? `，${user.name}` : ''}！我是你的专属购物助手。</Text>
        <Text>我可以帮你：</Text>
        <Text>- 搜索商品</Text>
        <Text>- 管理购物车</Text>
        <Text>- 查询订单</Text>
        <Text>- 处理售后</Text>
      </Group>

      {/* 购物车 */}
      {cart.items.length > 0 && (
        <Group title="购物车" priority="high">
          <Text>当前有 {cart.items.length} 件商品</Text>
          <Data
            source={cart.items}
            format="list"
            fields={['name', 'quantity']}
          />

          <Tool
            name="view_cart"
            description="查看购物车详情"
            executor={() => <CartContext />}
          />

          <Tool
            name="checkout"
            description="去结算"
            executor={() => <CheckoutContext />}
          />
        </Group>
      )}

      {/* 主要功能 */}
      <Group title="功能菜单">
        <Tool
          name="search_products"
          description="搜索商品"
          executor={(params: { keyword: string }) => (
            <ProductSearchContext keyword={params.keyword} />
          )}
        >
          <Param name="keyword" type="string" required description="搜索关键词" />
        </Tool>

        <Tool
          name="view_orders"
          description="查看我的订单"
          executor={() => <OrderListContext />}
        />

        <Tool
          name="customer_service"
          description="联系客服"
          executor={() => <CustomerServiceContext />}
        />
      </Group>

      {/* 使用示例 */}
      <Group title="使用示例" collapsed={true}>
        <Example title="搜索商品">
          <Text type="user">我想买一台笔记本电脑</Text>
          <Text type="assistant">我来帮您搜索笔记本电脑。</Text>
          <Tool name="search_products" args={{ keyword: "笔记本电脑" }} />
        </Example>

        <Example title="查看订单">
          <Text type="user">我的订单到哪了？</Text>
          <Text type="assistant">我来帮您查看订单状态。</Text>
          <Tool name="view_orders" />
        </Example>
      </Group>
    </Context>
  );
}
```

---

### 错误处理

```tsx
// contexts/ErrorContext.tsx
import { Context, Text, Tool, Group } from '@context-ai/core';

interface Props {
  message: string;
  code?: string;
  retry?: () => JSX.Element;
}

export async function ErrorContext({ message, code, retry }: Props) {
  return (
    <Context name="错误" description="发生错误" priority="high">
      <Group title="错误信息">
        <Text priority="high">抱歉，发生了错误。</Text>
        <Text>{message}</Text>
        {code && <Text>错误代码: {code}</Text>}
      </Group>

      {retry && (
        <Group title="操作">
          <Tool
            name="retry"
            description="重试"
            executor={retry}
          />

          <Tool
            name="go_home"
            description="返回首页"
            executor={() => <DashboardContext />}
          />
        </Group>
      )}
    </Context>
  );
}
```

---

### 应用入口

```typescript
// main.ts
import { configure, run } from '@context-ai/core';
import 'dotenv/config';

// 根据环境加载配置
const isDev = process.env.NODE_ENV === 'development';

await configure({
  contexts: {
    lazy: {
      EcommerceAssistant: () => import('./contexts/EcommerceAssistant'),
      Dashboard: () => import('./contexts/Dashboard'),
      OrderList: () => import('./contexts/OrderList'),
      OrderDetail: () => import('./contexts/OrderDetail'),
      ProductSearch: () => import('./contexts/ProductSearch'),
      Cart: () => import('./contexts/Cart'),
      Checkout: () => import('./contexts/Checkout'),
      CustomerService: () => import('./contexts/CustomerService'),
      Error: () => import('./contexts/ErrorContext'),
    },
    preload: ['EcommerceAssistant'],
  },
  llm: {
    default: 'openai',
    providers: {
      openai: {
        apiKey: process.env.OPENAI_API_KEY!,
        model: isDev ? 'gpt-3.5-turbo' : 'gpt-4',
        timeout: 30000,
      },
    },
  },
  storage: {
    type: 'file',
    path: './data/state.json',
    format: 'json',
  },
  security: {
    loop: {
      maxCycles: 20,
      maxDuration: 5 * 60 * 1000, // 5分钟
    },
  },
});

// 启动应用
const controller = await run({
  entry: 'EcommerceAssistant',
  instanceId: generateSessionId(),
  storage: {
    type: 'file',
    path: './data/state.json',
  },
  safety: {
    maxCycles: 20,
    maxDuration: 5 * 60 * 1000,
  },
  hooks: {
    onCycle: (result) => {
      console.log(`[Cycle ${result.cycleId}] ${result.contextName}`);
    },
    onError: (error) => {
      console.error('[Error]', error);
      return error.recoverable;
    },
  },
});

// 优雅退出
process.on('SIGINT', async () => {
  console.log('\n正在关闭...');
  await controller.stop();
  process.exit(0);
});

function generateSessionId() {
  return `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
```

---

## 更多示例

更多示例请参考：

- [官方示例仓库](https://github.com/context-ai/examples)
- [模板项目](https://github.com/context-ai/templates)
