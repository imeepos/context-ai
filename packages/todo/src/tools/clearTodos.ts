import type { AgentToolResult, AgentToolUpdateCallback } from '@mariozechner/pi-agent-core';
import { clearTodoStore } from '../todo/store.js';
import type { EmptyParamsType } from '../todo/types.js';

export async function clearTodos(
  _toolCallId: string,
  _params: EmptyParamsType,
  _signal?: AbortSignal,
  _onUpdate?: AgentToolUpdateCallback
): Promise<AgentToolResult<{ removedCount: number }>> {
  const removedCount = await clearTodoStore();
  return {
    content: [{ type: 'text', text: `Cleared ${removedCount} todo item(s)` }],
    details: { removedCount },
  };
}
