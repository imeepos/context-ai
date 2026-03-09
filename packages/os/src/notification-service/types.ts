export type NotificationSeverity = "info" | "warning" | "error" | "critical";

export interface NotifyRequest {
	topic: string;
	message: string;
	severity?: NotificationSeverity;
}

export interface NotificationListRequest {
	topic?: string;
	severity?: NotificationSeverity;
	acknowledged?: boolean;
	since?: string;
	until?: string;
	limit?: number;
}

export interface NotificationServiceOptions {
	dedupeWindowMs?: number;
	rateLimit?: {
		limit: number;
		windowMs: number;
	};
	retentionLimit?: number;
	channelDelivery?: {
		retries: number;
		backoffMs: number;
	};
}

export interface NotificationPolicyPatch {
	dedupeWindowMs?: number;
	rateLimit?: {
		limit: number;
		windowMs: number;
	};
	retentionLimit?: number;
}

export interface NotificationRecord {
	id: string;
	topic: string;
	message: string;
	severity: NotificationSeverity;
	acknowledged: boolean;
	ackedAt?: string;
	timestamp: string;
}

export interface MuteTopicRequest {
	topic: string;
	durationMs: number;
}

export interface NotificationClearRequest {
	topic?: string;
	severity?: NotificationSeverity;
}

export interface NotificationMuteRecord {
	topic: string;
	muteUntil: string;
}

export interface NotificationAckRequest {
	id: string;
}

export interface NotificationAckAllRequest {
	topic?: string;
	severity?: NotificationSeverity;
	since?: string;
	until?: string;
}

export interface NotificationCleanupRequest {
	olderThan?: string;
}

export interface NotificationStats {
	sent: number;
	dropped: {
		dedupe: number;
		muted: number;
		rateLimited: number;
	};
	byTopic: Record<
		string,
		{
			sent: number;
			dropped: number;
		}
	>;
}

export interface NotificationChannelAdapter {
	name: string;
	send(record: NotificationRecord): Promise<void> | void;
}

export interface NotificationChannelsConfig {
	webhook?: {
		url: string;
		headers?: Record<string, string>;
	};
	slack?: {
		webhookUrl: string;
	};
	email?: {
		endpoint: string;
		to: string;
		from?: string;
	};
}

export interface NotificationPolicy {
	dedupeWindowMs: number;
	rateLimit?: {
		limit: number;
		windowMs: number;
	};
	retentionLimit?: number;
}

export interface ChannelStats {
	success: number;
	failure: number;
	retried: number;
}
