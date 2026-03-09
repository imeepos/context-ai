export interface SystemHealthResponse {
	services: string[];
	metrics: Array<{
		service: string;
		total: number;
		success: number;
		failure: number;
		p95DurationMs: number;
		successRate: number;
		errorRate: number;
	}>;
}

export interface SystemDependenciesResponse {
	graph: Record<string, string[]>;
}

export interface SystemMetricsRequest {
	service?: string;
}

export interface SystemMetricsResponse {
	metrics: Array<{
		service: string;
		total: number;
		success: number;
		failure: number;
		p95DurationMs: number;
		successRate: number;
		errorRate: number;
	}>;
}

export interface SystemTopologyResponse {
	services: string[];
	dependencies: Record<string, string[]>;
	bootOrder: string[];
	metrics: Array<{
		service: string;
		total: number;
		success: number;
		failure: number;
		p95DurationMs: number;
		successRate: number;
		errorRate: number;
	}>;
}

export interface SystemCapabilitiesRequest {
	appId: string;
}

export interface SystemCapabilitiesResponse {
	appId: string;
	capabilities: string[];
}

export interface SystemCapabilitiesListResponse {
	capabilitiesByApp: Record<string, string[]>;
}

export interface SystemEventsRequest {
	topic?: string;
	limit?: number;
}

export interface SystemEventsResponse {
	events: Array<{
		topic: string;
		timestamp: string;
		payload: unknown;
	}>;
}

export interface SystemSnapshotResponse {
	health: {
		services: string[];
		metricsCount: number;
	};
	topology: {
		services: string[];
		bootOrder: string[];
	};
	policy: unknown;
	latestAudit?: {
		id: string;
		service: string;
		success: boolean;
		errorCode?: string;
		timestamp: string;
	};
	resilience: {
		openNetCircuits: number;
		schedulerFailures: number;
	};
}

export interface SystemSLORequest {
	services?: string[];
}

export interface SystemSLOResponse {
	global: {
		total: number;
		success: number;
		failure: number;
		successRate: number;
		errorRate: number;
		p95DurationMs: number;
	};
	services: Array<{
		service: string;
		total: number;
		success: number;
		failure: number;
		p95DurationMs: number;
		successRate: number;
		errorRate: number;
	}>;
	alerting: {
		ackedCount: number;
		p95AckLatencyMs: number;
	};
}
