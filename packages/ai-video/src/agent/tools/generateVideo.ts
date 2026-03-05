/**
 * Generate video tool
 */
import { Type } from '@sinclair/typebox';
import type { AgentTool } from '@mariozechner/pi-agent-core';
import { submitVideoTask } from './video/index.js';
import type { AgentContext } from '../../types.js';
import { result } from './toolUtils.js';

/**
 * Create generate video tool
 */
export function createGenerateVideoTool(context: AgentContext): AgentTool {
  return {
    name: 'generate_video',
    label: 'Generate Video',
    description: 'Generate video based on prompt and reference images. Requires video description prompt.',
    parameters: Type.Object({
      prompt: Type.String({ description: 'Video content description' }),
      model: Type.Optional(Type.String({ description: 'Model name' })),
      resolution: Type.Optional(Type.String({ description: 'Resolution, e.g. 1920x1080' })),
      duration: Type.Optional(Type.Number({ description: 'Video duration (seconds)' })),
      useImages: Type.Optional(Type.Boolean({ description: 'Whether to use reference images' })),
    }),
    execute: async (_id, params) => {
      const p = params as {
        prompt: string;
        model?: string;
        resolution?: string;
        duration?: number;
        useImages?: boolean;
      };

      try {
        if (context.outputPath) {
          return result(
            `Video already generated and saved at: ${context.outputPath}. Skip creating new task.`,
            { skipped: true, outputPath: context.outputPath }
          );
        }

        const hasSuccessfulTask = context.tasks.some((t) => t.status === 'success');
        if (hasSuccessfulTask) {
          return result(
            'A successful video task already exists. Skip creating duplicate generation task.',
            { skipped: true }
          );
        }

        // Prepare image URLs (if needed)
        let imageUrls: string[] | undefined;
        if (p.useImages && context.images.length > 0) {
          // Note: Need to upload local images or convert to accessible URLs
          // Skip for now, implement image upload logic when actually needed
          imageUrls = undefined;
        }

        const { taskId } = await submitVideoTask({
          prompt: p.prompt,
          model: p.model || context.config.model,
          resolution: p.resolution || context.config.resolution,
          duration: p.duration || context.config.duration,
          imageUrls,
        });

        const task = {
          taskId,
          status: 'pending' as const,
          prompt: p.prompt,
          createdAt: new Date(),
        };

        context.tasks.push(task);

        return result(
          `Video generation task submitted, task ID: ${taskId}`,
          { taskId, status: 'pending' }
        );
      } catch (err: any) {
        return result(`Video generation failed: ${err.message}`, { error: true });
      }
    },
  };
}
