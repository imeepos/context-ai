/**
 * Read image as Base64
 */
import * as fs from 'fs';

/**
 * Read image file and convert to Base64 string
 * @param imagePath Image file path
 * @returns Base64 encoded image data
 */
export function readImageAsBase64(imagePath: string): string {
  const buffer = fs.readFileSync(imagePath);
  return buffer.toString('base64');
}
