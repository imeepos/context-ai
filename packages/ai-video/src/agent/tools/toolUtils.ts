/**
 * Tool utility functions
 */
import type { AgentToolResult } from '@mariozechner/pi-agent-core';

/**
 * Create tool result
 */
export function result(text: string, details: Record<string, unknown> = {}): AgentToolResult<Record<string, unknown>> {
  return {
    content: [{ type: 'text', text }],
    details,
  };
}
