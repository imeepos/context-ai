import { Agent, AgentTool } from '@mariozechner/pi-agent-core';
import { createCustomModel } from '../config/createCustomModel.js';
import { getApiKey } from '../config/getApiKey.js';

export function createTodoAgent(systemPrompt: string, tools: AgentTool[]): Agent {
  return new Agent({
    initialState: {
      systemPrompt,
      model: createCustomModel(),
      tools,
    },
    getApiKey: async () => getApiKey(),
  });
}
