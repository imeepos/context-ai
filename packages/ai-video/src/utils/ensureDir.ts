/**
 * Ensure directory exists
 */
import * as fs from 'fs';

/**
 * Create directory if it does not exist
 * @param dir Directory path
 */
export function ensureDir(dir: string): void {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}
