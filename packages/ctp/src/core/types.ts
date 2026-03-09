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
  /** 元素类型：HTML 标签名（如 'div'）或组件函数 */
  type: string | Function;
  /** 元素属性对象 */
  props: Record<string, unknown> | null;
  /** React key，用于列表渲染时的 diff 优化 */
  key?: string | null;
}