import type { JSXElement } from '../core/types';
export interface TextProps {
  children?: string | number | boolean | null;
  variant?: 'default' | 'heading' | 'subheading' | 'code' | 'quote' | 'emphasis';
  language?: string;
  className?: string;
}

export function Text(props: TextProps): JSXElement {
  return { type: 'Text', props: props as unknown as Record<string, unknown> };
}
