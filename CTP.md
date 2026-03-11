# CTP-Lite (Context Protocol Lite)

> **Dynamic Context & Tools for pi-mono**
> React-style dynamic context generation for pi-coding-agent

## 核心定位

CTP-Lite 是 [pi-mono](https://github.com/mariozechner/pi-mono) 生态的扩展层，为 `pi-coding-agent` 提供**动态上下文管理**和**动态工具生成**能力：

```
┌─────────────────────────────────────────────────────────────────┐
│                     pi-coding-agent                             │
│                    (Mario Zechner)                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │   bash      │  │  read/write │  │    edit     │             │
│  └─────────────┘  └─────────────┘  └─────────────┘             │
│                           │                                     │
├───────────────────────────┼─────────────────────────────────────┤
│      CTP-Lite Extension   │                                     │
│                           ▼                                     │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  JSX Components  ──▶  Dynamic Context  ──▶  Tools      │   │
│  │                                                           │   │
│  │  <Context name="Order">                                   │   │
│  │    <Data source="/api/orders" />                          │   │
│  │    <Tool name="cancel" executor={...} />                  │   │
│  │  </Context>                                               │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

## 核心价值

| 能力 | pi-coding-agent (原生) | CTP-Lite (扩展) |
|------|------------------------|-----------------|
| 工具定义 | 静态配置 | **JSX 动态生成** |
| 上下文管理 | 文件-based | **组件化、状态驱动** |
| 数据展示 | 文本/JSON | **结构化渲染** (Table/List) |
| 工作流 | 线性对话 | **状态机式导航** |
| 场景切换 | 手动 | **自动上下文切换** |

## 快速开始

### 安装

```bash
npm install -g @mariozechner/pi  # 安装 pi-coding-agent
npm install ctp-lite             # 安装 CTP-Lite 扩展
```

### 创建动态 Context

```tsx
// contexts/OrderList.tsx
import { Context, Text, Data, Tool, Group } from 'ctp-lite';
import { useState, useTools } from 'ctp-lite/hooks';

export async function OrderListContext() {
  // 状态管理（与 pi-agent 会话状态同步）
  const [page, setPage] = useState(1);
  const { data: orders } = await useTools.fetch(`/api/orders?page=${page}`);

  return (
    <Context name="订单列表" description="管理客户订单">
      <Group title="概览">
        <Text>共 {orders.total} 个订单，第 {page} 页</Text>
        <Data source={orders.items} format="table" fields={['id', 'status', 'amount']} />
      </Group>

      {/* 动态生成工具 - 自动注册到 pi-agent */}
      {orders.items.map(order => (
        <Tool
          key={order.id}
          name={`view_order_${order.id}`}
          description={`查看订单 ${order.id}`}
          parameters={Type.Object({})}
          executor={async () => <OrderDetailContext id={order.id} />}
        />
      ))}

      <Tool
        name="next_page"
        description="下一页"
        executor={() => { setPage(p => p + 1); return <OrderListContext />; }}
      />
    </Context>
  );
}
```

### 集成到 pi-coding-agent

```typescript
// pi.config.ts
import { defineConfig } from '@mariozechner/pi';
import { ctpPlugin } from 'ctp-lite/pi-plugin';

export default defineConfig({
  extensions: [
    ctpPlugin({
      // CTP-Lite 自动为 pi-agent 提供动态工具
      contexts: {
        OrderList: () => import('./contexts/OrderList'),
        Dashboard: () => import('./contexts/Dashboard'),
      },

      // 自动将 CTP 工具转换为 pi-agent 工具格式
      toolAdapter: {
        // 转换逻辑...
      }
    })
  ]
});
```

### 使用

用户可以在 `pi` 对话中：

```
User: 帮我看看订单
[CTP-Lite 渲染 OrderListContext]
[自动生成工具: view_order_001, view_order_002, next_page]

AI: 当前有 50 个订单，第 1 页：
    | ID | Status | Amount |
    |----|--------|--------|
    | 001| pending| $100   |

    可用操作：
    - view_order_001: 查看订单 001
    - next_page: 下一页

User: 查看订单 001
[CTP-Lite 切换到 OrderDetailContext]
```

---

## 架构

```
┌─────────────────────────────────────────────────────────────────┐
│                      pi-coding-agent                            │
│                         (Host)                                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              CTP-Lite Extension Layer                    │   │
│  │                                                          │   │
│  │  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐  │   │
│  │  │  JSX Parser │───▶│  Renderer   │───▶│  Tool Gen   │  │   │
│  │  │             │    │             │    │             │  │   │
│  │  └─────────────┘    └─────────────┘    └─────────────┘  │   │
│  │         │                   │                  │        │   │
│  │         ▼                   ▼                  ▼        │   │
│  │  ┌─────────────────────────────────────────────────────┐│   │
│  │  │              Context State Manager                 ││   │
│  │  │  - 与 pi-agent session 同步                       ││   │
│  │  │  - 上下文路由导航                                  ││   │
│  │  │  - 状态持久化                                      ││   │
│  │  └─────────────────────────────────────────────────────┘│   │
│  └─────────────────────────────────────────────────────────┘   │
│                              │                                  │
│                              │ Adapter                          │
│                              ▼                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              pi-agent-core Integration                 │   │
│  │  - 工具注册/注销                                        │   │
│  │  - 事件监听                                             │   │
│  │  - 状态同步                                             │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 数据流

```
User Input
    │
    ▼
pi-coding-agent (处理意图)
    │
    ▼
CTP-Lite Router (确定 Context)
    │
    ▼
Render JSX Component
    │
    ├─▶ Generate Prompt (给 AI)
    ├─▶ Generate Tools (给 pi-agent)
    └─▶ Render Data View (给用户)
    │
    ▼
AI Decision (使用工具)
    │
    ▼
Tool Execution (pi-agent 执行)
    │
    ▼
Re-render (新 Context)
```

---

## 核心组件

### 1. Context - 上下文容器

```tsx
<Context
  name="订单详情"
  description="显示单个订单的详细信息"
  model="gpt-4"  // 可指定不同模型
>
  {/* 内容 */}
</Context>
```

### 2. Data - 数据展示

```tsx
<Data
  source={orders}
  format="table"        // table | list | json | chart
  fields={['id', 'status']}
  filterable
  sortable
/>
```

### 3. Tool - 动态工具

```tsx
<Tool
  name="cancel_order"
  description="取消订单"
  parameters={Type.Object({
    reason: Type.String({ description: "取消原因" })
  })}  // TypeBox Schema
  executor={async (params) => {
    // 执行取消
    await api.cancel(orderId, params.reason);

    // 返回新 Context（自动导航）
    return <OrderListContext />;
  }}
/>
```

### 4. Group - 分组组织

```tsx
<Group title="操作" priority="high" collapsed={false}>
  <Tool ... />
  <Tool ... />
</Group>
```

### 5. Slot/Fill - 扩展点

```tsx
// 基础布局定义插槽
<Context name="工作台">
  <Slot name="sidebar" />
  <Slot name="main" />
</Context>

// 具体场景填充
<Context name="订单工作台" extends="工作台">
  <Fill slot="sidebar"><OrderFilter /></Fill>
  <Fill slot="main"><OrderList /></Fill>
</Context>
```

---

## 与 pi-mono 集成

### 作为 pi-plugin

```typescript
// pi.config.ts
import { ctpPlugin } from 'ctp-lite/pi-plugin';

export default {
  plugins: [
    ctpPlugin({
      // 上下文目录
      contextsDir: './contexts',

      // 自动工具注册
      autoRegisterTools: true,

      // 状态同步
      stateSync: {
        enabled: true,
        storage: 'session'  // 与 pi-agent 会话同步
      },

      // 自定义渲染器
      renderers: {
        table: 'pi-tui',    // 使用 pi-tui 渲染表格
        chart: 'ascii'      // ASCII 图表
      }
    })
  ]
};
```

### 动态工具注册

```typescript
// CTP-Lite 自动将 JSX Tool 转换为 pi-agent 工具格式

// CTP 定义
<Tool
  name="search_orders"
  description="搜索订单"
  parameters={Type.Object({
    keyword: Type.String({ description: "搜索关键词" })
  })}
  executor={...}
/>

// 自动转换为 pi-agent 格式
{
  name: "search_orders",
  description: "搜索订单",
  parameters: {
    type: "object",
    properties: {
      keyword: { type: "string" }
    }
  },
  execute: async (args) => {
    // CTP-Lite 处理 JSX 渲染
    return await ctp.execute('search_orders', args);
  }
}
```

### 会话状态同步

```typescript
// CTP-Lite 状态与 pi-agent session 同步
import { useState } from 'ctp-lite';

function MyContext() {
  // 自动同步到 pi-agent session
  const [count, setCount] = useState(0, { sync: true });

  // 用户切换对话后返回，状态保留
}
```

---

## 使用场景

### 场景 1：动态数据探索

```tsx
// contexts/DataExplorer.tsx
export function DataExplorerContext({ table }: { table: string }) {
  const [filters, setFilters] = useState({});
  const schema = useTools.fetchSchema(table);
  const data = useTools.query(table, filters);

  return (
    <Context name={`浏览 ${table}`}>
      {/* 自动生成筛选工具 */}
      {schema.columns.map(col => (
        <Tool
          name={`filter_${col.name}`}
          description={`按 ${col.name} 筛选`}
          executor={async (value) => {
            setFilters(f => ({ ...f, [col.name]: value }));
          }}
        />
      ))}

      <Data source={data} format="table" pageable />
    </Context>
  );
}
```

### 场景 2：向导式工作流

```tsx
// contexts/CreateOrderWorkflow.tsx
export function CreateOrderWorkflow({ step = 1 }) {
  const [orderData, setOrderData] = useState({});

  const steps = [
    <SelectCustomerStep onSelect={...} />,
    <AddItemsStep onAdd={...} />,
    <ConfirmOrderStep data={orderData} />,
  ];

  return (
    <Context name="创建订单">
      <Progress current={step} total={3} />
      {steps[step - 1]}
    </Context>
  );
}
```

### 场景 3：动态仪表板

```tsx
export function DashboardContext() {
  const widgets = useTools.fetchWidgets();

  return (
    <Context name="仪表板">
      <Grid columns={2}>
        {widgets.map(widget => (
          <Widget
            key={widget.id}
            type={widget.type}
            data={widget.data}
          />
        ))}
      </Grid>

      <Tool name="refresh" description="刷新数据" executor={...} />
      <Tool name="add_widget" description="添加组件" executor={...} />
    </Context>
  );
}
```

---

## 目录

- [架构设计](./CTP-ARCHITECTURE.md) - 与 pi-mono 的集成架构
- [API 参考](./CTP-API.md) - 组件 API 和 Hooks
- [Pi 集成指南](./CTP-PI-INTEGRATION.md) - 如何作为 pi-plugin 使用
- [示例代码](./CTP-EXAMPLES.md) - 完整示例
- [迁移指南](./CTP-MIGRATION.md) - 从静态工具迁移到动态 Context

---

## License

MIT - 与 pi-mono 保持一致
