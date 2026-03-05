import type { TodoItem } from './types.js';
import { deleteTodoFromStore } from './store.js';

export async function deleteTodoItem(id: number): Promise<TodoItem | null> {
  return deleteTodoFromStore(id);
}
