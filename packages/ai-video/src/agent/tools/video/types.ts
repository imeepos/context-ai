/**
 * Type definitions
 */

/** Video task submission parameters */
export interface SubmitVideoTaskParams {
  prompt: string;
  model?: string;
  resolution?: string;
  duration?: number;
  imageUrl?: string;
  imageUrls?: string[];
}

/** Video task submission result */
export interface SubmitTaskResult {
  taskId: string;
}

/** Task processing status */
export type TaskStatus = 'pending' | 'processing' | 'success' | 'failed';

/** Task status query result */
export interface TaskStatusResult {
  status: TaskStatus;
  videoUrl?: string;
  error?: string;
}

/** Image generation parameters */
export interface GenerateImageParams {
  prompt: string;
  model?: string;
  size?: string;
}

/** Image generation result */
export interface GenerateImageResult {
  // All image URLs returned by the provider.
  imageUrls: string[];
  // All base64 images (if any), without data URL prefix.
  imageBase64s: string[];
}

/** Wait-for-completion options */
export interface WaitForCompletionOptions {
  maxAttempts?: number;
  intervalMs?: number;
  onProgress?: (status: string, progress?: number) => void;
}

/** Final video generation result */
export interface VideoGenerationResult {
  videoUrl: string;
}
