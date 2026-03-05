import type { LLMAdapter, ChatRequest, ChatResponse, AdapterConfig } from './types';

/**
 * Create an OpenAI-compatible LLM adapter
 */
export function createOpenAIAdapter(config: AdapterConfig): LLMAdapter {
  const baseUrl = config.baseUrl || 'https://api.openai.com/v1';
  const defaultModel = config.defaultModel || 'gpt-4';

  return {
    async chat(request: ChatRequest): Promise<ChatResponse> {
      const url = `${baseUrl}/chat/completions`;

      const body = {
        model: request.model || defaultModel,
        messages: request.messages,
        tools: request.tools?.map(tool => ({
          type: 'function',
          function: {
            name: tool.name,
            description: tool.description,
            parameters: tool.parameters,
          },
        })),
        temperature: request.temperature,
        max_tokens: request.maxTokens,
      };

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.apiKey}`,
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`OpenAI API error: ${response.status} - ${error}`);
      }

      return await response.json();
    },

    async *chatStream(request: ChatRequest): AsyncIterable<ChatResponse> {
      const url = `${baseUrl}/chat/completions`;

      const body = {
        model: request.model || defaultModel,
        messages: request.messages,
        tools: request.tools?.map(tool => ({
          type: 'function',
          function: {
            name: tool.name,
            description: tool.description,
            parameters: tool.parameters,
          },
        })),
        temperature: request.temperature,
        max_tokens: request.maxTokens,
        stream: true,
      };

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.apiKey}`,
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`OpenAI API error: ${response.status} - ${error}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('Response body is not readable');
      }

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith('data: ')) continue;

          const data = trimmed.slice(6);
          if (data === '[DONE]') return;

          try {
            const chunk = JSON.parse(data);
            yield chunk as ChatResponse;
          } catch {
            // Skip parse errors for incomplete chunks
          }
        }
      }
    },
  };
}
