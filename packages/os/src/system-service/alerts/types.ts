import type { NotificationSeverity } from "../types.js";

export interface SystemAlertsRequest {
	topic?: string;
	severity?: NotificationSeverity;
	since?: string;
	until?: string;
	limit?: number;
}

export interface SystemAlertsResponse {
	total: number;
	bySeverity: Partial<Record<NotificationSeverity, number>>;
	alerts: Array<{
		timestamp: string;
		topic: string;
		severity: NotificationSeverity;
		message: string;
		acknowledged: boolean;
		ackedAt?: string;
	}>;
}

export interface SystemAlertsClearRequest {
	topic?: string;
	severity?: NotificationSeverity;
}

export interface SystemAlertsClearResponse {
	cleared: number;
}

export interface SystemAlertsExportRequest {
	topic?: string;
	severity?: NotificationSeverity;
	since?: string;
	until?: string;
	limit?: number;
	format?: "json" | "csv";
}

export interface SystemAlertsExportResponse {
	format: "json" | "csv";
	contentType: "application/json" | "text/csv";
	content: string;
}

export interface SystemAlertsStatsResponse {
	stats: {
		sent: number;
		dropped: {
			dedupe: number;
			muted: number;
			rateLimited: number;
		};
		byTopic: Record<string, { sent: number; dropped: number }>;
	};
}

export interface SystemAlertsTopicsResponse {
	topics: Record<
		string,
		{
			sent: number;
			dropped: number;
			total: number;
		}
	>;
}

export interface SystemAlertsUnackedRequest {
	topic?: string;
	severity?: NotificationSeverity;
	limit?: number;
}

export interface SystemAlertsUnackedResponse {
	total: number;
	alerts: Array<{
		timestamp: string;
		topic: string;
		severity: NotificationSeverity;
		message: string;
		acknowledged: boolean;
		ackedAt?: string;
	}>;
}

export interface SystemAlertsPolicyResponse {
	policy: {
		dedupeWindowMs: number;
		muteWindowMs: number;
		rateLimitPerMinute: number;
	};
}

export interface SystemAlertsTrendsRequest {
	windowMinutes: number;
	topic?: string;
}

export interface SystemAlertsTrendsResponse {
	windowMinutes: number;
	total: number;
	bySeverity: Partial<Record<NotificationSeverity, number>>;
}

export interface SystemAlertsSLOResponse {
	ackedCount: number;
	avgAckLatencyMs: number;
	p95AckLatencyMs: number;
}

export interface SystemAlertsIncidentsRequest {
	topic?: string;
	severity?: NotificationSeverity;
	limit?: number;
}

export interface SystemAlertsIncidentsResponse {
	totalIncidents: number;
	incidents: Array<{
		signature: string;
		topic: string;
		severity: NotificationSeverity;
		message: string;
		count: number;
		firstSeen: string;
		lastSeen: string;
	}>;
}

export interface SystemAlertsDigestRequest {
	topic?: string;
	limit?: number;
}

export interface SystemAlertsDigestResponse {
	total: number;
	digest: string;
}

export interface SystemAlertsReportRequest {
	topic?: string;
	windowMinutes?: number;
}

export interface SystemAlertsReportResponse {
	policy: {
		dedupeWindowMs: number;
		muteWindowMs: number;
		rateLimitPerMinute: number;
	};
	stats: {
		sent: number;
		dropped: {
			dedupe: number;
			muted: number;
			rateLimited: number;
		};
		byTopic: Record<string, { sent: number; dropped: number }>;
	};
	trends: {
		windowMinutes: number;
		total: number;
		bySeverity: Partial<Record<NotificationSeverity, number>>;
	};
	slo: {
		ackedCount: number;
		avgAckLatencyMs: number;
		p95AckLatencyMs: number;
	};
	digest: string;
}

export interface SystemAlertsReportCompactResponse {
	summary: string;
}

export interface SystemAlertsFlappingRequest {
	windowMinutes: number;
	threshold: number;
	topic?: string;
}

export interface SystemAlertsFlappingResponse {
	total: number;
	items: Array<{
		signature: string;
		topic: string;
		severity: NotificationSeverity;
		message: string;
		count: number;
	}>;
}

export interface SystemAlertsTimelineRequest {
	windowMinutes: number;
	bucketMinutes: number;
	topic?: string;
	severity?: NotificationSeverity;
}

export interface SystemAlertsTimelineResponse {
	windowMinutes: number;
	bucketMinutes: number;
	buckets: Array<{
		start: string;
		end: string;
		total: number;
		bySeverity: Partial<Record<NotificationSeverity, number>>;
	}>;
}

export interface SystemAlertsHotspotsRequest {
	windowMinutes: number;
	topic?: string;
	limit?: number;
}

export interface SystemAlertsHotspotsResponse {
	windowMinutes: number;
	items: Array<{
		signature: string;
		message: string;
		severity: NotificationSeverity;
		currentCount: number;
		previousCount: number;
		delta: number;
	}>;
}

export interface SystemAlertsRecommendationsRequest {
	topic?: string;
	windowMinutes: number;
}

export interface SystemAlertsRecommendationsResponse {
	recommendations: Array<{
		title: string;
		reason: string;
		action: string;
		priority: "low" | "medium" | "high";
	}>;
}

export interface SystemAlertsFeedRequest {
	topic?: string;
	severity?: NotificationSeverity;
	acknowledged?: boolean;
	offset?: number;
	limit?: number;
}

export interface SystemAlertsFeedResponse {
	total: number;
	offset: number;
	limit: number;
	hasMore: boolean;
	items: Array<{
		timestamp: string;
		topic: string;
		severity: NotificationSeverity;
		message: string;
		acknowledged: boolean;
		ackedAt?: string;
	}>;
}

export interface SystemAlertsBacklogRequest {
	topic?: string;
	severity?: NotificationSeverity;
	overdueThresholdMs?: number;
}

export interface SystemAlertsBacklogResponse {
	totalUnacked: number;
	oldestUnackedAgeMs: number;
	newestUnackedAgeMs: number;
	overdueCount: number;
	overdueThresholdMs: number;
	bySeverity: Record<NotificationSeverity, number>;
}

export interface SystemAlertsBreachesRequest {
	windowMinutes: number;
	topic?: string;
	criticalThreshold?: number;
	unackedThreshold?: number;
	ackP95ThresholdMs?: number;
}

export interface SystemAlertsBreachesResponse {
	breaches: Array<{
		metric: "critical_count" | "unacked_count" | "ack_p95_ms";
		value: number;
		threshold: number;
		reason: string;
		severity: "warning" | "critical";
	}>;
}

export interface SystemAlertsHealthRequest {
	windowMinutes?: number;
	topic?: string;
	criticalThreshold?: number;
	unackedThreshold?: number;
	ackP95ThresholdMs?: number;
	dropRateThreshold?: number;
}

export interface SystemAlertsHealthResponse {
	score: number;
	level: "healthy" | "degraded" | "critical";
	indicators: {
		criticalCount: number;
		unackedCount: number;
		ackP95Ms: number;
		dropRate: number;
	};
	breaches: SystemAlertsBreachesResponse["breaches"];
}

 export interface SystemAlertsAutoRemediateAction {
	id: string;
	type: "reset_net_circuit" | "replay_scheduler_failure" | "mute_topic";
	params: Record<string, unknown>;
	reason: string;
	rollback?: {
		type: "notification.unmute";
		params: Record<string, unknown>;
	};
}

export interface SystemAlertsAutoRemediatePlanRequest {
	topic?: string;
	windowMinutes?: number;
	overdueThresholdMs?: number;
}

export interface SystemAlertsAutoRemediatePlanResponse {
	generatedAt: string;
	actions: SystemAlertsAutoRemediateAction[];
}

export interface SystemAlertsAutoRemediateExecuteRequest {
	approved?: boolean;
	dryRun?: boolean;
	approver?: string;
	approvalExpiresAt?: string;
	ticketId?: string;
	actions: SystemAlertsAutoRemediateAction[];
}

 export interface SystemAlertsAutoRemediateExecuteResponse {
	approved: boolean;
	executed: number;
	results: Array<{
		id: string;
		ok: boolean;
		message: string;
		rollback?: SystemAlertsAutoRemediateAction["rollback"];
	}>;
}

export interface SystemAlertsAutoRemediateAuditRecord {
	id: string;
	timestamp: string;
	appId: string;
	sessionId: string;
	traceId?: string;
	approved: boolean;
	approver?: string;
	approvalExpiresAt?: string;
	dryRun: boolean;
	ticketId?: string;
	executed: number;
	results: SystemAlertsAutoRemediateExecuteResponse["results"];
}
