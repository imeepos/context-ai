import type { JSXElement, DataProps } from '../core/types';

export function Data<T = any>(props: DataProps<T>): JSXElement {
  return { type: 'Data', props: props as unknown as Record<string, unknown>, key: props.title };
}
export type { DataProps };
