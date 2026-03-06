import type { TodoItem } from '../todo/types.js';
import type { TodoService } from '../todo/service.js';

export type TodoToolRuntime = {
  appId: string;
  sessionId: string;
  route: string;
  toolName: string;
  todoService: TodoService;
};

export class TodoRuntimeContext {
  constructor(
    private readonly config: {
      appId: string;
      sessionId: string;
      route: string;
      todoService: TodoService;
    }
  ) {}

  get appId(): string {
    return this.config.appId;
  }

  get sessionId(): string {
    return this.config.sessionId;
  }

  get route(): string {
    return this.config.route;
  }

  async listItems(): Promise<TodoItem[]> {
    return this.config.todoService.list();
  }

  createToolRuntime(toolName: string): TodoToolRuntime {
    return {
      appId: this.config.appId,
      sessionId: this.config.sessionId,
      route: this.config.route,
      toolName,
      todoService: this.config.todoService,
    };
  }
}
