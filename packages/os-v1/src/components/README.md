# Common Components

提供通用的页面组件，用于构建统一的页面布局和导航。

## 组件列表

### Header

页面头部组件，提供：
- 系统标题
- 当前页面信息
- 所有可用页面列表（可选）

### Footer

页面底部组件，提供：
- 版本信息
- 帮助提示
- 系统状态

### Layout

完整的页面布局组件，提供：
- Header + Content + Footer 布局
- `navigateTo` 工具：页面跳转
- `getPageSchema` 工具：查询页面 Props Schema
- `listAllPages` 工具：列出所有页面

## 核心能力

### 1. 获取所有 Page 路径、名字、描述

通过 `listAllPages` 工具：

```typescript
// 在 Layout 组件中自动提供
// 用户可以直接调用 listAllPages 工具获取所有页面信息
```

输出示例：
```
✓ 系统页面列表

系统中共注册了 4 个页面：

**workflow://** (4 pages)

  • **workflow-list**
    - Path: workflow://list
    - Description: 列出所有工作流...

  • **workflow-create**
    - Path: workflow://create
    - Description: 创建新的滚动规划工作流...

  • **workflow-detail**
    - Path: workflow://detail/:workflowId
    - Description: 查看工作流详情和滚动窗口...

  • **workflow-execute**
    - Path: workflow://execute/:workflowId
    - Description: 自动执行整个工作流...
```

### 2. 获取给定路径的 Props Schema

通过 `getPageSchema` 工具：

```typescript
// 查询工作流详情页的 Schema
getPageSchema({ path: "workflow://detail/:workflowId" })
```

输出示例：
```
✓ 页面 Schema 查询成功

**页面信息:**
• Name: workflow-detail
• Path: workflow://detail/:workflowId
• Description: 查看工作流详情和滚动窗口...

**Props Schema:**
• Type: object
• Required Fields: workflowId

**参数说明:**
• **workflowId** (string) [必需]: 工作流 ID

**完整 Schema (JSON):**
{
  "type": "object",
  "properties": {
    "workflowId": {
      "type": "string",
      "description": "工作流 ID"
    }
  },
  "required": ["workflowId"]
}
```

### 3. 运行 path + params

通过 `navigateTo` 工具：

```typescript
// 导航到工作流详情页
navigateTo({
    path: "workflow://detail/workflow-123",
    prompt: "查看当前进度和窗口状态"
})
```

输出示例：
```
✓ 页面跳转成功

目标页面: workflow://detail/workflow-123

--- 页面输出 ---

[工作流详情页的完整输出]

--- 输出结束 ---

工具调用次数: 0
```

## 使用示例

### 基础使用（仅布局）

```tsx
import { Layout } from '../components/index.js';

export const MyPageFactory: ComponentFactory<MyProps> = async (props, injector) => {
    return (
        <Layout
            name="My Page"
            description="This is my custom page"
            currentPath="myapp://mypage"
        >
            <Group title="My Content">
                <Text>Your page content here</Text>
            </Group>
        </Layout>
    );
};
```

### 完整配置

```tsx
import { Layout } from '../components/index.js';

export const MyPageFactory: ComponentFactory<MyProps> = async (props, injector) => {
    return (
        <Layout
            name="My Page"
            description="This is my custom page"
            currentPath="myapp://mypage"
            header={{
                show: true,                // 显示 Header
                showPageList: true,        // 显示所有页面列表
                customTitle: "My Custom Title"  // 自定义标题
            }}
            footer={{
                show: true,                // 显示 Footer
                showVersion: true,         // 显示版本信息
                showHelp: true,            // 显示帮助信息
                customText: "Powered by My App"  // 自定义底部文本
            }}
            enableNavigation={true}        // 启用 navigateTo 工具
            enableSchemaQuery={true}       // 启用 getPageSchema 工具
        >
            <Group title="My Content">
                <Text>Your page content here</Text>

                <Tool
                    name="myTool"
                    description="My custom tool"
                    parameters={Type.Object({})}
                    execute={async () => {
                        // 工具逻辑
                        return {
                            content: [{ type: 'text', text: 'Success!' }],
                            details: null
                        };
                    }}
                />
            </Group>
        </Layout>
    );
};
```

### 最小化配置（无导航工具）

```tsx
import { Layout } from '../components/index.js';

export const MyPageFactory: ComponentFactory<MyProps> = async (props, injector) => {
    return (
        <Layout
            name="Simple Page"
            description="A simple page without navigation tools"
            header={{ show: false }}           // 隐藏 Header
            footer={{ show: false }}           // 隐藏 Footer
            enableNavigation={false}           // 禁用 navigateTo 工具
            enableSchemaQuery={false}          // 禁用 getPageSchema 工具
        >
            <Group title="Content">
                <Text>Minimal page content</Text>
            </Group>
        </Layout>
    );
};
```

## 组件依赖

所有组件都依赖以下 Token：

- `PAGES`: 获取所有注册的页面
- `APPLICATIONS`: 获取所有注册的应用
- `ACTION_EXECUTER`: 执行 Action（用于 navigateTo）
- `LOOP_REQUEST_TOKEN`: 页面跳转令牌

这些 Token 会自动从 Injector 中获取，无需手动注入。

## 工具参考

### navigateTo

**参数：**
- `path` (string, 必需): 目标页面路径
- `prompt` (string, 必需): 要在目标页面执行的提示词

**返回：**
- `success`: 是否成功跳转
- `output`: 目标页面的输出内容
- `error`: 错误信息（如果失败）
- `toolCallsCount`: 工具调用次数

### getPageSchema

**参数：**
- `path` (string, 必需): 页面路径

**返回：**
- 页面的完整 Props Schema 定义
- 参数说明（类型、是否必需、描述）
- JSON 格式的 Schema

### listAllPages

**参数：**
无

**返回：**
- 所有页面的列表
- 按应用分组
- 包含路径、名称、描述

## 注意事项

1. **路径匹配**：`currentPath` 参数用于在 Header 中高亮当前页面，匹配逻辑会去除路径参数部分
2. **导航工具**：`navigateTo` 实际上是通过 `LOOP_REQUEST_TOKEN` 执行页面跳转，会创建新的 Agent 上下文
3. **Schema 查询**：`getPageSchema` 返回的是 TypeBox Schema，可以用于参数验证
4. **性能考虑**：如果页面列表很长，建议设置 `header.showPageList=false` 以减少上下文占用
