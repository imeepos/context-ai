import type { Model } from '@mariozechner/pi-ai';

const BASE_URL = 'https://ai.bowong.cc';
const MODEL_ID = 'azure/gpt-5.2-chat';

export function createCustomModel(): Model<'openai-responses'> {
  return {
    id: MODEL_ID,
    name: 'gpt-5.2-chat',
    api: 'openai-responses',
    provider: 'azure',
    baseUrl: BASE_URL,
    reasoning: false,
    input: ['text'] as const,
    cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
    contextWindow: 128000,
    maxTokens: 4096,
  };
}
