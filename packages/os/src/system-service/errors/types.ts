export interface SystemErrorsRequest {
	service?: string;
	servicePrefix?: string;
	errorCode?: string;
	windowMinutes?: number;
	limit?: number;
	bucketMinutes?: number;
	order?: "asc" | "desc";
	offset?: number;
	recentLimit?: number;
}

export interface SystemErrorsResponse {
	totalFailures: number;
	byErrorCode: Record<string, number>;
	byReason: Record<string, number>;
	topReasons: Array<{ reason: string; count: number }>;
	byService: Record<
		string,
		{
			total: number;
			byErrorCode: Record<string, number>;
		}
	>;
	recent: Array<{
		timestamp: string;
		service: string;
		traceId?: string;
		errorCode?: string;
		error?: string;
		appId: string;
		sessionId: string;
	}>;
	trend: Array<{
		bucketStart: string;
		count: number;
	}>;
}

export interface SystemErrorsExportRequest extends SystemErrorsRequest {
	format?: "json" | "csv";
	compress?: boolean;
	signingSecret?: string;
	keyId?: string;
}

export interface SystemErrorsExportResponse {
	format: "json" | "csv";
	contentType: "application/json" | "text/csv" | "application/gzip+base64";
	content: string;
	contentSha256: string;
	compressed: boolean;
	signature: string;
	keyId: string;
}
