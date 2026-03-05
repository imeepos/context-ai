/**
 * CTP-Lite Core Type Definitions
 *
 * This file contains all type definitions for the CTP-Lite framework,
 * including JSON Schema, tool definitions, context rendering, JSX elements,
 * LLM adapters, and agent events.
 */

// ============================================================================
// JSON Schema Types
// ============================================================================

/**
 * JSON Schema definition for tool parameters
 */
export interface JSONSchema {
  type: 'object' | 'array' | 'string' | 'number' | 'integer' | 'boolean' | 'null';
  title?: string;
  description?: string;
  default?: unknown;
  properties?: Record<string, JSONSchema>;
  required?: string[];
  items?: JSONSchema | JSONSchema[];
  additionalProperties?: boolean | JSONSchema;
  enum?: unknown[];
  const?: unknown;
  format?: string;
  pattern?: string;
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  minItems?: number;
  maxItems?: number;
  uniqueItems?: boolean;
  oneOf?: JSONSchema[];
  anyOf?: JSONSchema[];
  allOf?: JSONSchema[];
  $ref?: string;
}

// ============================================================================
// State API Interface (defined here to avoid circular dependencies)
// ============================================================================

/**
 * State manager interface for accessing and modifying state
 * Defined in types.ts to avoid circular imports with ToolContext
 */
export interface StateAPI {
  /** Get a value from state */
  get<T>(key: string): T | undefined;
  /** Set a value in state */
  set<T>(key: string, value: T): void;
  /** Remove a value from state */
  remove(key: string): void;
  /** Clear all state */
  clear(): void;
  /** Get all state as a record */
  all(): Record<string, unknown>;
  /** Subscribe to changes for a specific key */
  subscribe<T>(key: string, callback: (newVal: T, oldVal: T) => void): () => void;
  /** Batch multiple state operations */
  batch(operations: () => void): void;
}

// ============================================================================
// Forward Declarations (to avoid circular dependencies)
// ============================================================================

import type { Router } from './router';

// ============================================================================
// Tool Context
// ============================================================================

/**
 * Context passed to tool execute functions
 * Uses type-only imports to avoid circular dependencies
 */
export interface ToolContext {
  /** State manager for accessing and modifying state */
  state: StateAPI;
  /** Router for navigation between contexts */
  router: Router;
  /** Additional context data */
  data?: Record<string, unknown>;
}

// ============================================================================
// Rendered Context
// ============================================================================

/**
 * Risk level for tool execution
 */
export type RiskLevel = 'none' | 'low' | 'medium' | 'high' | 'critical';

/**
 * Data view configuration for displaying structured data
 */
export interface DataView<T = unknown> {
  /** Data source - can be URL string or actual data */
  source: T[] | string;
  /** Display format for the data */
  format: 'table' | 'list' | 'json' | 'tree' | 'csv';
  /** Field names to display */
  fields?: string[];
  /** Title for the data view */
  title?: string;
  /** Additional data */
  data?: T;
}

/**
 * Tool reference in a rendered context
 */
export interface ToolReference {
  /** Tool name */
  name: string;
  /** Tool description */
  description: string;
  /** Display label for the tool */
  label?: string;
  /** Whether the tool requires confirmation */
  confirm?: boolean;
  /** Risk level of the tool */
  risk?: RiskLevel;
  /** JSON Schema for parameters */
  parameters?: JSONSchema;
  /** Execute function implementation */
  execute?: (params: Record<string, unknown>, context: ToolContext) => Promise<unknown> | unknown;
}

/**
 * The main rendering result for a context
 * Contains all information needed to render the context UI
 */
export interface RenderedContext {
  /** Context name/identifier */
  name: string;
  /** Human-readable description */
  description?: string;
  /** Main prompt text for the LLM */
  prompt: string;
  /** Available tools in this context */
  tools: ToolDefinition[];
  /** Data views to display */
  dataViews: DataView[];
  /** State snapshot for this context */
  state?: Record<string, unknown>;
  /** Additional metadata */
  metadata?: {
    /** Context version */
    version?: string;
    /** Author information */
    author?: string;
    /** Tags for categorization */
    tags?: string[];
    /** Custom properties */
    [key: string]: unknown;
  };
}

// ============================================================================
// Tool Definition
// ============================================================================

/**
 * Tool definition with generic parameter and return types
 */
export interface ToolDefinition<P = Record<string, unknown>, R = unknown> {
  /** Tool name/identifier */
  name: string;
  /** Human-readable description */
  description: string;
  /** JSON Schema for parameters */
  parameters: JSONSchema;
  /** Execute function implementation */
  execute: (params: P, context: ToolContext) => Promise<R> | R;
  /** Whether to require user confirmation before execution */
  confirm?: boolean;
  /** Risk level of the tool */
  risk?: RiskLevel;
}

// ============================================================================
// JSX Element Types
// ============================================================================

/**
 * JSX Element representing a component instance
 */
export interface JSXElement {
  /** Component type (string for intrinsic elements, function for components) */
  type: string | Function;
  /** Component properties */
  props: Record<string, unknown> | null;
  /** Unique key for list rendering */
  key?: string | number;
}

/**
 * Props for the Context component
 */
export interface ContextProps {
  /** Context name/identifier */
  name: string;
  /** Context description */
  description?: string;
  /** Child elements */
  children?: JSXElement | JSXElement[] | string | number | boolean | null;
  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Props for the Text component
 */
export interface TextProps {
  /** Text content */
  children?: string | number | boolean | null;
  /** Style variant */
  variant?: 'default' | 'heading' | 'subheading' | 'code' | 'quote' | 'emphasis';
  /** Language for code blocks */
  language?: string;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Props for the Data component
 */
export interface DataProps<T = unknown> {
  /** Data source */
  source: string | T;
  /** Display format */
  format?: 'table' | 'list' | 'json' | 'tree' | 'csv';
  /** Field names to display */
  fields?: string[];
  /** Title for the data view */
  title?: string;
}

/**
 * Props for the Tool component
 */
export interface ToolProps {
  /** Tool name */
  name: string;
  /** Display label */
  label?: string;
  /** Tool description */
  description: string;
  /** Whether confirmation is required */
  confirm?: boolean;
  /** Risk level of the tool */
  risk?: RiskLevel;
  /** Zod schema for parameters (optional) */
  schema?: unknown;
  /** JSON Schema for parameters (alternative to schema) */
  params?: JSONSchema;
  /** Tool executor function */
  execute?: (params: Record<string, unknown>, context: ToolContext) => Promise<unknown> | unknown;
}

/**
 * Props for the Group component
 */
export interface GroupProps {
  /** Group title */
  title?: string;
  /** Child elements */
  children?: JSXElement | JSXElement[] | string | number | boolean | null;
  /** Whether the group is collapsible */
  collapsible?: boolean;
  /** Default collapsed state */
  defaultCollapsed?: boolean;
}

/**
 * Props for the Example component
 */
export interface ExampleProps {
  /** Example title */
  title?: string;
  /** Example description */
  description?: string;
  /** Example code or content */
  children?: JSXElement | JSXElement[] | string | number | boolean | null;
  /** Language for syntax highlighting */
  language?: string;
  /** Example input (for LLM examples) */
  input?: string;
  /** Example output (for LLM examples) */
  output?: string;
}

// ============================================================================
// LLM Types
// ============================================================================

/**
 * Role in a chat conversation
 */
export type ChatRole = 'system' | 'user' | 'assistant' | 'tool';

/**
 * A single message in a chat conversation
 */
export interface ChatMessage {
  /** Message role */
  role: ChatRole;
  /** Message content */
  content: string;
  /** Optional name identifier (for tool messages) */
  name?: string;
  /** Tool calls made by the assistant */
  tool_calls?: ToolCall[];
  /** Tool call ID this message is responding to */
  tool_call_id?: string;
}

/**
 * A tool call from the LLM
 */
export interface ToolCall {
  /** Unique identifier for this tool call */
  id: string;
  /** Tool type (typically 'function') */
  type: 'function';
  /** Function call details */
  function: {
    /** Tool name */
    name: string;
    /** JSON string of arguments */
    arguments: string;
  };
}

/**
 * Chat request to send to the LLM
 */
export interface ChatRequest {
  /** Conversation messages */
  messages: ChatMessage[];
  /** Available tools */
  tools?: ToolDefinition[];
  /** Model identifier */
  model?: string;
  /** Temperature (0-2) */
  temperature?: number;
  /** Maximum tokens to generate */
  max_tokens?: number;
  /** Whether to stream the response */
  stream?: boolean;
  /** Additional provider-specific options */
  options?: Record<string, unknown>;
}

/**
 * Chat response from the LLM
 */
export interface ChatResponse {
  /** Response message */
  message: ChatMessage;
  /** Token usage information */
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  /** Model used for the response */
  model?: string;
  /** Finish reason */
  finish_reason?: 'stop' | 'length' | 'tool_calls' | 'content_filter' | null;
  /** Additional provider-specific metadata */
  metadata?: Record<string, unknown>;
}

/**
 * LLM Adapter interface for different providers
 */
export interface LLMAdapter {
  /** Adapter name/identifier */
  name: string;
  /** Send a chat request to the LLM */
  chat(request: ChatRequest): Promise<ChatResponse>;
  /** Stream a chat response */
  stream?(request: ChatRequest): AsyncIterableIterator<ChatResponse>;
  /** List available models */
  listModels?(): Promise<string[]>;
}

// ============================================================================
// Agent Events
// ============================================================================

/**
 * Base event interface
 */
export interface BaseAgentEvent {
  /** Event timestamp */
  timestamp: number;
  /** Event ID */
  id: string;
}

/**
 * Message event - a new message in the conversation
 */
export interface MessageEvent extends BaseAgentEvent {
  type: 'message';
  /** Message data */
  message: ChatMessage;
}

/**
 * Tool start event - a tool execution has started
 */
export interface ToolStartEvent extends BaseAgentEvent {
  type: 'tool_start';
  /** Tool name */
  tool: string;
  /** Tool parameters */
  params: Record<string, unknown>;
  /** Tool call ID */
  toolCallId: string;
}

/**
 * Tool end event - a tool execution has completed
 */
export interface ToolEndEvent extends BaseAgentEvent {
  type: 'tool_end';
  /** Tool name */
  tool: string;
  /** Execution result */
  result: unknown;
  /** Tool call ID */
  toolCallId: string;
  /** Error if execution failed */
  error?: string;
}

/**
 * Waiting for input event - agent needs user input
 */
export interface WaitingInputEvent extends BaseAgentEvent {
  type: 'waiting_input';
  /** Prompt for the user */
  prompt: string;
  /** Expected input type */
  inputType?: 'text' | 'confirm' | 'select' | 'multiselect';
  /** Options for select/multiselect */
  options?: Array<{ label: string; value: string }>;
}

/**
 * Error event - an error occurred
 */
export interface ErrorEvent extends BaseAgentEvent {
  type: 'error';
  /** Error message */
  error: string;
  /** Error code */
  code?: string;
  /** Whether the error is recoverable */
  recoverable?: boolean;
}

/**
 * Agent start event - agent execution has started
 */
export interface AgentStartEvent extends BaseAgentEvent {
  type: 'agent_start';
}

/**
 * Agent end event - agent execution has completed
 */
export interface AgentEndEvent extends BaseAgentEvent {
  type: 'agent_end';
}

/**
 * Turn start event - a new conversation turn has started
 */
export interface TurnStartEvent extends BaseAgentEvent {
  type: 'turn_start';
  /** Cycle number */
  cycle: number;
}

/**
 * Turn end event - a conversation turn has completed
 */
export interface TurnEndEvent extends BaseAgentEvent {
  type: 'turn_end';
  /** Cycle number */
  cycle: number;
}

/**
 * Navigation event - context navigation occurred
 */
export interface NavigationEvent extends BaseAgentEvent {
  type: 'navigation';
  /** Target context name */
  to: string;
}

/**
 * Union type for all agent events
 */
export type AgentEvent =
  | MessageEvent
  | ToolStartEvent
  | ToolEndEvent
  | WaitingInputEvent
  | ErrorEvent
  | AgentStartEvent
  | AgentEndEvent
  | TurnStartEvent
  | TurnEndEvent
  | NavigationEvent;

// ============================================================================
// Agent Configuration
// ============================================================================

/**
 * Agent configuration interface
 */
export interface AgentConfig {
  /** LLM adapter for chat completions */
  llm: LLMAdapter;
  /** Entry point - either a route name or a component function */
  entry: string | (() => JSXElement | Promise<JSXElement>);
  /** Maximum number of conversation cycles (default: 20) */
  maxCycles?: number;
  /** Event handler for agent events */
  onEvent?: (event: AgentEvent) => void;
}

// ============================================================================
// Routing Types
// ============================================================================

/**
 * Route handler function type
 * Takes optional parameters and returns a JSX element (or promise of one)
 */
export type RouteHandler = (
  params?: Record<string, unknown>
) => JSXElement | Promise<JSXElement>;
