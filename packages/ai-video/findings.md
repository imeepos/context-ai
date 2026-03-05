# AI Video Agent 研究发现

## 项目结构发现

### 1. pi-agent-core 框架
- **位置**: `pi-mono/packages/agent/`
- **核心类**: `Agent` 类，支持工具调用和事件流
- **浏览器版本**: `@mariozechner/pi-agent-core/browser`

#### 关键 API
```typescript
// 创建 Agent
const agent = new Agent({
  initialState: {
    systemPrompt: string,
    model: Model<any>,
    tools: AgentTool[],
    messages: AgentMessage[],
  },
  getApiKey: () => Promise<string> | string,
});

// 订阅事件
agent.subscribe((event) => {
  // event.type: message_update, tool_execution_start, turn_end, agent_end
});

// 发送消息
await agent.prompt("Hello");
```

### 2. 现有 Agent 实现参考
- **StoryboardAgent**: `apps/Toonflow-web/src/utils/browserAgent/storyboardAgent.ts`
  - 完整的 Agent 实现，包含子 Agent 调用
  - 使用 DeepSeek 模型
  - 实现了多种工具: segmentAgent, shotAgent, getScript, generateShotImage 等

### 3. 视频生成相关

#### ToonflowVideoController (SDK)
- **位置**: `packages/sdk/src/controllers/toonflow-video.controller.ts`
- **主要方法**:
  - `submit()`: 提交视频生成任务
  - `taskStatus()`: 查询任务状态
  - `generate()`: 生成视频
  - `getModels()`: 获取可用模型

#### VideoToolService (ai-tools)
- **位置**: `packages/ai-tools/src/tools/video-tool.ts`
- **外部 API**: `https://bowongai-dev--text-video-agent-fastapi-app.modal.run`
- **方法**:
  - `generate()`: 根据描述生成视频
  - `getStatus()`: 查询任务状态
  - `getModels()`: 获取模型列表

### 4. 输入文件格式

#### 分镜文件 (Excel)
- 文件: `分镜优化.xlsx`
- 需要解析: 分镜描述、场景、角色等信息

#### 参考图片
- 角色图/场景图片/风格图
- 用于提供视觉参考

### 5. 输出要求
- 视频格式: MP4
- 输出路径: `outputs/` 目录
- 文件命名: hash 值 (如 `4a4276b63d7a099ee507f78d4414beef.mp4`)

---

## 技术决策

### 1. Agent 模型选择
- **推荐**: DeepSeek (与 StoryboardAgent 一致)
- **API 配置**:
  ```typescript
  const DEEPSEEK_BASE_URL = "https://api.deepseek.com";
  const DEEPSEEK_MODEL = "deepseek-chat";
  ```

### 2. 视频生成 API 选择
- **方案 A**: 使用 `@repo/sdk` 的 `ToonflowVideoController`
  - 优点: 与现有系统集成
  - 缺点: 需要 session 认证

- **方案 B**: 直接调用外部 API (VideoToolService)
  - 优点: 无需认证，更简单
  - 缺点: 需要配置 API Key

### 3. Excel 解析
- **库选择**: `xlsx` (SheetJS)
- **安装**: `pnpm add xlsx`

---

## 待确认问题

1. [ ] 分镜 Excel 文件的具体格式是什么？
2. [ ] 视频生成 API 需要什么认证方式？
3. [ ] 是否需要支持多种视频生成模型？
4. [ ] 错误重试策略？

---

## 参考资料

- [pi-agent-core README](../pi-mono/packages/agent/README.md)
- [StoryboardAgent 实现](../apps/Toonflow-web/src/utils/browserAgent/storyboardAgent.ts)
- [VideoToolService 实现](../packages/ai-tools/src/tools/video-tool.ts)
