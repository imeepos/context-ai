import type { JSXElement, TextProps } from '../core/types';

export function Text(props: TextProps): JSXElement {
  return { type: 'Text', props: props as unknown as Record<string, unknown> };
}
export type { TextProps };
