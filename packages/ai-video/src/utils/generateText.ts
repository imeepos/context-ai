import { LLM_MODELS } from './models.js';
import { createOpenAIClient } from './openaiClient.js';

export async function generateText(params: {
  prompt: string;
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
  images?: string[];
  videos?: string[];
  model?: string;
}): Promise<{ text: string }> {
  const openai = createOpenAIClient();
  const model = LLM_MODELS.gemini3Pro.id;

  const content: Array<Record<string, unknown>> = [{ type: 'input_text', text: params.prompt }];
  for (const image of params.images ?? []) {
    content.push({
      type: 'input_image',
      image_url:
        /^https?:\/\//i.test(image) || /^data:image\//i.test(image)
          ? image
          : `data:image/png;base64,${image}`,
      detail: 'auto',
    });
  }
  for (const video of params.videos ?? []) {
    content.push({
      type: 'input_file',
      file_url:
        /^https?:\/\//i.test(video) || /^data:video\//i.test(video)
          ? video
          : `data:video/mp4;base64,${video}`,
    });
  }

  const response = await openai.responses.create({
    model,
    input: [{ role: 'user', content }],
    ...(params.systemPrompt ? { instructions: params.systemPrompt } : {}),
    ...(typeof params.temperature === 'number' ? { temperature: params.temperature } : {}),
    ...(typeof params.maxTokens === 'number' ? { max_output_tokens: params.maxTokens } : {}),
  } as never);

  const text =
    (response as unknown as { output_text?: string }).output_text ||
    ((response as unknown as { output?: Array<{ content?: Array<{ text?: string }> }> }).output ?? [])
      .flatMap((item) => item.content ?? [])
      .map((item) => item.text)
      .filter((item): item is string => typeof item === 'string' && item.length > 0)
      .join('\n');

  if (!text || text.length === 0) {
    throw new Error('Text generation returned an empty result.');
  }

  return { text };
}
