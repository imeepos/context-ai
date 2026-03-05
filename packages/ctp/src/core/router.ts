import type { JSXElement, RouteHandler } from './types';

export class Router {
  private routes: Map<string, RouteHandler> = new Map();
  private history: string[] = [];
  private current: string | null = null;

  register(name: string, handler: RouteHandler): void {
    this.routes.set(name, handler);
  }

  registerRoutes(routes: Record<string, RouteHandler>): void {
    for (const [name, handler] of Object.entries(routes)) {
      this.routes.set(name, handler);
    }
  }

  async navigate(name: string, params?: Record<string, unknown>): Promise<JSXElement> {
    const handler = this.routes.get(name);
    if (!handler) {
      throw new Error(`Route not found: ${name}`);
    }

    if (this.current !== null) {
      this.history.push(this.current);
    }

    this.current = name;
    return handler(params);
  }

  async back(): Promise<JSXElement | null> {
    if (this.history.length === 0) {
      return null;
    }

    const previous = this.history.pop()!;
    this.current = previous;

    const handler = this.routes.get(previous);
    if (!handler) {
      throw new Error(`Route not found: ${previous}`);
    }

    return handler();
  }

  currentRoute(): string | null {
    return this.current;
  }

  getHistory(): string[] {
    return [...this.history];
  }

  clearHistory(): void {
    this.history = [];
  }
}

export const router = new Router();
