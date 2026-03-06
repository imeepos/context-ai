import type { TSchema } from '@sinclair/typebox';
import type { AgentTool } from '@mariozechner/pi-agent-core';
import type { JSXElement } from '../core/types.js';

export function Tool<TParameters extends TSchema = TSchema, TDetails = any>(props: AgentTool<TParameters, TDetails>): JSXElement {
  return { type: 'Tool', props: props as unknown as Record<string, unknown>, key: props.name };
}

export type ToolProps<TParameters extends TSchema = TSchema, TDetails = any> = AgentTool<TParameters, TDetails>;
