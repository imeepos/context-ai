/**
 * Download file to local
 */
import * as fs from 'fs';

/**
 * Download file from URL to local path
 * @param url File URL
 * @param outputPath Output file path
 */
export async function downloadFile(url: string, outputPath: string): Promise<void> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Download failed: ${response.status} ${response.statusText}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  fs.writeFileSync(outputPath, buffer);
}
