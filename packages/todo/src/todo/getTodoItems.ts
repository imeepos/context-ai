import type { TodoItem } from './types.js';
import { getTodoItemsSnapshot } from './store.js';

export function getTodoItems(): TodoItem[] {
  return getTodoItemsSnapshot();
}
