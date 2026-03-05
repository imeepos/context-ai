import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import type { TodoItem } from './types.js';

export type TodoStoreData = {
  items: TodoItem[];
  nextId: number;
};

const STORE_DIR = path.join(os.homedir(), '.context-ai', 'todo');
export const TODO_STORE_PATH = path.join(STORE_DIR, 'todo.json');

const DEFAULT_STORE: TodoStoreData = {
  items: [],
  nextId: 1,
};

let storeCache: TodoStoreData = { ...DEFAULT_STORE };
let initPromise: Promise<void> | null = null;
let writeChain: Promise<void> = Promise.resolve();

async function ensureStoreReady(): Promise<void> {
  if (!initPromise) {
    initPromise = (async () => {
      await fs.mkdir(STORE_DIR, { recursive: true });
      try {
        const raw = await fs.readFile(TODO_STORE_PATH, 'utf8');
        storeCache = normalizeStore(JSON.parse(raw) as Partial<TodoStoreData>);
      } catch {
        storeCache = { ...DEFAULT_STORE };
        await fs.writeFile(TODO_STORE_PATH, JSON.stringify(storeCache, null, 2), 'utf8');
      }
    })();
  }
  await initPromise;
}

function queueWrite(task: () => Promise<void>): Promise<void> {
  writeChain = writeChain.then(task, task);
  return writeChain;
}

function normalizeStore(parsed: Partial<TodoStoreData>): TodoStoreData {
  const items = Array.isArray(parsed.items) ? parsed.items : [];
  const nextId = typeof parsed.nextId === 'number' && parsed.nextId > 0 ? parsed.nextId : inferNextId(items);
  return { items, nextId };
}

function cloneStore(data: TodoStoreData): TodoStoreData {
  return {
    items: data.items.map((item) => ({ ...item })),
    nextId: data.nextId,
  };
}

export async function readTodoStore(): Promise<TodoStoreData> {
  await ensureStoreReady();
  return cloneStore(storeCache);
}

export async function writeTodoStore(data: TodoStoreData): Promise<void> {
  await ensureStoreReady();
  const normalized = normalizeStore(data);
  await queueWrite(async () => {
    storeCache = cloneStore(normalized);
    await fs.writeFile(TODO_STORE_PATH, JSON.stringify(storeCache, null, 2), 'utf8');
  });
}

export function getTodoItemsSnapshot(): TodoItem[] {
  return storeCache.items.map((item) => ({ ...item }));
}

export async function addTodoToStore(text: string): Promise<TodoItem> {
  await ensureStoreReady();
  const item: TodoItem = { id: storeCache.nextId++, text, completed: false };
  storeCache.items = [...storeCache.items, item];
  await queueWrite(async () => {
    await fs.writeFile(TODO_STORE_PATH, JSON.stringify(storeCache, null, 2), 'utf8');
  });
  return { ...item };
}

export async function toggleTodoInStore(id: number): Promise<TodoItem | null> {
  await ensureStoreReady();
  const index = storeCache.items.findIndex((todo) => todo.id === id);
  if (index === -1) {
    return null;
  }

  const current = storeCache.items[index]!;
  const updated: TodoItem = { ...current, completed: !current.completed };
  storeCache.items = [
    ...storeCache.items.slice(0, index),
    updated,
    ...storeCache.items.slice(index + 1),
  ];
  await queueWrite(async () => {
    await fs.writeFile(TODO_STORE_PATH, JSON.stringify(storeCache, null, 2), 'utf8');
  });
  return { ...updated };
}

export async function deleteTodoFromStore(id: number): Promise<TodoItem | null> {
  await ensureStoreReady();
  const index = storeCache.items.findIndex((todo) => todo.id === id);
  if (index === -1) {
    return null;
  }

  const removed = storeCache.items[index]!;
  storeCache.items = storeCache.items.filter((todo) => todo.id !== id);
  await queueWrite(async () => {
    await fs.writeFile(TODO_STORE_PATH, JSON.stringify(storeCache, null, 2), 'utf8');
  });
  return { ...removed };
}

export async function clearTodoStore(): Promise<number> {
  await ensureStoreReady();
  const removedCount = storeCache.items.length;
  storeCache = { items: [], nextId: 1 };
  await queueWrite(async () => {
    await fs.writeFile(TODO_STORE_PATH, JSON.stringify(storeCache, null, 2), 'utf8');
  });
  return removedCount;
}

function inferNextId(items: TodoItem[]): number {
  if (items.length === 0) {
    return 1;
  }
  return Math.max(...items.map((item) => item.id)) + 1;
}
