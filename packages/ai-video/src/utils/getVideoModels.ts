/**
 * Get video generation model list
 */
import { VIDEO_MODELS, type VideoModelInfo } from './models.js';

/**
 * Get available video generation model list
 * Returns locally configured models directly
 */
export function getVideoModels(): VideoModelInfo[] {
  return Object.values(VIDEO_MODELS);
}
