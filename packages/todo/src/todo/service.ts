import type { TodoItem } from './types.js';
import type { TodoRepository } from './repository.js';

export type TodoService = {
  list: () => Promise<TodoItem[]>;
  add: (text: string) => Promise<TodoItem>;
  toggle: (id: number) => Promise<TodoItem | null>;
  delete: (id: number) => Promise<TodoItem | null>;
  clear: () => Promise<number>;
};

export function createTodoService(repository: TodoRepository): TodoService {
  return {
    async list(): Promise<TodoItem[]> {
      const state = await repository.getState();
      return state.items;
    },
    async add(text: string): Promise<TodoItem> {
      const normalizedText = text.trim();
      if (!normalizedText) {
        throw new Error('Todo text is required.');
      }

      const state = await repository.updateStateCAS((current) => {
        const duplicated = current.items.some((item) => item.text === normalizedText);
        if (duplicated) {
          return current;
        }

        const item: TodoItem = {
          id: current.nextId,
          text: normalizedText,
          completed: false,
        };
        return {
          ...current,
          items: [...current.items, item],
          nextId: current.nextId + 1,
        };
      });

      const created = state.items.find((item) => item.text === normalizedText);
      if (!created) {
        throw new Error('Todo add failed.');
      }
      return created;
    },
    async toggle(id: number): Promise<TodoItem | null> {
      let toggled: TodoItem | null = null;
      await repository.updateStateCAS((current) => {
        const index = current.items.findIndex((item) => item.id === id);
        if (index === -1) {
          return current;
        }
        const updated: TodoItem = {
          ...current.items[index]!,
          completed: !current.items[index]!.completed,
        };
        toggled = updated;
        return {
          ...current,
          items: [
            ...current.items.slice(0, index),
            updated,
            ...current.items.slice(index + 1),
          ],
        };
      });
      return toggled;
    },
    async delete(id: number): Promise<TodoItem | null> {
      let removed: TodoItem | null = null;
      await repository.updateStateCAS((current) => {
        const index = current.items.findIndex((item) => item.id === id);
        if (index === -1) {
          return current;
        }
        removed = current.items[index]!;
        return {
          ...current,
          items: current.items.filter((item) => item.id !== id),
        };
      });
      return removed;
    },
    async clear(): Promise<number> {
      let removedCount = 0;
      await repository.updateStateCAS((current) => {
        removedCount = current.items.length;
        return {
          ...current,
          items: [],
          nextId: 1,
        };
      });
      return removedCount;
    },
  };
}
