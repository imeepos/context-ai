import type { CreateDefaultLLMOSOptions } from "../../llm-os.types.js";
import type { StoreValue } from "../../store-service/index.js";
import { StoreService } from "../../store-service/index.js";

interface NetJournalEntry {
	url: string;
	method: string;
	status?: number | null;
	success: boolean;
	appId?: string;
	sessionId?: string;
	error?: string | null;
	timestamp: string;
}

function serializeNetJournalEntry(entry: NetJournalEntry): StoreValue {
	const serialized: Record<string, StoreValue> = {
		url: entry.url,
		method: entry.method,
		status: entry.status ?? null,
		success: entry.success,
		error: entry.error ?? null,
		timestamp: entry.timestamp,
	};
	if (entry.appId !== undefined) {
		serialized.appId = entry.appId;
	}
	if (entry.sessionId !== undefined) {
		serialized.sessionId = entry.sessionId;
	}
	return serialized;
}

export function createNetJournalWriter(
	storeService: StoreService,
	options: CreateDefaultLLMOSOptions = {},
): (entry: NetJournalEntry) => Promise<void> {
	return async (entry: NetJournalEntry) => {
		const key = "net.journal";
		const journalLimit = options.netJournalLimit ?? 1000;
		const existing = (storeService.get(key) as StoreValue[] | undefined) ?? [];
		const next = [...existing, serializeNetJournalEntry(entry)];
		storeService.set(key, next.slice(-journalLimit));
	};
}
