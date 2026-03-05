import type { TodoItem } from './types.js';
import { toggleTodoInStore } from './store.js';

export async function toggleTodoItem(id: number): Promise<TodoItem | null> {
  return toggleTodoInStore(id);
}
