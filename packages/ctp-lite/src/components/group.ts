import type { JSXElement, GroupProps } from '../core/types';

export function Group(props: GroupProps): JSXElement {
  return { type: 'Group', props: props as unknown as Record<string, unknown> };
}
export type { GroupProps };
