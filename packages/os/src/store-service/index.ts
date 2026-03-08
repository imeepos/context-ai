import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { createOSServiceClass } from "../os-service-class.js";
import { STORE_GET, STORE_SET } from "../tokens.js";
import type { OSService } from "../types/os.js";

type StoreValue = string | number | boolean | null | { [k: string]: StoreValue } | StoreValue[];

export interface StoreAdapter {
	kind: "memory" | "json-file" | "sqlite-like";
	set(key: string, value: StoreValue): Promise<void>;
	get(key: string): Promise<StoreValue | undefined>;
	dump(): Promise<Record<string, StoreValue>>;
	save?(): Promise<void>;
	load?(): Promise<void>;
}

class MemoryStoreAdapter implements StoreAdapter {
	readonly kind = "memory" as const;
	private readonly kv = new Map<string, StoreValue>();

	async set(key: string, value: StoreValue): Promise<void> {
		this.kv.set(key, value);
	}

	async get(key: string): Promise<StoreValue | undefined> {
		return this.kv.get(key);
	}

	async dump(): Promise<Record<string, StoreValue>> {
		return Object.fromEntries(this.kv.entries()) as Record<string, StoreValue>;
	}
}

class JsonFileStoreAdapter implements StoreAdapter {
	readonly kind: StoreAdapter["kind"] = "json-file";
	private readonly kv = new Map<string, StoreValue>();

	constructor(private readonly path: string) {}

	async set(key: string, value: StoreValue): Promise<void> {
		this.kv.set(key, value);
	}

	async get(key: string): Promise<StoreValue | undefined> {
		return this.kv.get(key);
	}

	async dump(): Promise<Record<string, StoreValue>> {
		return Object.fromEntries(this.kv.entries()) as Record<string, StoreValue>;
	}

	async save(): Promise<void> {
		const dir = dirname(this.path);
		await mkdir(dir, { recursive: true });
		await writeFile(this.path, JSON.stringify(Object.fromEntries(this.kv.entries()), null, 2), "utf8");
	}

	async load(): Promise<void> {
		if (!existsSync(this.path)) return;
		const raw = await readFile(this.path, "utf8");
		const parsed = JSON.parse(raw) as Record<string, StoreValue>;
		for (const [key, value] of Object.entries(parsed)) {
			this.kv.set(key, value);
		}
	}
}

class SqliteLikeStoreAdapter extends JsonFileStoreAdapter {
	readonly kind = "sqlite-like" as const;
}

export class StoreService {
	private readonly kv = new Map<string, StoreValue>();
	private readonly adapter: StoreAdapter;

	constructor(adapter: StoreAdapter = new MemoryStoreAdapter()) {
		this.adapter = adapter;
	}

	set(key: string, value: StoreValue): void {
		this.kv.set(key, value);
		void this.adapter.set(key, value);
	}

	get(key: string): StoreValue | undefined {
		return this.kv.get(key);
	}

	async saveToFile(path: string): Promise<void> {
		const dir = dirname(path);
		await mkdir(dir, { recursive: true });
		const data = JSON.stringify(Object.fromEntries(this.kv.entries()), null, 2);
		await writeFile(path, data, "utf8");
	}

	async loadFromFile(path: string): Promise<void> {
		if (!existsSync(path)) return;
		const raw = await readFile(path, "utf8");
		const parsed = JSON.parse(raw) as Record<string, StoreValue>;
		for (const [key, value] of Object.entries(parsed)) {
			this.kv.set(key, value);
		}
	}

	async save(): Promise<void> {
		if (this.adapter.save) {
			await this.adapter.save();
		}
	}

	async load(): Promise<void> {
		if (this.adapter.load) {
			await this.adapter.load();
		}
		const dump = await this.adapter.dump();
		this.kv.clear();
		for (const [key, value] of Object.entries(dump)) {
			this.kv.set(key, value);
		}
	}

	static createMemory(): StoreService {
		return new StoreService(new MemoryStoreAdapter());
	}

	static createJsonFile(path: string): StoreService {
		return new StoreService(new JsonFileStoreAdapter(path));
	}

	static createSqliteLike(path: string): StoreService {
		return new StoreService(new SqliteLikeStoreAdapter(path));
	}
}

export interface StoreSetRequest {
	key: string;
	value: StoreValue;
}

export interface StoreGetRequest {
	key: string;
}

export const StoreSetOSService = createOSServiceClass(STORE_SET, {
	requiredPermissions: ["store:write"],
	execute: ([store]: [StoreService], req) => {
		store.set(req.key, req.value);
		return { ok: true as const };
	},
});

export function createStoreSetService(store: StoreService): OSService<StoreSetRequest, { ok: true }> {
	return new StoreSetOSService(store);
}

export const StoreGetOSService = createOSServiceClass(STORE_GET, {
	requiredPermissions: ["store:read"],
	execute: ([store]: [StoreService], req) => ({ value: store.get(req.key) }),
});

export function createStoreGetService(store: StoreService): OSService<StoreGetRequest, { value: StoreValue | undefined }> {
	return new StoreGetOSService(store);
}

export type { StoreValue };
