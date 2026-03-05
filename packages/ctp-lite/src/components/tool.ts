import type { JSXElement, ToolProps } from '../core/types';
export function Tool(props: ToolProps): JSXElement {
  return { type: 'Tool', props: props as unknown as Record<string, unknown>, key: props.name };
}
export type { ToolProps };
