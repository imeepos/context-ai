import type { JSXElement } from '../core/types.js';
export interface GroupProps {
  title?: string;
  children?: JSXElement | JSXElement[] | string | number | boolean | null;
  collapsible?: boolean;
  defaultCollapsed?: boolean;
}

export function Group(props: GroupProps): JSXElement {
  return { type: 'Group', props: props as unknown as Record<string, unknown> };
}
