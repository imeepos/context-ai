import type { AgentToolResult, AgentToolUpdateCallback } from '@mariozechner/pi-agent-core';
import type { EmptyParamsType } from '../todo/types.js';
import type { TodoToolRuntime } from '../runtime/TodoRuntimeContext.js';

export function createClearTodosTool(runtime: TodoToolRuntime) {
  return async function clearTodos(
    _toolCallId: string,
    _params: EmptyParamsType,
    _signal?: AbortSignal,
    _onUpdate?: AgentToolUpdateCallback
  ): Promise<AgentToolResult<{ removedCount: number }>> {
    const removedCount = await runtime.todoService.clear();
    return {
      content: [{ type: 'text', text: `Cleared ${removedCount} todo item(s)` }],
      details: { removedCount },
    };
  };
}
