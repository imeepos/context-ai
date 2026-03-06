import type { JSXElement } from '../core/types.js';
export interface ExampleProps {
  title?: string;
  description?: string;
  children?: JSXElement | JSXElement[] | string | number | boolean | null;
  language?: string;
  input?: string;
  output?: string;
}
export function Example(props: ExampleProps): JSXElement {
  return { type: 'Example', props: props as unknown as Record<string, unknown> };
}
