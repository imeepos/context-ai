import OpenAI from 'openai';

export function createOpenAIClient(): OpenAI {
  const baseURL = 'https://ai.bowong.cc';
  const apiKey = process.env.AI_VIDEO_API_KEY || process.env.API_KEY || '';
  return new OpenAI({ baseURL, apiKey });
}
