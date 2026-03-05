import type { Agent } from '@mariozechner/pi-agent-core';

export function subscribeTodoAgentEvents(agent: Agent): void {
  agent.subscribe((event) => {
    if (event.type === 'message_update' && event.assistantMessageEvent.type === 'text_delta') {
      process.stdout.write(event.assistantMessageEvent.delta);
    }
    if (event.type === 'tool_execution_start') {
      console.log('[Tool]', event.toolName, event.args);
    }
  });
}
