import type { JSXElement } from '../core/types.js';

export interface ContextProps {
  name: string;
  description?: string;
  children?: JSXElement | JSXElement[] | string | number | boolean | null;
  metadata?: Record<string, unknown>;
}
export function Context(props: ContextProps): JSXElement {
  return { type: 'Context', props: props as unknown as Record<string, unknown>, key: props.name };
}
