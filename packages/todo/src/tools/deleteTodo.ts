import type { AgentToolResult, AgentToolUpdateCallback } from '@mariozechner/pi-agent-core';
import type { IdParamsType, TodoItem } from '../todo/types.js';
import type { TodoToolRuntime } from '../runtime/TodoRuntimeContext.js';

export function createDeleteTodoTool(runtime: TodoToolRuntime) {
  return async function deleteTodo(
    _toolCallId: string,
    params: IdParamsType,
    _signal?: AbortSignal,
    _onUpdate?: AgentToolUpdateCallback
  ): Promise<AgentToolResult<{ removed: TodoItem | null }>> {
    const id = params.id;
    if (id === undefined || !Number.isInteger(id) || id <= 0) {
      return { content: [{ type: 'text', text: 'Valid ID is required' }], details: { removed: null } };
    }

    const removed = await runtime.todoService.delete(id);
    if (!removed) {
      return { content: [{ type: 'text', text: 'Not found' }], details: { removed: null } };
    }

    return { content: [{ type: 'text', text: `Deleted: ${removed.text}` }], details: { removed } };
  };
}
