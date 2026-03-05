// Core
export * from './core/types';
export * from './core/renderer';
export * from './core/builder';
export * from './core/state';
export * from './core/router';
export * from './core/agent';

// Components
export * from './components';

// Adapters - only export factory functions, not types (types are in core)
export { createOpenAIAdapter } from './adapters/llm/openai';

// Re-export commonly used items
export { render } from './core/renderer';
export { buildPrompt } from './core/builder';
export { state } from './core/state';
export { router } from './core/router';
export { Agent, createAgent } from './core/agent';

// Re-export StateManager class (it's exported in state.ts)
import { StateManager } from './core/state';
export { StateManager };
