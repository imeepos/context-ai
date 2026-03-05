import { clearTodoStore } from './store.js';

export async function clearTodoItems(): Promise<number> {
  return clearTodoStore();
}
