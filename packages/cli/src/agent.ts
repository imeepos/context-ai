import { Agent } from "@mariozechner/pi-agent-core";
import type { Model } from "@mariozechner/pi-ai";

const API_KEY = "ur7T7a9dqcQVVAdX-4AtjOjog6FFLvWAJr1a-WL3";
const BASE_URL = "https://ai.bowong.cc";
const MODEL_ID = "azure/gpt-5.2-chat";

export function getApiKey(): string {
  return API_KEY;
}

export function createCustomModel(): Model<"openai-responses"> {
  return {
    id: MODEL_ID,
    name: "gpt-5.2-chat",
    api: "openai-responses",
    provider: "azure",
    baseUrl: BASE_URL,
    reasoning: false,
    input: ["text"] as const,
    cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
    contextWindow: 128000,
    maxTokens: 4096,
  };
}

export const agent = new Agent({
  initialState: {
    systemPrompt: "You are a helpful assistant.",
    model: createCustomModel(),
    thinkingLevel: "off",
    tools: [],
    messages: [],
  },
  getApiKey: async () => getApiKey(),
});
