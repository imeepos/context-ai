/**
 * Read reference images tool
 */
import { Type } from '@sinclair/typebox';
import type { AgentTool } from '@mariozechner/pi-agent-core';
import { scanImages } from '../../utils/fileUtils.js';
import type { AgentContext } from '../../types.js';
import { result } from './toolUtils.js';

/**
 * Create read reference images tool
 */
export function createReadImagesTool(context: AgentContext): AgentTool {
  return {
    name: 'read_images',
    label: 'Read Reference Images',
    description: 'Read reference image files from input directory',
    parameters: Type.Object({}),
    execute: async () => {
      try {
        const images = scanImages(context.inputDir);
        context.images = images;

        if (images.length === 0) {
          return result(`No image files found in directory ${context.inputDir}`, { count: 0 });
        }

        const summary = images
          .map((img) => `- ${img.filename} (${img.type})`)
          .join('\n');

        return result(
          `Found ${images.length} reference images:\n${summary}`,
          { count: images.length, images: images.map((i) => i.filename) }
        );
      } catch (err: any) {
        return result(`Failed to read images: ${err.message}`, { error: true });
      }
    },
  };
}
