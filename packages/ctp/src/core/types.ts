/**
 * CTP-Lite Core Type Definitions (Core Only)
 */

import type { AgentTool } from '@mariozechner/pi-agent-core';


export interface StateAPI {
  get<T>(key: string): T | undefined;
  set<T>(key: string, value: T): void;
  remove(key: string): void;
  clear(): void;
  all(): Record<string, unknown>;
  subscribe<T>(key: string, callback: (newVal: T, oldVal: T) => void): () => void;
  batch(operations: () => void): void;
}


export interface DataView<T = unknown> {
  source: T[] | string;
  format: 'table' | 'list' | 'json' | 'tree' | 'csv';
  fields?: string[];
  title?: string;
  data?: T;
}

export interface RenderedContext {
  name: string;
  description?: string;
  prompt: string;
  tools: AgentTool[];
  dataViews: DataView[];
  state?: Record<string, unknown>;
  metadata?: {
    version?: string;
    author?: string;
    tags?: string[];
    [key: string]: unknown;
  };
}

export interface JSXElement {
  type: string | Function;
  props: Record<string, unknown> | null;
  key?: string | number;
}

export type RouteHandler = (
  params?: Record<string, unknown>
) => JSXElement | Promise<JSXElement>;
