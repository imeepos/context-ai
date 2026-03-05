/**
 * Generate an image.
 * Uses the OpenAI Images API (or compatible image generation APIs).
 */
import { getOpenAIClient } from './config.js';
import { IMAGE_MODELS, type ImageModelInfo } from './models.js';
import type { GenerateImageParams, GenerateImageResult } from './types.js';

/**
 * Generate an image from the given parameters.
 * @param params - Image generation parameters
 * @returns Generated image sources (URL/base64)
 */
export async function generateImage(params: GenerateImageParams): Promise<GenerateImageResult> {
  // Resolve the model ID from either model name or explicit ID.
  let modelId = params.model;
  if (modelId) {
    const modelEntry = Object.values(IMAGE_MODELS).find(
      (m: ImageModelInfo) => m.name === modelId || m.id === modelId
    );
    if (modelEntry) {
      modelId = modelEntry.id;
    }
  } else {
    modelId = IMAGE_MODELS.seedream50.id;
  }

  console.log('[generateImage] Generating image:', {
    model: modelId,
    prompt: params.prompt.substring(0, 100) + '...',
    size: params.size,
  });

  try {
    // Try generating with the OpenAI Images API (e.g., DALL-E style models).
    const openai = getOpenAIClient();
    const response = await openai.images.generate({
      model: modelId,
      prompt: params.prompt,
      size: params.size as '1024x1024' | '1792x1024' | '1024x1792' | undefined,
    });

    const data = response.data ?? [];
    const imageUrls = data
      .map((item) => item.url)
      .filter((url): url is string => typeof url === 'string' && url.length > 0);
    const imageBase64s = data
      .map((item) => item.b64_json)
      .filter((b64): b64 is string => typeof b64 === 'string' && b64.length > 0);

    if (imageUrls.length > 0 || imageBase64s.length > 0) {
      return {
        imageUrls,
        imageBase64s,
      };
    }

    throw new Error('Image generation returned an empty result.');
  } catch (error) {
    console.error('[generateImage] Image generation failed:', error);
    throw error instanceof Error ? error : new Error('Image generation failed.');
  }
}
