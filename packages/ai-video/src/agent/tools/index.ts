/**
 * Agent tool definitions
 * Based on AgentTool interface from @mariozechner/pi-agent-core
 */

import type { AgentTool } from '@mariozechner/pi-agent-core';
import type { AgentContext } from '../../types.js';

// Import tools
import { createReadStoryboardTool } from './readStoryboard.js';
import { createReadImagesTool } from './readImages.js';
import { createGetModelsTool } from './getModels.js';
import { createGenerateVideoTool } from './generateVideo.js';
import { createCheckStatusTool } from './checkStatus.js';
import { createSaveVideoTool } from './saveVideo.js';

export { createReadStoryboardTool } from './readStoryboard.js';
export { createReadImagesTool } from './readImages.js';
export { createGetModelsTool } from './getModels.js';
export { createGenerateVideoTool } from './generateVideo.js';
export { createCheckStatusTool } from './checkStatus.js';
export { createSaveVideoTool } from './saveVideo.js';
export { result } from './toolUtils.js';

/**
 * Get all tools
 */
export function createAllTools(context: AgentContext): AgentTool[] {
  return [
    createReadStoryboardTool(context),
    createReadImagesTool(context),
    createGetModelsTool(),
    createGenerateVideoTool(context),
    createCheckStatusTool(context),
    createSaveVideoTool(context),
  ];
}
