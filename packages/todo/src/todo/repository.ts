import type { LLMOSKernel, OSContext, StoreValue } from '@context-ai/os';
import type { TodoItem } from './types.js';

export type TodoState = {
  version: number;
  items: TodoItem[];
  nextId: number;
};

const DEFAULT_STATE: TodoState = {
  version: 1,
  items: [],
  nextId: 1,
};

export type TodoRepository = {
  getState: () => Promise<TodoState>;
  updateStateCAS: (mutate: (current: TodoState) => TodoState) => Promise<TodoState>;
};

export function createTodoRepository(
  kernel: LLMOSKernel,
  context: OSContext,
  storeKey: string,
): TodoRepository {
  let writeChain: Promise<void> = Promise.resolve();

  async function readRaw(): Promise<StoreValue | undefined> {
    const response = await kernel.execute<{ key: string }, { value: StoreValue | undefined }>(
      'store.get',
      { key: storeKey },
      context
    );
    return response.value;
  }

  async function writeState(state: TodoState): Promise<void> {
    const value: StoreValue = toStoreValue(state);
    await kernel.execute('store.set', { key: storeKey, value }, context);
  }

  async function getState(): Promise<TodoState> {
    const raw = await readRaw();
    const normalized = normalizeState(raw);
    if (!raw) {
      await writeState(normalized);
    }
    return cloneState(normalized);
  }

  function queueWrite<T>(task: () => Promise<T>): Promise<T> {
    const queued = writeChain.then(task, task);
    writeChain = queued.then(() => undefined, () => undefined);
    return queued;
  }

  async function updateStateCAS(mutate: (current: TodoState) => TodoState): Promise<TodoState> {
    return queueWrite(async () => {
      for (let attempt = 0; attempt < 5; attempt += 1) {
        const current = await getState();
        const latest = normalizeState(await readRaw());
        if (latest.version !== current.version) {
          continue;
        }

        const nextCandidate = mutate(cloneState(current));
        const nextNormalized = normalizeState(toStoreValue(nextCandidate));
        const next: TodoState = {
          ...nextNormalized,
          version: current.version + 1,
        };
        await writeState(next);
        return cloneState(next);
      }
      throw new Error('Todo state update failed after retry attempts.');
    });
  }

  return {
    getState,
    updateStateCAS,
  };
}

function toStoreValue(state: TodoState): StoreValue {
  return {
    version: state.version,
    nextId: state.nextId,
    items: state.items.map((item) => ({
      id: item.id,
      text: item.text,
      completed: item.completed,
    })),
  };
}

function normalizeState(value: StoreValue | undefined): TodoState {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return cloneState(DEFAULT_STATE);
  }

  const obj = value as {
    version?: unknown;
    nextId?: unknown;
    items?: unknown;
  };

  const parsedItems = Array.isArray(obj.items)
    ? obj.items
      .filter((item) => item && typeof item === 'object' && !Array.isArray(item))
      .map((item) => {
        const entry = item as { id?: unknown; text?: unknown; completed?: unknown };
        return {
          id: typeof entry.id === 'number' && Number.isInteger(entry.id) && entry.id > 0 ? entry.id : -1,
          text: typeof entry.text === 'string' ? entry.text.trim() : '',
          completed: Boolean(entry.completed),
        };
      })
      .filter((item) => item.id > 0 && item.text.length > 0)
    : [];

  const inferredNextId = parsedItems.length === 0
    ? 1
    : Math.max(...parsedItems.map((item) => item.id)) + 1;

  const nextId = typeof obj.nextId === 'number' && Number.isInteger(obj.nextId) && obj.nextId > 0
    ? obj.nextId
    : inferredNextId;

  const version = typeof obj.version === 'number' && Number.isInteger(obj.version) && obj.version > 0
    ? obj.version
    : 1;

  return {
    version,
    items: parsedItems,
    nextId,
  };
}

function cloneState(state: TodoState): TodoState {
  return {
    version: state.version,
    nextId: state.nextId,
    items: state.items.map((item) => ({ ...item })),
  };
}
