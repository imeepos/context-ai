import type { TodoItem } from './types.js';
import { addTodoToStore } from './store.js';

export async function addTodoItem(text: string): Promise<TodoItem> {
  return addTodoToStore(text);
}
