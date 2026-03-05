/**
 * State management for CTP-Lite
 */

import type { StateAPI } from './types';

export class StateManager implements StateAPI {
	private store = new Map<string, unknown>();
	private subscribers = new Map<string, Set<(newVal: unknown, oldVal: unknown) => void>>();
	private batchDepth = 0;
	private batchUpdates = new Map<string, { newVal: unknown; oldVal: unknown }>();

	get<T>(key: string): T | undefined {
		return this.store.get(key) as T | undefined;
	}

	set<T>(key: string, value: T): void {
		const oldVal = this.store.get(key);
		this.store.set(key, value);

		if (this.batchDepth > 0) {
			this.batchUpdates.set(key, { newVal: value, oldVal });
		} else {
			this.notify(key, value, oldVal);
		}
	}

	remove(key: string): void {
		const oldVal = this.store.get(key);
		this.store.delete(key);

		if (this.batchDepth > 0) {
			this.batchUpdates.set(key, { newVal: undefined, oldVal });
		} else {
			this.notify(key, undefined, oldVal);
		}
	}

	clear(): void {
		if (this.batchDepth > 0) {
			for (const [key, oldVal] of this.store) {
				this.batchUpdates.set(key, { newVal: undefined, oldVal });
			}
		} else {
			for (const [key, oldVal] of this.store) {
				this.notify(key, undefined, oldVal);
			}
		}
		this.store.clear();
	}

	all(): Record<string, unknown> {
		return Object.fromEntries(this.store);
	}

	subscribe<T>(key: string, callback: (newVal: T, oldVal: T) => void): () => void {
		if (!this.subscribers.has(key)) {
			this.subscribers.set(key, new Set());
		}

		const wrappedCallback = (newVal: unknown, oldVal: unknown) => {
			callback(newVal as T, oldVal as T);
		};

		this.subscribers.get(key)!.add(wrappedCallback);

		return () => {
			this.subscribers.get(key)?.delete(wrappedCallback);
		};
	}

	batch(operations: () => void): void {
		this.batchDepth++;
		try {
			operations();
		} finally {
			this.batchDepth--;
			if (this.batchDepth === 0) {
				for (const [key, { newVal, oldVal }] of this.batchUpdates) {
					this.notify(key, newVal, oldVal);
				}
				this.batchUpdates.clear();
			}
		}
	}

	private notify(key: string, newVal: unknown, oldVal: unknown): void {
		const callbacks = this.subscribers.get(key);
		if (callbacks) {
			for (const callback of callbacks) {
				try {
					callback(newVal, oldVal);
				} catch (err) {
					console.error(`Error in state subscriber for key "${key}":`, err);
				}
			}
		}
	}
}

export const state: StateAPI = new StateManager();
