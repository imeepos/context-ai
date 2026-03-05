export interface ShellExecutionRecord {
	command: string;
	exitCode: number;
	durationMs: number;
	sessionId: string;
}

export class ShellAuditLog {
	private readonly records: ShellExecutionRecord[] = [];

	record(record: ShellExecutionRecord): void {
		this.records.push(record);
	}

	list(): ShellExecutionRecord[] {
		return [...this.records];
	}
}
