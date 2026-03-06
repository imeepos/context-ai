import type { AgentToolResult, AgentToolUpdateCallback } from '@mariozechner/pi-agent-core';
import type { IdParamsType, TodoItem } from '../todo/types.js';
import type { TodoToolRuntime } from '../runtime/TodoRuntimeContext.js';

export function createToggleTodoTool(runtime: TodoToolRuntime) {
  return async function toggleTodo(
    _toolCallId: string,
    params: IdParamsType,
    _signal?: AbortSignal,
    _onUpdate?: AgentToolUpdateCallback
  ): Promise<AgentToolResult<{ item: TodoItem | null }>> {
    const id = params.id;
    if (id === undefined || !Number.isInteger(id) || id <= 0) {
      return { content: [{ type: 'text', text: 'Valid ID is required' }], details: { item: null } };
    }

    const updated = await runtime.todoService.toggle(id);
    if (!updated) {
      return { content: [{ type: 'text', text: 'Not found' }], details: { item: null } };
    }

    return { content: [{ type: 'text', text: `Toggled: ${updated.text}` }], details: { item: updated } };
  };
}
