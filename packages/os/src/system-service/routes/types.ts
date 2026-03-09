export interface SystemRoutesRequest {
	appId?: string;
	prefix?: string;
	offset?: number;
	limit?: number;
}

export interface SystemRoutesResponse {
	routes: string[];
	total: number;
}

export interface SystemRoutesStatsRequest {
	appId?: string;
}

export interface SystemRoutesStatsResponse {
	stats: Array<{
		route: string;
		total: number;
		success: number;
		failure: number;
		lastRenderedAt?: string;
		lastError?: string;
	}>;
}
