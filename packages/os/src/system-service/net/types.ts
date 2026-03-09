// Circuit types
export type SystemNetCircuitRequest = Record<string, never>;

export interface SystemNetCircuitResponse {
	circuits: Record<
		string,
		{
			state: "closed" | "open" | "half-open";
			failures: number;
			lastFailure?: string;
		}
	>;
}

export interface SystemNetCircuitResetRequest {
	host?: string;
}

export interface SystemNetCircuitResetResponse {
	cleared: number;
}

// Scheduler Failures types
export interface SystemSchedulerFailuresRequest {
	id?: string;
	limit?: number;
}

export interface SystemSchedulerFailuresResponse {
	failures: Array<{
		id: string;
		timestamp: string;
		error: string;
		attempt: number;
	}>;
}
