/**
 * Video generation toolkit
 * Uses OpenAI standard API to call https://ai.bowong.cc
 */

// Configuration
export { openai, API_CONFIG } from './config.js';

// Model configuration
export {
  VIDEO_MODELS,
  IMAGE_MODELS,
  type VideoModelKey,
  type ImageModelKey,
  type VideoModelInfo,
  type ImageModelInfo,
} from './models.js';

// Types
export type {
  SubmitVideoTaskParams,
  SubmitTaskResult,
  TaskStatus,
  TaskStatusResult,
  GenerateImageParams,
  GenerateImageResult,
  WaitForCompletionOptions,
  VideoGenerationResult,
} from './types.js';

// Utility functions
export { getVideoModels } from './getVideoModels.js';
export { getImageModels } from './getImageModels.js';
export { submitVideoTask } from './submitVideoTask.js';
export { getVideoTaskStatus } from './getVideoTaskStatus.js';
export { waitForVideoCompletion } from './waitForVideoCompletion.js';
export { generateImage } from './generateImage.js';
