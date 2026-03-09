export interface SystemAuditRequest {
	sessionId?: string;
	traceId?: string;
	service?: string;
	limit?: number;
}

export interface SystemAuditResponse {
	records: Array<{
		id: string;
		timestamp: string;
		appId: string;
		sessionId: string;
		traceId?: string;
		service: string;
		success: boolean;
		durationMs: number;
		error?: string;
		errorCode?: string;
	}>;
}

export interface SystemAuditExportRequest {
	since?: string;
	until?: string;
	cursor?: number;
	limit?: number;
	format?: "jsonl";
	compress?: boolean;
	signingSecret?: string;
	keyId?: string;
}

export interface SystemAuditExportResponse {
	content: string;
	contentType: string;
	compressed: boolean;
	signature: string;
	keyId: string;
	nextCursor: number;
	exported: number;
}
