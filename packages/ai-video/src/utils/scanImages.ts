/**
 * Scan image files in directory
 */
import * as fs from 'fs';
import * as path from 'path';
import type { ReferenceImage } from '../types.js';
import { detectImageType } from './detectImageType.js';
import { getMimeType } from './getMimeType.js';

/** Supported image formats */
const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'];

/**
 * Scan image files in directory
 * @param dir Directory path
 * @returns Image info array
 */
export function scanImages(dir: string): ReferenceImage[] {
  if (!fs.existsSync(dir)) {
    return [];
  }

  const files = fs.readdirSync(dir);
  const images: ReferenceImage[] = [];

  for (const file of files) {
    const ext = path.extname(file).toLowerCase();
    if (IMAGE_EXTENSIONS.includes(ext)) {
      const filePath = path.join(dir, file);
      const imageType = detectImageType(file);

      images.push({
        path: filePath,
        filename: file,
        type: imageType,
        mimeType: getMimeType(ext),
      });
    }
  }

  return images;
}
