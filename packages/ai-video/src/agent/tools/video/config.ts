/**
 * OpenAI client configuration
 */
import OpenAI from 'openai';

export interface ApiConfig {
  baseURL: string;
  apiKey: string;
}

/** Resolve API configuration from environment variables at runtime. */
export function getApiConfig(): ApiConfig {
  return {
    baseURL:
      process.env.AI_VIDEO_BASE_URL ||
      process.env.API_BASE_URL ||
      process.env.BASE_URL ||
      'https://ai.bowong.cc',
    apiKey: process.env.AI_VIDEO_API_KEY || process.env.API_KEY || '',
  };
}

/** Create OpenAI client instance using latest runtime env config. */
export function getOpenAIClient(): OpenAI {
  const config = getApiConfig();
  return new OpenAI({
    baseURL: config.baseURL,
    apiKey: config.apiKey,
  });
}

// Backward-compatible exports (snapshot at import time).
export const API_CONFIG = getApiConfig();
export const openai = getOpenAIClient();
