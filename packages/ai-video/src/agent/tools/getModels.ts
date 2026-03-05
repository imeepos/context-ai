/**
 * Get video models tool
 */
import { Type } from '@sinclair/typebox';
import type { AgentTool } from '@mariozechner/pi-agent-core';
import { getVideoModels, type VideoModelInfo } from './video/index.js';
import { result } from './toolUtils.js';

/**
 * Create get video models tool
 */
export function createGetModelsTool(): AgentTool {
  return {
    name: 'get_video_models',
    label: 'Get Video Models',
    description: 'Get available video generation model list',
    parameters: Type.Object({}),
    execute: async () => {
      try {
        const models = getVideoModels();

        if (models.length === 0) {
          return result('No available video generation models', { models: [] });
        }

        const summary = models
          .map((m: VideoModelInfo) => `- ${m.name} (${m.speed})`)
          .join('\n');

        return result(`Available video generation models:\n${summary}`, { models });
      } catch (err: any) {
        return result(`Failed to get models: ${err.message}`, { error: true });
      }
    },
  };
}
