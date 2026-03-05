# AI Video Agent

基于 `@mariozechner/pi-agent-core` 的智能视频生成 Agent，能够自主根据分镜文件和参考图片生成视频。

## 安装

```bash
pnpm install
pnpm build
```

## 配置

创建 `.env` 文件或设置环境变量：

```env
# API 配置 (必需)
API_KEY=ur7T7a9dqcQVVAdX-4AtjOjog6FFLvWAJr1a-WL3
API_BASE_URL=https://ai.bowong.cc

# 可选: 自定义聊天模型
CHAT_MODEL=volcengine/doubao-seed-2-0-pro-260215
```

## 使用方法

### CLI 命令

```bash
# 查看帮助
node dist/cli/index.js --help

# 查看可用模型
node dist/cli/index.js models

# 生成视频
node dist/cli/index.js start ./inputs -o ./outputs

# 带参数生成
node dist/cli/index.js start ./inputs \
  -o ./outputs \
  --model google-vertex-ai/veo-3.1-fast-generate-001 \
  --resolution 1920x1080 \
  --duration 5 \
  --verbose

# 使用配置文件 (JSON 或 .env)
node dist/cli/index.js start ./inputs --config ./config.json
node dist/cli/index.js start ./inputs --config ./.env
```

### 编程方式使用

```typescript
import { VideoAgent } from '@repo/ai-video';

const agent = new VideoAgent({
  inputDir: './inputs',
  outputDir: './outputs',
  apiKey: process.env.API_KEY,
  videoConfig: {
    model: 'volcengine/doubao-seedance-1-0-pro-fast-251015',
    resolution: '1920x1080',
    duration: 5,
  },
  callbacks: {
    onStream: (text) => process.stdout.write(text),
    onProgress: (msg) => console.log(`[进度] ${msg}`),
    onComplete: (path) => console.log(`完成: ${path}`),
  },
});

const outputPath = await agent.generateVideo();
```

## 可用模型

### 视频生成模型

| 模型 | 速度 | 描述 |
|------|------|------|
| `google-vertex-ai/veo-3.1-generate-001` | slow | Google 最新视频生成模型，高质量输出 |
| `google-vertex-ai/veo-3.1-fast-generate-001` | fast | Google 快速视频生成模型 |
| `volcengine/doubao-seedance-1-5-pro-251215` | medium | 火山引擎最新视频生成模型 |
| `volcengine/doubao-seedance-1-0-pro-fast-251015` | fast | 火山引擎快速视频生成模型 (推荐) |
| `volcengine/doubao-seedance-1-0-pro-250528` | medium | 火山引擎视频生成模型 |

### 图片生成模型

| 模型 | 描述 |
|------|------|
| `google-vertex-ai/gemini-2.5-flash-image` | Google 图片生成模型 |
| `volcengine/doubao-seedream-5-0-260128` | 火山引擎图片生成模型 |

### 聊天模型 (Agent 推理)

| 模型 | 描述 |
|------|------|
| `volcengine/doubao-seed-2-0-pro-260215` | 火山引擎豆包 Pro (默认) |
| `azure/gpt-4o-1120` | Azure GPT-4o |
| `google-vertex-ai/gemini-2.5-flash` | Google Gemini Flash |

## 工作流程

1. **读取输入文件** - 解析分镜 Excel 和参考图片
2. **分析内容** - 理解分镜内容和图片风格
3. **生成提示词** - 创建适合视频生成的提示词
4. **提交任务** - 调用视频生成 API
5. **等待完成** - 轮询任务状态直到完成
6. **保存视频** - 下载到输出目录

## 输入格式

### 分镜文件 (Excel)

支持的列名：
- 序号 / 编号 / index
- 场景 / scene
- 角色 / character
- 动作 / action
- 镜头 / shot
- 对白 / dialogue
- 时长 / duration
- 提示词 / prompt

### 参考图片

支持的格式：`.jpg`, `.jpeg`, `.png`, `.gif`, `.webp`

文件名识别：
- 角色图：包含 `角色`、`character`、`人像`
- 场景图：包含 `场景`、`scene`、`背景`
- 风格图：包含 `风格`、`style`、`参考`

## 项目结构

```
packages/ai-video/
├── src/
│   ├── index.ts              # 模块入口
│   ├── types.ts              # 类型定义
│   ├── agent/
│   │   ├── VideoAgent.ts     # 主 Agent 实现
│   │   └── tools/            # 工具定义
│   ├── cli/index.ts          # CLI 入口
│   └── utils/                # 工具函数
├── inputs/                   # 输入文件
├── outputs/                  # 输出视频
└── package.json
```

## License

MIT
