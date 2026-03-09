import type { JSXElement } from './core/types.js';

/**
 * JSX factory for CTP-Lite
 * This enables using TSX syntax with our component system
 */
export function jsx(
  type: string | ((props: any) => JSXElement),
  props: any,
  ...children: unknown[]
): JSXElement {
  const normalizedProps = props ? { ...props } : {};
  if (children.length === 1) {
    normalizedProps.children = children[0];
  } else if (children.length > 1) {
    normalizedProps.children = children;
  }

  const key = normalizedProps.key as string | null;
  if ('key' in normalizedProps) {
    delete normalizedProps.key;
  }

  return { type, props: normalizedProps, key };
}

export function jsxFragment(props: { children?: unknown }): JSXElement {
  return { type: 'Fragment', props: props || {} };
}

export function Fragment(props: { children?: unknown }): JSXElement {
  return { type: 'Fragment', props: props || {} };
}
