import { Agent } from '@mariozechner/pi-agent-core';
import type { AgentTool } from '@mariozechner/pi-agent-core';
import { createCustomModel } from '../config/createCustomModel.js';
import { getApiKey } from '../config/getApiKey.js';

function normalizeThinkingLevel(value: string | undefined): 'off' | 'minimal' | 'low' | 'medium' | 'high' | 'xhigh' {
  const v = (value ?? 'off').trim().toLowerCase();
  if (v === 'minimal' || v === 'low' || v === 'medium' || v === 'high' || v === 'xhigh') return v;
  return 'off';
}

export function createAgent(systemPrompt: string, tools: AgentTool[]): Agent {
  const thinkingLevel = normalizeThinkingLevel(process.env.AGENT_THINKING_LEVEL);

  return new Agent({
    initialState: {
      systemPrompt: systemPrompt,
      model: createCustomModel(),
      tools,
      // Default to off to avoid cross-turn Responses item-id errors under store=false.
      thinkingLevel,
    },
    // Remove thinking blocks before next LLM call to keep context provider-safe.
    transformContext: async (messages) => {
      return messages.map((msg: any) => {
        if (msg.role === 'assistant' && Array.isArray(msg.content)) {
          return {
            ...msg,
            content: msg.content.filter((content: any) => content.type !== 'thinking'),
          };
        }
        return msg;
      });
    },
    getApiKey: async () => getApiKey(),
  });
}
