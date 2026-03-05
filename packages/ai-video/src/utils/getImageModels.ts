/**
 * Get image generation model list
 */
import { IMAGE_MODELS, type ImageModelInfo } from './models.js';

/**
 * Get available image generation model list
 * Returns locally configured models directly
 */
export function getImageModels(): ImageModelInfo[] {
  return Object.values(IMAGE_MODELS);
}
