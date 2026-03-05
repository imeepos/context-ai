/**
 * Agent class for CTP-Lite
 *
 * The Agent manages the conversation loop between the user and the LLM,
 * handling context rendering, tool execution, and state management.
 */

import type {
  JSXElement,
  AgentConfig,
  AgentEvent,
  ChatMessage,
  ChatRequest,
  ToolContext,
} from './types';
import { render } from './renderer';
import { router } from './router';
import { state } from './state';

/**
 * Agent class that manages the conversation loop
 */
export class Agent {
  private config: AgentConfig;
  private history: ChatMessage[] = [];
  private cycles = 0;

  /**
   * Create a new Agent instance
   * @param config - Agent configuration
   */
  constructor(config: AgentConfig) {
    this.config = config;
  }

  /**
   * Run the agent
   * Loads the entry component and starts the chat loop
   */
  async run(): Promise<void> {
    this.emit({ type: 'agent_start', timestamp: Date.now(), id: this.generateId() });

    try {
      // Load entry component
      let entryContext: JSXElement;

      if (typeof this.config.entry === 'string') {
        // Entry is a route name, navigate to it
        entryContext = await router.navigate(this.config.entry);
      } else {
        // Entry is a component function
        entryContext = await this.config.entry();
      }

      // Start the chat loop
      await this.chatLoop(entryContext);
    } catch (error) {
      this.emit({
        type: 'error',
        error: error instanceof Error ? error.message : String(error),
        timestamp: Date.now(),
        id: this.generateId(),
        recoverable: false,
      });
      throw error;
    } finally {
      this.emit({ type: 'agent_end', timestamp: Date.now(), id: this.generateId() });
    }
  }

  /**
   * Main conversation loop
   * @param initialContext - Initial JSX context element
   */
  private async chatLoop(initialContext: JSXElement): Promise<void> {
    const maxCycles = this.config.maxCycles ?? 20;
    let currentContext = initialContext;

    while (this.cycles < maxCycles) {
      this.cycles++;

      this.emit({
        type: 'turn_start',
        cycle: this.cycles,
        timestamp: Date.now(),
        id: this.generateId(),
      });

      try {
        // Render the context to get prompt and tools
        const rendered = await render(currentContext);

        // Build chat request
        const request: ChatRequest = {
          messages: [
            // System message with context prompt
            { role: 'system', content: rendered.prompt },
            // Conversation history
            ...this.history,
          ],
          // Available tools
          tools: rendered.tools,
        };

        // Call LLM
        const response = await this.config.llm.chat(request);

        // Handle assistant message
        if (response.message.content) {
          const message: ChatMessage = {
            role: 'assistant',
            content: response.message.content,
          };

          // Emit message event
          this.emit({
            type: 'message',
            message,
            timestamp: Date.now(),
            id: this.generateId(),
          });

          // Add to history
          this.history.push(message);
        }

        // Handle tool calls
        const toolCalls = response.message.tool_calls;
        if (toolCalls && toolCalls.length > 0) {
          let navigated = false;

          for (const toolCall of toolCalls) {
            // Find matching tool
            const tool = rendered.tools.find((t) => t.name === toolCall.function.name);

            if (!tool) {
              this.emit({
                type: 'error',
                error: `Tool not found: ${toolCall.function.name}`,
                timestamp: Date.now(),
                id: this.generateId(),
                recoverable: true,
              });
              continue;
            }

            // Parse tool arguments
            let args: Record<string, unknown>;
            try {
              args = JSON.parse(toolCall.function.arguments);
            } catch {
              args = {};
            }

            // Emit tool_start event
            this.emit({
              type: 'tool_start',
              tool: tool.name,
              params: args,
              toolCallId: toolCall.id,
              timestamp: Date.now(),
              id: this.generateId(),
            });

            try {
              // Execute tool with ToolContext
              const toolContext: ToolContext = {
                state,
                router,
              };

              const result = await tool.execute(args, toolContext);

              // Check if result is JSX (navigation)
              if (this.isJSXElement(result)) {
                currentContext = result as JSXElement;
                navigated = true;

                // Emit navigation event
                this.emit({
                  type: 'navigation',
                  to: rendered.name,
                  timestamp: Date.now(),
                  id: this.generateId(),
                });

                break; // Break out of tool call loop on navigation
              }

              // Add tool result to history
              const toolResultMessage: ChatMessage = {
                role: 'tool',
                content: typeof result === 'string' ? result : JSON.stringify(result),
                name: tool.name,
                tool_call_id: toolCall.id,
              };
              this.history.push(toolResultMessage);

              // Emit tool_end event
              this.emit({
                type: 'tool_end',
                tool: tool.name,
                result,
                toolCallId: toolCall.id,
                timestamp: Date.now(),
                id: this.generateId(),
              });
            } catch (error) {
              const errorMessage = error instanceof Error ? error.message : String(error);

              // Add error result to history
              const toolResultMessage: ChatMessage = {
                role: 'tool',
                content: `Error: ${errorMessage}`,
                name: tool.name,
                tool_call_id: toolCall.id,
              };
              this.history.push(toolResultMessage);

              // Emit tool_end event with error
              this.emit({
                type: 'tool_end',
                tool: tool.name,
                result: null,
                toolCallId: toolCall.id,
                error: errorMessage,
                timestamp: Date.now(),
                id: this.generateId(),
              });
            }
          }

          // If we navigated, continue to next cycle with new context
          if (navigated) {
            continue;
          }
        } else {
          // No tool calls, emit waiting_input and return
          this.emit({
            type: 'waiting_input',
            prompt: 'Waiting for user input...',
            timestamp: Date.now(),
            id: this.generateId(),
          });
          return;
        }

        this.emit({
          type: 'turn_end',
          cycle: this.cycles,
          timestamp: Date.now(),
          id: this.generateId(),
        });
      } catch (error) {
        this.emit({
          type: 'error',
          error: error instanceof Error ? error.message : String(error),
          timestamp: Date.now(),
          id: this.generateId(),
          recoverable: false,
        });
        throw error;
      }
    }

    // Max cycles reached
    this.emit({
      type: 'error',
      error: `Maximum cycles (${maxCycles}) reached`,
      timestamp: Date.now(),
      id: this.generateId(),
      recoverable: false,
    });
  }

  /**
   * Check if a value is a JSX element
   * @param value - Value to check
   * @returns True if value is a JSX element
   */
  private isJSXElement(value: unknown): boolean {
    if (!value || typeof value !== 'object') {
      return false;
    }

    const element = value as Record<string, unknown>;

    // JSX elements have a 'type' property (string or function)
    // and a 'props' property (object or null)
    return (
      'type' in element &&
      (typeof element.type === 'string' || typeof element.type === 'function') &&
      'props' in element &&
      (typeof element.props === 'object' || element.props === null)
    );
  }

  /**
   * Emit an event if onEvent is configured
   * @param event - Event to emit
   */
  private emit(event: AgentEvent): void {
    if (this.config.onEvent) {
      try {
        this.config.onEvent(event);
      } catch (error) {
        console.error('Error in event handler:', error);
      }
    }
  }

  /**
   * Generate a unique ID
   * @returns Unique ID string
   */
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
  }
}

/**
 * Create a new Agent instance
 * @param config - Agent configuration
 * @returns Agent instance
 */
export function createAgent(config: AgentConfig): Agent {
  return new Agent(config);
}
