import { setTimeout as sleep } from 'timers/promises';
import { VIDEO_MODELS } from './models.js';
import { createOpenAIClient } from './openaiClient.js';
import { resolveModelId } from './resolveModelId.js';

type VideoSize = '720x1280' | '1280x720' | '1024x1792' | '1792x1024';
type VideoSeconds = '4' | '8' | '12';

const SUPPORTED_VIDEO_SIZES: VideoSize[] = ['720x1280', '1280x720', '1024x1792', '1792x1024'];
const SUPPORTED_SECONDS: VideoSeconds[] = ['4', '8', '12'];

export async function generateVideo(params: {
  prompt: string;
  model?: string;
  resolution?: string;
  duration?: number;
  referenceImages?: string[];
  waitForCompletion?: boolean;
  maxAttempts?: number;
  intervalMs?: number;
}): Promise<{ taskId: string; status: 'pending' | 'processing' | 'success' | 'failed'; videoUrl?: string }> {
  const openai = createOpenAIClient();
  const model = resolveModelId(params.model, VIDEO_MODELS, VIDEO_MODELS.veo3.id);

  let size: VideoSize | undefined;
  if (params.resolution) {
    if ((SUPPORTED_VIDEO_SIZES as string[]).includes(params.resolution)) {
      size = params.resolution as VideoSize;
    } else {
      const parts = params.resolution.split('x');
      const width = Number(parts[0]);
      const height = Number(parts[1]);
      if (Number.isFinite(width) && Number.isFinite(height)) {
        size = width >= height ? '1280x720' : '720x1280';
      }
    }
  }

  let seconds: VideoSeconds | undefined;
  if (params.duration && !Number.isNaN(params.duration)) {
    let best: VideoSeconds = '4';
    for (const current of SUPPORTED_SECONDS) {
      if (Math.abs(Number(current) - params.duration) < Math.abs(Number(best) - params.duration)) {
        best = current;
      }
    }
    seconds = best;
  }

  const normalizedReferenceImages: string[] = [];
  for (const image of params.referenceImages ?? []) {
    if (/^https?:\/\//i.test(image) || /^data:image\//i.test(image)) {
      normalizedReferenceImages.push(image);
    } else if (image.trim().length > 0) {
      normalizedReferenceImages.push(`data:image/png;base64,${image}`);
    }
  }

  const requestBody: Record<string, unknown> = {
    model,
    prompt: params.prompt,
    ...(size ? { size } : {}),
    ...(seconds ? { seconds } : {}),
  };
  if (normalizedReferenceImages.length > 0) {
    requestBody.image_urls = normalizedReferenceImages;
    requestBody.image_url = normalizedReferenceImages[0];
  }

  const createResponse = await openai.videos.create(requestBody as never);

  const taskId = createResponse.id;
  const waitForCompletion = params.waitForCompletion ?? true;
  if (!waitForCompletion) {
    return { taskId, status: 'pending' };
  }

  const maxAttempts = params.maxAttempts ?? 120;
  const intervalMs = params.intervalMs ?? 5000;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const statusResponse = await openai.videos.retrieve(taskId);
    let status: 'pending' | 'processing' | 'success' | 'failed' = 'pending';
    if (statusResponse.status === 'completed') {
      status = 'success';
    } else if (statusResponse.status === 'queued' || statusResponse.status === 'in_progress') {
      status = 'processing';
    } else if (statusResponse.status === 'failed') {
      status = 'failed';
    }

    if (status === 'success') {
      const raw = statusResponse as unknown as {
        output?: Array<{ url?: string }>;
        url?: string;
        video_url?: string;
      };
      const videoUrl =
        (Array.isArray(raw.output) ? raw.output[0]?.url : undefined) || raw.url || raw.video_url;
      return { taskId, status, videoUrl };
    }

    if (status === 'failed') {
      throw new Error('Video generation failed.');
    }

    await sleep(intervalMs);
  }

  throw new Error('Video generation timeout.');
}
