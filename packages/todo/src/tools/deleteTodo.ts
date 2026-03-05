import type { AgentToolResult, AgentToolUpdateCallback } from '@mariozechner/pi-agent-core';
import { deleteTodoFromStore } from '../todo/store.js';
import type { IdParamsType, TodoItem } from '../todo/types.js';

export async function deleteTodo(
  _toolCallId: string,
  params: IdParamsType,
  _signal?: AbortSignal,
  _onUpdate?: AgentToolUpdateCallback
): Promise<AgentToolResult<{ removed: TodoItem }>> {
  const id = params.id;
  if (id === undefined) {
    return { content: [{ type: 'text', text: 'ID is required' }], details: { removed: null! } };
  }

  const removed = await deleteTodoFromStore(id);
  if (!removed) {
    return { content: [{ type: 'text', text: 'Not found' }], details: { removed: null! } };
  }

  return { content: [{ type: 'text', text: `Deleted: ${removed.text}` }], details: { removed } };
}
