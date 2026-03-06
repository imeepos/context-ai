import type { AgentToolResult, AgentToolUpdateCallback } from '@mariozechner/pi-agent-core';
import type { AddTodoParamsType, TodoItem } from '../todo/types.js';
import type { TodoToolRuntime } from '../runtime/TodoRuntimeContext.js';

export function createAddTodoTool(runtime: TodoToolRuntime) {
  return async function addTodo(
    _toolCallId: string,
    params: AddTodoParamsType,
    _signal?: AbortSignal,
    _onUpdate?: AgentToolUpdateCallback
  ): Promise<AgentToolResult<{ item: TodoItem | null }>> {
    const text = params.text?.trim();
    if (!text) {
      return { content: [{ type: 'text', text: 'Text is required' }], details: { item: null } };
    }

    const item = await runtime.todoService.add(text);
    return { content: [{ type: 'text', text: `Added: ${item.text}` }], details: { item } };
  };
}
