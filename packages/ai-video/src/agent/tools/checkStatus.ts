/**
 * Check task status tool
 */
import { Type } from '@sinclair/typebox';
import type { AgentTool } from '@mariozechner/pi-agent-core';
import { getVideoTaskStatus, waitForVideoCompletion } from './video/index.js';
import { getOpenAIClient } from './video/config.js';
import * as fs from 'fs';
import * as path from 'path';
import type { AgentContext } from '../../types.js';
import { result } from './toolUtils.js';

/**
 * Create check task status tool
 */
export function createCheckStatusTool(context: AgentContext): AgentTool {
  return {
    name: 'check_task_status',
    label: 'Check Task Status',
    description: 'Check the status of video generation task, returns current progress and result',
    parameters: Type.Object({
      taskId: Type.String({ description: 'Task ID' }),
      wait: Type.Optional(Type.Boolean({ description: 'Whether to wait for completion' })),
    }),
    execute: async (_id, params) => {
      const p = params as { taskId: string; wait?: boolean };

      try {
        if (p.wait) {
          // Wait for completion
          const { videoUrl } = await waitForVideoCompletion(p.taskId, {
            onProgress: (status: string) => {
              console.log(`Task status: ${status}`);
            },
          });

          let finalVideoUrl = videoUrl;
          let savedPath: string | undefined;
          if (!finalVideoUrl) {
            const openai = getOpenAIClient();
            const downloadResponse = await openai.videos.downloadContent(p.taskId, { variant: 'video' });
            if (!downloadResponse.ok) {
              throw new Error(`Failed to download completed video: ${downloadResponse.status}`);
            }
            if (!fs.existsSync(context.outputDir)) {
              fs.mkdirSync(context.outputDir, { recursive: true });
            }
            const localFilename = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}.mp4`;
            const localPath = path.join(context.outputDir, localFilename);
            const buffer = Buffer.from(await downloadResponse.arrayBuffer());
            fs.writeFileSync(localPath, buffer);
            context.outputPath = localPath;
            savedPath = localPath;
            finalVideoUrl = localPath;
          }

          // Update task status
          const task = context.tasks.find((t) => t.taskId === p.taskId);
          if (task) {
            task.status = 'success';
            task.videoUrl = finalVideoUrl;
            task.completedAt = new Date();
          }

          return result(
            `Video generation completed!${
              savedPath ? `\nVideo saved to: ${savedPath}` : `\nVideo URL: ${finalVideoUrl}`
            }`,
            { taskId: p.taskId, status: 'success', videoUrl: finalVideoUrl, savedPath }
          );
        } else {
          // Only query status
          const statusResult = await getVideoTaskStatus(p.taskId);

          // Update task status
          const task = context.tasks.find((t) => t.taskId === p.taskId);
          if (task) {
            task.status = statusResult.status;
            if (statusResult.videoUrl) {
              task.videoUrl = statusResult.videoUrl;
            }
            if (statusResult.error) {
              task.error = statusResult.error;
            }
          }

          return result(
            `Task ${p.taskId} status: ${statusResult.status}${
              statusResult.videoUrl ? `\nVideo URL: ${statusResult.videoUrl}` : ''
            }${statusResult.error ? `\nError: ${statusResult.error}` : ''}`,
            { taskId: p.taskId, ...statusResult }
          );
        }
      } catch (err: any) {
        return result(`Failed to query status: ${err.message}`, { error: true });
      }
    },
  };
}
