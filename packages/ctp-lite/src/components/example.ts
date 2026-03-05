import type { JSXElement, ExampleProps } from '../core/types';

export function Example(props: ExampleProps): JSXElement {
  return { type: 'Example', props: props as unknown as Record<string, unknown> };
}
export type { ExampleProps };
