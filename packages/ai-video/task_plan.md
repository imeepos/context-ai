# AI Video Agent 实现计划

## 目标
设计并实现一个视频生成 Agent，能够自主根据输入的分镜文件和参考图片生成目标视频。

## 输入
- 分镜文件: `inputs/分镜优化.xlsx` (Excel 格式)
- 参考图片: `inputs/微信图片_*.jpg` (角色图/场景图片/风格图)

## 输出
- 生成视频: `outputs/{hash}.mp4`

## 技术栈
- Agent 框架: `@mariozechner/pi-agent-core`
- CLI 工具: 命令行工具 `ai-video start ./sources`
- 视频生成 API: 通过 `@repo/sdk` 的 `ToonflowVideoController`

---

## Phase 1: 项目初始化与架构设计
状态: `pending`

### 任务
- [ ] 1.1 创建 `package.json` 和项目依赖配置
- [ ] 1.2 设置 TypeScript 配置 (`tsconfig.json`)
- [ ] 1.3 设计 Agent 架构和工具定义
- [ ] 1.4 定义 CLI 命令接口

### 架构设计
```
ai-video/
├── src/
│   ├── index.ts              # CLI 入口
│   ├── agent/
│   │   ├── VideoAgent.ts     # 主 Agent 实现
│   │   └── tools/            # Agent 工具集
│   │       ├── readStoryboard.ts   # 读取分镜文件
│   │       ├── readImages.ts       # 读取参考图片
│   │       ├── generateVideo.ts    # 生成视频
│   │       └── checkStatus.ts      # 检查任务状态
│   ├── cli/
│   │   └── commands.ts       # CLI 命令定义
│   └── utils/
│       ├── xlsxParser.ts     # Excel 解析
│       └── fileUtils.ts      # 文件工具
├── inputs/                   # 输入文件目录
├── outputs/                  # 输出文件目录
└── package.json
```

---

## Phase 2: 核心工具实现
状态: `pending`

### 任务
- [ ] 2.1 实现 Excel 分镜解析工具 (`readStoryboard`)
- [ ] 2.2 实现图片读取和分析工具 (`readImages`)
- [ ] 2.3 实现视频生成 API 集成 (`generateVideo`)
- [ ] 2.4 实现任务状态轮询工具 (`checkStatus`)

### 工具详细设计

#### 2.1 readStoryboard 工具
- 输入: Excel 文件路径
- 输出: 结构化的分镜数据 (JSON)
- 依赖: `xlsx` 库解析 Excel

#### 2.2 readImages 工具
- 输入: 图片文件路径列表
- 输出: 图片描述和特征信息
- 功能: 使用 Vision API 分析图片内容

#### 2.3 generateVideo 工具
- 输入: 分镜数据 + 参考图片 + 配置参数
- 输出: 任务 ID
- 集成: `ToonflowVideoController.submit()` 或外部视频生成 API

#### 2.4 checkStatus 工具
- 输入: 任务 ID
- 输出: 任务状态 (pending/success/failed) + 结果 URL

---

## Phase 3: Agent 实现
状态: `pending`

### 任务
- [ ] 3.1 实现 VideoAgent 主类
- [ ] 3.2 定义 System Prompt
- [ ] 3.3 实现工具注册和执行逻辑
- [ ] 3.4 实现错误处理和重试机制

### Agent 工作流程
```
1. 读取输入目录
   ↓
2. 解析分镜文件 (Excel)
   ↓
3. 读取参考图片
   ↓
4. 分析内容，生成视频提示词
   ↓
5. 提交视频生成任务
   ↓
6. 轮询任务状态
   ↓
7. 下载生成结果到 outputs 目录
```

---

## Phase 4: CLI 实现
状态: `pending`

### 任务
- [ ] 4.1 实现 CLI 入口 (`ai-video start ./sources`)
- [ ] 4.2 实现进度显示
- [ ] 4.3 实现错误输出
- [ ] 4.4 添加配置文件支持 (可选)

### CLI 命令
```bash
# 启动视频生成
ai-video start ./sources

# 指定输出目录
ai-video start ./sources --output ./outputs

# 指定配置文件
ai-video start ./sources --config ./config.json
```

---

## Phase 5: 测试与验证
状态: `pending`

### 任务
- [ ] 5.1 单元测试: 工具函数测试
- [ ] 5.2 集成测试: Agent 完整流程测试
- [ ] 5.3 使用实际输入文件进行端到端测试
- [ ] 5.4 验证输出视频质量

---

## 关键技术点

### 1. pi-agent-core 使用
参考 `StoryboardAgent` 实现:
```typescript
import { Agent, type AgentTool } from "@mariozechner/pi-agent-core";

const agent = new Agent({
  initialState: {
    systemPrompt: "...",
    model: deepseekModel,
    tools: [tool1, tool2, ...],
  },
  getApiKey: async () => API_KEY,
});
```

### 2. 视频生成 API 集成
两种方式:
- 方式 A: 使用 `@repo/sdk` 的 `ToonflowVideoController` (需要 session)
- 方式 B: 直接调用外部 API (如 `VideoToolService`)

### 3. Excel 解析
使用 `xlsx` 库:
```typescript
import * as XLSX from 'xlsx';
const workbook = XLSX.readFile(filePath);
const sheet = workbook.Sheets[workbook.SheetNames[0]];
const data = XLSX.utils.sheet_to_json(sheet);
```

---

## 依赖
```json
{
  "dependencies": {
    "@mariozechner/pi-agent-core": "^0.55.4",
    "@mariozechner/pi-ai": "^0.55.4",
    "@sinclair/typebox": "^0.34.x",
    "xlsx": "^0.18.x",
    "commander": "^12.x",
    "chalk": "^5.x",
    "ora": "^8.x"
  }
}
```

---

## 错误记录
| 错误 | 尝试 | 解决方案 |
|------|------|----------|
| - | - | - |

---

## 更新日志
- 2025-03-05: 初始计划创建
