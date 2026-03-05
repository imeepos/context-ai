import { LLM_MODELS, type LlmModelInfo } from './models.js';

export function getLlmModels(): LlmModelInfo[] {
  return Object.values(LLM_MODELS);
}
