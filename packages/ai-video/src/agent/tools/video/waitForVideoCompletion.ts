/**
 * Wait for video generation to complete
 */
import { getVideoTaskStatus } from './getVideoTaskStatus.js';
import type { WaitForCompletionOptions, VideoGenerationResult } from './types.js';

/**
 * Poll and wait for video generation to complete
 * @param taskId - Task ID
 * @param options - Wait options
 * @returns Video URL if available. Some providers may only return completion status.
 */
export async function waitForVideoCompletion(
  taskId: string,
  options: WaitForCompletionOptions = {}
): Promise<VideoGenerationResult> {
  const { maxAttempts = 120, intervalMs = 5000, onProgress } = options;

  for (let i = 0; i < maxAttempts; i++) {
    const result = await getVideoTaskStatus(taskId);

    onProgress?.(result.status);

    if (result.status === 'success') {
      if (result.videoUrl) {
        console.log('[waitForVideoCompletion] Video generation completed:', result.videoUrl);
      } else {
        console.log('[waitForVideoCompletion] Video generation completed without direct video URL');
      }
      return { videoUrl: result.videoUrl || '' };
    }

    if (result.status === 'failed') {
      throw new Error(result.error || 'Video generation failed');
    }

    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }

  throw new Error('Video generation timeout');
}
