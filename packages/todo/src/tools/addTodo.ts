import type { AgentToolResult, AgentToolUpdateCallback } from '@mariozechner/pi-agent-core';
import { addTodoToStore } from '../todo/store.js';
import type { AddTodoParamsType, TodoItem } from '../todo/types.js';

export async function addTodo(
  _toolCallId: string,
  params: AddTodoParamsType,
  _signal?: AbortSignal,
  _onUpdate?: AgentToolUpdateCallback
): Promise<AgentToolResult<{ item: TodoItem }>> {
  const text = params.text?.trim();
  if (!text) {
    return { content: [{ type: 'text', text: 'Text is required' }], details: { item: null! } };
  }

  const item = await addTodoToStore(text);
  return { content: [{ type: 'text', text: `Added: ${item.text}` }], details: { item } };
}
