/**
 * Generate unique output filename
 */

/**
 * Generate unique filename with timestamp and random string
 * @param ext File extension (default: ".mp4")
 * @returns Filename (without path)
 */
export function generateOutputFilename(ext: string = '.mp4'): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 10);
  return `${timestamp}${random}${ext}`;
}
