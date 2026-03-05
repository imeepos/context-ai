/**
 * Submit video generation task
 * Uses OpenAI Videos API
 */
import type { VideoModel, VideoSize } from 'openai/resources';
import { getOpenAIClient } from './config.js';
import { VIDEO_MODELS, type VideoModelInfo } from './models.js';
import type { SubmitVideoTaskParams, SubmitTaskResult } from './types.js';

const SUPPORTED_VIDEO_SIZES: VideoSize[] = ['720x1280', '1280x720', '1024x1792', '1792x1024'];
const SUPPORTED_SECONDS: Array<'4' | '8' | '12'> = ['4', '8', '12'];

function normalizeVideoSize(size?: string): VideoSize | undefined {
  if (!size) {
    return undefined;
  }

  if ((SUPPORTED_VIDEO_SIZES as string[]).includes(size)) {
    return size as VideoSize;
  }

  const landscape = size.toLowerCase().includes('x')
    ? Number(size.split('x')[0]) >= Number(size.split('x')[1])
    : true;
  return landscape ? '1280x720' : '720x1280';
}

function normalizeVideoSeconds(duration?: number): '4' | '8' | '12' | undefined {
  if (!duration || Number.isNaN(duration)) {
    return undefined;
  }

  return SUPPORTED_SECONDS.reduce((closest, current) => {
    return Math.abs(Number(current) - duration) < Math.abs(Number(closest) - duration) ? current : closest;
  }, '4');
}

/**
 * Submit video generation task
 * @param params - Video generation parameters
 * @returns Task ID
 */
export async function submitVideoTask(params: SubmitVideoTaskParams): Promise<SubmitTaskResult> {
  // Determine model ID
  let modelId = params.model;
  if (modelId) {
    const modelEntry = Object.values(VIDEO_MODELS).find(
      (m: VideoModelInfo) => m.name === modelId || m.id === modelId
    );
    if (modelEntry) {
      modelId = modelEntry.id;
    }
  } else {
    modelId = VIDEO_MODELS.veo3.id;
  }

  console.log('[submitVideoTask] Submitting task:', {
    model: modelId,
    prompt: params.prompt.substring(0, 100) + '...',
    resolution: params.resolution,
    duration: params.duration,
  });

  try {
    // Generate video using OpenAI Videos API
    const normalizedSize = normalizeVideoSize(params.resolution);
    const normalizedSeconds = normalizeVideoSeconds(params.duration);
    const openai = getOpenAIClient();
    console.log('[submitVideoTask] Normalized params:', {
      size: normalizedSize,
      seconds: normalizedSeconds,
    });

    const response = await openai.videos.create({
      model: modelId as unknown as VideoModel,
      prompt: params.prompt,
      ...(normalizedSize && {
        size: normalizedSize,
      }),
      ...(normalizedSeconds && {
        seconds: normalizedSeconds,
      }),
      // @ts-ignore
      extra_body: {}
    });

    // Get task ID from response
    const taskId = response.id;
    console.log('[submitVideoTask] Task submitted, taskId:', taskId);

    return { taskId };
  } catch (error) {
    console.error('[submitVideoTask] Submission failed:', error);
    throw error instanceof Error ? error : new Error('Video task submission failed');
  }
}
