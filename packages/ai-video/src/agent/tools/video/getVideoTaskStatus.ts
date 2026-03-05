/**
 * Query the status of a video generation task.
 */
import { getOpenAIClient } from './config.js';
import type { TaskStatusResult } from './types.js';

/**
 * Query the status of a video generation task.
 * @param taskId - Task ID
 * @returns Task status result
 */
export async function getVideoTaskStatus(taskId: string): Promise<TaskStatusResult> {
  try {
    // Query task status via the OpenAI Videos API.
    const openai = getOpenAIClient();
    const response = await openai.videos.retrieve(taskId);
    const raw = response as unknown as {
      output?: Array<{ url?: string }>;
      url?: string;
      video_url?: string;
    };
    const outputVideoUrl = Array.isArray(raw.output) ? raw.output[0]?.url : undefined;
    const videoUrl = outputVideoUrl || raw.url || raw.video_url;

    // Determine status from the API response.
    if (response && response.id) {
      // If status is completed, try returning an accessible video URL.
      if (response.status === 'completed') {
        return {
          status: 'success',
          videoUrl,
        };
      }

      // Check explicit status values.
      if (response.status === 'queued' || response.status === 'in_progress') {
        return {
          status: 'processing',
        };
      }

      if (response.status === 'failed') {
        return {
          status: 'failed',
          error: 'Video generation failed.',
        };
      }

      // Task is still in progress.
      return {
        status: 'pending',
      };
    }

    return {
      status: 'pending',
    };
  } catch (error) {
    // If status retrieval fails, return a failed status.
    const errorMessage = error instanceof Error ? error.message : 'Failed to query task status.';
    return {
      status: 'failed',
      error: errorMessage,
    };
  }
}
