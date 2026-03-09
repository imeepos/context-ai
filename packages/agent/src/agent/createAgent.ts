import { Agent } from '@mariozechner/pi-agent-core';
import type { AgentTool } from '@mariozechner/pi-agent-core';
import { createCustomModel } from '../config/createCustomModel.js';
import { getApiKey } from '../config/getApiKey.js';

export function createAgent(systemPrompt: string, tools: AgentTool[]): Agent {
  return new Agent({
    initialState: {
      systemPrompt,
      model: createCustomModel(),
      tools,
      thinkingLevel: "xhigh",
    },
    // 添加 transformContext 来移除 thinkingSignature
    transformContext: async (messages) => {
      return messages.map(msg => {
        if (msg.role === 'assistant' && Array.isArray(msg.content)) {
          // 移除 thinkingSignature
          for (const content of msg.content) {
            if (content.type === 'thinking') {
              delete content.thinkingSignature;
            }
          }
        }
        return msg;
      });
    },
    getApiKey: async () => getApiKey(),
  });
}