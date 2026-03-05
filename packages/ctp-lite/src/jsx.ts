import type { JSXElement } from './core/types';

/**
 * JSX factory for CTP-Lite
 * This enables using TSX syntax with our component system
 */
export function jsx(type: string | ((props: any) => JSXElement), props: any, key?: string | number): JSXElement {
  return { type, props: props || {}, key };
}

export function jsxFragment(props: { children?: any }): JSXElement {
  return { type: 'Fragment', props: props || {} };
}

export function Fragment(props: { children?: any }): JSXElement {
  return { type: 'Fragment', props: props || {} };
}
