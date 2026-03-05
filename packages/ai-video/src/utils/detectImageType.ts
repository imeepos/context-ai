/**
 * Detect image type from filename
 */
import type { ReferenceImage } from '../types.js';

export function detectImageType(filename: string): ReferenceImage['type'] {
  const lowerName = filename.toLowerCase();

  // Character related keywords
  const characterKeywords = ['character', 'portrait', 'char'];
  if (characterKeywords.some((k) => lowerName.includes(k))) {
    return 'character';
  }

  // Scene related keywords
  const sceneKeywords = ['scene', 'background', 'environment'];
  if (sceneKeywords.some((k) => lowerName.includes(k))) {
    return 'scene';
  }

  // Style related keywords
  const styleKeywords = ['style', 'reference', 'ref'];
  if (styleKeywords.some((k) => lowerName.includes(k))) {
    return 'style';
  }

  return 'unknown';
}
