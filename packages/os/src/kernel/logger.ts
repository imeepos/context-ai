export interface StructuredLog {
	level: "info" | "error";
	event: string;
	timestamp: string;
	traceId: string;
	metadata?: Record<string, unknown>;
}

export class KernelLogger {
	private readonly records: StructuredLog[] = [];

	info(event: string, traceId: string, metadata?: Record<string, unknown>): void {
		this.records.push({
			level: "info",
			event,
			traceId,
			timestamp: new Date().toISOString(),
			metadata,
		});
	}

	error(event: string, traceId: string, metadata?: Record<string, unknown>): void {
		this.records.push({
			level: "error",
			event,
			traceId,
			timestamp: new Date().toISOString(),
			metadata,
		});
	}

	list(): StructuredLog[] {
		return [...this.records];
	}
}
