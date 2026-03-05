/**
 * VideoAgent - 视频生成 Agent
 * 基于 @mariozechner/pi-agent-core 实现
 */

import { Agent } from '@mariozechner/pi-agent-core';
import type { Model } from '@mariozechner/pi-ai';
import * as fs from 'fs';
import * as path from 'path';
import { createAllTools } from './tools/index.js';
import type { AgentContext, VideoGenerationConfig } from '../types.js';


function createChatModel(): Model<'openai-completions'> {
  const defaultChatModel = process.env.CHAT_MODEL || 'volcengine/doubao-seed-2-0-pro-260215';
  return {
    id: defaultChatModel,
    name: 'Doubao Seed Pro',
    api: 'openai-completions',
    provider: 'volcengine',
    baseUrl: 'https://ai.bowong.cc',
    reasoning: false,
    input: ['text'],
    cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
    contextWindow: 128000,
    maxTokens: 8000,
  };
}

/** 默认 System Prompt */
const DEFAULT_SYSTEM_PROMPT = `你是一个专业的视频生成助手。你的任务是帮助用户根据分镜文件和参考图片生成视频。

## 你的能力
1. 读取并分析分镜 Excel 文件
2. 读取和分析参考图片
3. 生成适合视频的提示词
4. 调用视频生成 API
5. 监控任务状态
6. 保存生成的视频

## 工作流程
当用户请求生成视频时，请按以下步骤执行：

1. **读取输入文件**
   - 使用 \`read_storyboard\` 读取分镜文件
   - 使用 \`read_images\` 读取参考图片

2. **分析内容并生成提示词**
   - 根据分镜内容，生成连贯的视频描述
   - 结合参考图片的风格和特征
   - 提示词应该描述完整的视频场景和动作

3. **选择模型和参数**
   - 使用 \`get_video_models\` 查看可用模型
   - 根据需求选择合适的分辨率和时长

4. **生成视频**
   - 使用 \`generate_video\` 提交视频生成任务
   - 记录返回的任务 ID

5. **等待完成**
   - 使用 \`check_task_status\` 检查任务状态
   - 设置 wait=true 等待任务完成

6. **保存视频**
   - 使用 \`save_video\` 下载并保存视频到输出目录

## 提示词生成指南
- 使用清晰、具体的描述
- 包含场景、角色、动作、镜头等元素
- 考虑视频的连贯性和流畅性
- 控制提示词长度，避免过于冗长

## 注意事项
- 每个分镜可能对应一个独立的视频片段
- 确保视频风格与参考图片一致
- 生成失败时可以重试或调整参数
`;

/** 回调接口 */
export interface VideoAgentCallbacks {
  /** 流式文本输出 */
  onStream?: (text: string) => void;
  /** 工具调用 */
  onToolCall?: (toolName: string, args: unknown) => void;
  /** 错误 */
  onError?: (error: string) => void;
  /** 完成 */
  onComplete?: (outputPath?: string) => void;
  /** 进度更新 */
  onProgress?: (message: string) => void;
}

/** Agent 配置 */
export interface VideoAgentOptions {
  /** 输入目录 */
  inputDir: string;
  /** 输出目录 */
  outputDir: string;
  /** 视频生成配置 */
  videoConfig?: VideoGenerationConfig;
  /** API Key */
  apiKey?: string;
  /** 回调函数 */
  callbacks?: VideoAgentCallbacks;
}

/**
 * 视频生成 Agent
 */
export class VideoAgent {
  private agent: Agent;
  private context: AgentContext;
  private callbacks: VideoAgentCallbacks;
  private apiKey: string;

  constructor(options: VideoAgentOptions) {
    // 使用统一的 API Key (支持 OpenAI 协议)
    this.apiKey = options.apiKey || process.env.AI_VIDEO_API_KEY || process.env.API_KEY || '';
    this.callbacks = options.callbacks || {};

    // 初始化上下文
    this.context = {
      inputDir: options.inputDir,
      outputDir: options.outputDir,
      storyboards: [],
      images: [],
      config: options.videoConfig || {
        resolution: '1920x1080',
        duration: 5,
      },
      tasks: [],
    };

    // 创建 Agent
    this.agent = new Agent({
      initialState: {
        systemPrompt: DEFAULT_SYSTEM_PROMPT,
        model: createChatModel(),
        tools: createAllTools(this.context),
      },
      getApiKey: async () => this.apiKey,
    });

    // 订阅事件
    this.agent.subscribe(this.handleEvent.bind(this));
  }

  /**
   * 处理 Agent 事件
   */
  private handleEvent(event: any): void {
    switch (event.type) {
      case 'message_update':
        if (event.assistantMessageEvent?.type === 'text_delta') {
          this.callbacks.onStream?.(event.assistantMessageEvent.delta);
        }
        break;

      case 'tool_execution_start':
        console.log(`[VideoAgent] 执行工具: ${event.toolName}`);
        this.callbacks.onToolCall?.(event.toolName, event.args);
        this.callbacks.onProgress?.(`正在执行: ${event.toolName}`);
        break;

      case 'turn_end':
        if (event.toolResults?.length) {
          console.log(`[VideoAgent] 工具执行完成: ${event.toolResults.length} 个`);
        }
        break;

      case 'agent_end':
        console.log(`[VideoAgent] Agent 执行完成`);
        this.callbacks.onComplete?.(this.context.outputPath);
        break;
    }
  }

  /**
   * 发送消息给 Agent
   * @param message 用户消息
   * @returns Agent 响应
   */
  async sendMessage(message: string): Promise<string> {
    if (!this.apiKey) {
      throw new Error('未配置 API Key，请设置 AI_VIDEO_API_KEY 或 API_KEY 环境变量');
    }

    await this.agent.prompt(message);

    // 获取最后一条助手消息
    const messages = this.agent.state.messages;
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === 'assistant' && messages[i].content) {
        return messages[i].content as string;
      }
    }

    return '';
  }

  /**
   * 启动视频生成流程
   * @param customPrompt 自定义提示词 (可选)
   */
  async generateVideo(customPrompt?: string): Promise<string | undefined> {
    const prompt = customPrompt || this.buildDefaultPrompt();
    await this.sendMessage(prompt);
    await this.ensureOutputSaved();
    return this.context.outputPath;
  }

  /**
   * Fallback: if task completed with video URL but file was not saved by tools,
   * download it automatically to ensure a tangible output artifact.
   */
  private async ensureOutputSaved(): Promise<void> {
    if (this.context.outputPath) {
      return;
    }

    const latestSuccessTask = [...this.context.tasks]
      .reverse()
      .find((task) => task.status === 'success' && task.videoUrl);

    if (!latestSuccessTask?.videoUrl) {
      return;
    }

    if (!fs.existsSync(this.context.outputDir)) {
      fs.mkdirSync(this.context.outputDir, { recursive: true });
    }

    const filename = `${Date.now().toString(36)}-fallback.mp4`;
    const outputPath = path.join(this.context.outputDir, filename);
    const response = await fetch(latestSuccessTask.videoUrl);
    if (!response.ok) {
      throw new Error(`Failed to download generated video: ${response.status}`);
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    fs.writeFileSync(outputPath, buffer);
    this.context.outputPath = outputPath;
  }

  /**
   * 构建默认提示词
   */
  private buildDefaultPrompt(): string {
    return `请帮我完成以下任务：

1. 读取 ${this.context.inputDir} 目录中的分镜文件和参考图片
2. 分析分镜内容，生成合适的视频提示词
3. 调用视频生成 API 生成视频
4. 等待生成完成后，将视频保存到 ${this.context.outputDir} 目录

请开始执行。`;
  }

  /**
   * 取消当前操作
   */
  abort(): void {
    this.agent.abort();
  }

  /**
   * 获取当前上下文
   */
  getContext(): AgentContext {
    return this.context;
  }

  /**
   * 获取生成的视频路径
   */
  getOutputPath(): string | undefined {
    return this.context.outputPath;
  }
}

export default VideoAgent;
