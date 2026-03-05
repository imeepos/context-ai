import { IMAGE_MODELS } from './models.js';
import { createOpenAIClient } from './openaiClient.js';
import { resolveModelId } from './resolveModelId.js';

export async function generateImage(params: {
  prompt: string;
  model?: string;
  size?: string;
  referenceImages?: string[];
}): Promise<{ imageUrls: string[]; imageBase64s: string[] }> {
  const openai = createOpenAIClient();
  const model = resolveModelId(params.model, IMAGE_MODELS, IMAGE_MODELS.seedream50.id);
  const size = (params.size || '1024x1792') as '1024x1024' | '1792x1024' | '1024x1792';

  const imageUrls: string[] = [];
  const imageBase64s: string[] = [];

  if ((params.referenceImages?.length || 0) > 0) {
    const response = await openai.responses.create({
      model,
      tools: [{ type: 'image_generation' }],
      input: [
        {
          role: 'user',
          content: [
            { type: 'input_text', text: `${params.prompt}\nOutput size: ${size}` },
            ...params.referenceImages!.map((img) => ({
              type: 'input_image' as const,
              image_url:
                /^https?:\/\//i.test(img) || /^data:image\//i.test(img)
                  ? img
                  : `data:image/png;base64,${img}`,
              detail: 'auto' as const,
            })),
          ],
        },
      ],
    });

    for (const item of response.output ?? []) {
      if (item.type === 'image_generation_call' && typeof item.result === 'string' && item.result) {
        imageBase64s.push(item.result);
      }
    }
  } else {
    const response = await openai.images.generate({
      model,
      prompt: params.prompt,
      size,
    });

    for (const item of response.data ?? []) {
      if (typeof item.url === 'string' && item.url.length > 0) {
        imageUrls.push(item.url);
      }
      if (typeof item.b64_json === 'string' && item.b64_json.length > 0) {
        imageBase64s.push(item.b64_json);
      }
    }
  }

  if (imageUrls.length === 0 && imageBase64s.length === 0) {
    throw new Error('Image generation returned an empty result.');
  }

  return {
    imageUrls,
    imageBase64s,
  };
}
