/**
 * AI Video Agent Type Definitions
 */

/**
 * Storyboard data
 */
export interface Storyboard {
  /** Storyboard index */
  index: number;
  /** Scene description */
  scene?: string;
  /** Character description */
  character?: string;
  /** Action description */
  action?: string;
  /** Shot description */
  shot?: string;
  /** Dialogue */
  dialogue?: string;
  /** Duration (seconds) */
  duration?: number;
  /** Original prompt */
  prompt?: string;
  /** Raw row data */
  raw?: Record<string, unknown>;
}

/**
 * Reference image info
 */
export interface ReferenceImage {
  /** File path */
  path: string;
  /** Filename */
  filename: string;
  /** Image type */
  type: 'character' | 'scene' | 'style' | 'unknown';
  /** Image description (analyzed by AI) */
  description?: string;
  /** Base64 data */
  base64?: string;
  /** MIME type */
  mimeType?: string;
}

/**
 * Video generation task
 */
export interface VideoGenerationTask {
  /** Task ID */
  taskId: string;
  /** Task status */
  status: 'pending' | 'processing' | 'success' | 'failed';
  /** Video prompt */
  prompt: string;
  /** Reference image URL list */
  imageUrls?: string[];
  /** Generated video URL */
  videoUrl?: string;
  /** Error message */
  error?: string;
  /** Creation time */
  createdAt: Date;
  /** Completion time */
  completedAt?: Date;
}

/**
 * Video generation config
 */
export interface VideoGenerationConfig {
  /** Model name */
  model?: string;
  /** Resolution */
  resolution?: string;
  /** Duration (seconds) */
  duration?: number;
  /** Aspect ratio */
  aspectRatio?: string;
  /** Whether to include watermark */
  watermark?: boolean;
  /** Whether to enable audio */
  audioEnabled?: boolean;
}

/**
 * Agent context
 */
export interface AgentContext {
  /** Input directory */
  inputDir: string;
  /** Output directory */
  outputDir: string;
  /** Storyboard data */
  storyboards: Storyboard[];
  /** Reference images */
  images: ReferenceImage[];
  /** Video generation config */
  config: VideoGenerationConfig;
  /** Generated video tasks */
  tasks: VideoGenerationTask[];
  /** Final output path */
  outputPath?: string;
}

/**
 * CLI options
 */
export interface CLIOptions {
  /** Input directory */
  input: string;
  /** Output directory */
  output?: string;
  /** Config file path */
  config?: string;
  /** Model name */
  model?: string;
  /** Resolution */
  resolution?: string;
  /** Video duration */
  duration?: string;
  /** Custom prompt */
  prompt?: string;
  /** Whether to show verbose logs */
  verbose?: boolean;
}

/**
 * Tool execution result (conforms to AgentToolResult interface)
 */
export interface ToolResult {
  content: Array<{ type: 'text'; text: string }>;
  details: Record<string, unknown>;
}
