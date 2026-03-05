/**
 * Save video tool
 */
import { Type } from '@sinclair/typebox';
import type { AgentTool } from '@mariozechner/pi-agent-core';
import * as fs from 'fs';
import * as path from 'path';
import type { AgentContext } from '../../types.js';
import { result } from './toolUtils.js';

/**
 * Create save video tool
 */
export function createSaveVideoTool(context: AgentContext): AgentTool {
  return {
    name: 'save_video',
    label: 'Save Video',
    description: 'Download generated video and save to output directory',
    parameters: Type.Object({
      videoUrl: Type.String({ description: 'Video URL' }),
      filename: Type.Optional(Type.String({ description: 'Filename to save' })),
    }),
    execute: async (_id, params) => {
      const p = params as { videoUrl: string; filename?: string };

      try {
        const filename = p.filename || `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}.mp4`;
        const outputPath = path.join(context.outputDir, filename);

        // Ensure output directory exists
        if (!fs.existsSync(context.outputDir)) {
          fs.mkdirSync(context.outputDir, { recursive: true });
        }

        // Download video
        const response = await fetch(p.videoUrl);
        if (!response.ok) {
          throw new Error(`Download failed: ${response.status}`);
        }

        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        fs.writeFileSync(outputPath, buffer);

        context.outputPath = outputPath;

        return result(
          `Video saved to: ${outputPath}`,
          { path: outputPath, size: buffer.length }
        );
      } catch (err: any) {
        return result(`Failed to save video: ${err.message}`, { error: true });
      }
    },
  };
}
