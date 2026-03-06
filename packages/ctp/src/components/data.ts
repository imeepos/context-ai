import type { JSXElement } from '../core/types.js';
export interface DataProps<T = unknown> {
  source: string | T | T[];
  format?: 'table' | 'list' | 'json' | 'tree' | 'csv';
  fields?: string[];
  title?: string;
  render?: (item: T, index: number) => string;
}
export function Data<T = any>(props: DataProps<T>): JSXElement {
  return { type: 'Data', props: props as unknown as Record<string, unknown>, key: props.title };
}
