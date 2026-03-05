import type { AgentToolResult, AgentToolUpdateCallback } from '@mariozechner/pi-agent-core';
import { toggleTodoInStore } from '../todo/store.js';
import type { IdParamsType, TodoItem } from '../todo/types.js';

export async function toggleTodo(
  _toolCallId: string,
  params: IdParamsType,
  _signal?: AbortSignal,
  _onUpdate?: AgentToolUpdateCallback
): Promise<AgentToolResult<{ item: TodoItem }>> {
  const id = params.id;
  if (id === undefined) {
    return { content: [{ type: 'text', text: 'ID is required' }], details: { item: null! } };
  }

  const updated = await toggleTodoInStore(id);
  if (!updated) {
    return { content: [{ type: 'text', text: 'Not found' }], details: { item: null! } };
  }

  return { content: [{ type: 'text', text: `Toggled: ${updated.text}` }], details: { item: updated } };
}
