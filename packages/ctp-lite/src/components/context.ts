import type { JSXElement, ContextProps } from '../core/types';

export function Context(props: ContextProps): JSXElement {
  return { type: 'Context', props: props as unknown as Record<string, unknown>, key: props.name };
}
export type { ContextProps };
