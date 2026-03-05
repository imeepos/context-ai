import { randomUUID } from "node:crypto";
import type { OSAuditRecord } from "../types/os.js";

export class AuditLog {
	private readonly records: OSAuditRecord[] = [];

	record(input: Omit<OSAuditRecord, "id" | "timestamp">): OSAuditRecord {
		const record: OSAuditRecord = {
			...input,
			id: randomUUID(),
			timestamp: new Date().toISOString(),
		};
		this.records.push(record);
		return record;
	}

	list(): OSAuditRecord[] {
		return [...this.records];
	}

	filterBySession(sessionId: string): OSAuditRecord[] {
		return this.records.filter((record) => record.sessionId === sessionId);
	}

	findByTraceId(traceId: string): OSAuditRecord | undefined {
		return this.records.find((record) => record.traceId === traceId);
	}
}
