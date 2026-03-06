import type { EventBus } from "../kernel/event-bus.js";
import type { OSService } from "../types/os.js";

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

export class NotificationService {
	private readonly sent: NotificationRecord[] = [];
	private readonly lastSentAt = new Map<string, number>();
	private readonly topicMuteUntil = new Map<string, number>();
	private readonly topicSendTimes = new Map<string, number[]>();
	private readonly channelAdapters = new Map<string, NotificationChannelAdapter>();
	private readonly channelStats = new Map<
		string,
		{
			success: number;
			failure: number;
			retried: number;
		}
	>();
	private sequence = 0;
	private readonly stats: NotificationStats = {
		sent: 0,
		dropped: {
			dedupe: 0,
			muted: 0,
			rateLimited: 0,
		},
		byTopic: {},
	};
	private policy: {
		dedupeWindowMs: number;
		rateLimit?: {
			limit: number;
			windowMs: number;
		};
		retentionLimit?: number;
	};
	private readonly channelDelivery: {
		retries: number;
		backoffMs: number;
	};

	constructor(
		private readonly eventBus: EventBus,
		options: NotificationServiceOptions = {},
	) {
		this.policy = {
			dedupeWindowMs: options.dedupeWindowMs ?? 0,
			rateLimit: options.rateLimit,
			retentionLimit: options.retentionLimit,
		};
		this.channelDelivery = options.channelDelivery ?? {
			retries: 0,
			backoffMs: 100,
		};
	}

	send(request: NotifyRequest): boolean {
		if (this.isTopicMuted(request.topic)) {
			this.recordDrop(request.topic, "muted");
			return false;
		}

		const severity = request.severity ?? "info";
		if (!this.isWithinRateLimit(request.topic)) {
			this.recordDrop(request.topic, "rateLimited");
			return false;
		}
		const dedupeWindowMs = this.policy.dedupeWindowMs;
		if (dedupeWindowMs > 0) {
			const key = `${request.topic}::${severity}::${request.message}`;
			const now = Date.now();
			const last = this.lastSentAt.get(key);
			if (last !== undefined && now - last <= dedupeWindowMs) {
				this.recordDrop(request.topic, "dedupe");
				return false;
			}
			this.lastSentAt.set(key, now);
		}
		const record: NotificationRecord = {
			id: this.nextId(),
			topic: request.topic,
			message: request.message,
			severity,
			acknowledged: false,
			timestamp: new Date().toISOString(),
		};
		this.sent.push(record);
		const retentionLimit = this.policy.retentionLimit;
		if (retentionLimit && retentionLimit > 0 && this.sent.length > retentionLimit) {
			const overflow = this.sent.length - retentionLimit;
			this.sent.splice(0, overflow);
		}
		this.eventBus.publish(request.topic, {
			message: request.message,
			severity,
		});
		this.deliverToChannels(record);
		this.recordSent(request.topic);
		return true;
	}

	list(): NotificationRecord[] {
		return [...this.sent];
	}

	query(request: NotificationListRequest): NotificationRecord[] {
		let records = this.list();
		if (request.topic) {
			records = records.filter((record) => record.topic === request.topic);
		}
		if (request.severity) {
			records = records.filter((record) => record.severity === request.severity);
		}
		if (request.acknowledged !== undefined) {
			records = records.filter((record) => record.acknowledged === request.acknowledged);
		}
		if (request.since) {
			const sinceMs = Date.parse(request.since);
			if (!Number.isNaN(sinceMs)) {
				records = records.filter((record) => Date.parse(record.timestamp) >= sinceMs);
			}
		}
		if (request.until) {
			const untilMs = Date.parse(request.until);
			if (!Number.isNaN(untilMs)) {
				records = records.filter((record) => Date.parse(record.timestamp) <= untilMs);
			}
		}
		if (request.limit && request.limit > 0) {
			records = records.slice(-request.limit);
		}
		return records;
	}

	ack(request: NotificationAckRequest): number {
		let count = 0;
		for (const record of this.sent) {
			if (record.id === request.id && !record.acknowledged) {
				record.acknowledged = true;
				record.ackedAt = new Date().toISOString();
				count += 1;
			}
		}
		return count;
	}

	ackAll(request: NotificationAckAllRequest): number {
		const targetIds = new Set(
			this.query({
				topic: request.topic,
				severity: request.severity,
				since: request.since,
				until: request.until,
				acknowledged: false,
			}).map((item) => item.id),
		);
		let count = 0;
		for (const record of this.sent) {
			if (targetIds.has(record.id) && !record.acknowledged) {
				record.acknowledged = true;
				record.ackedAt = new Date().toISOString();
				count += 1;
			}
		}
		return count;
	}

	cleanup(request: NotificationCleanupRequest): { notifications: number; mutes: number } {
		let removedNotifications = 0;
		if (request.olderThan) {
			const olderThanMs = Date.parse(request.olderThan);
			if (!Number.isNaN(olderThanMs)) {
				const retained = this.sent.filter((record) => Date.parse(record.timestamp) >= olderThanMs);
				removedNotifications = this.sent.length - retained.length;
				this.sent.length = 0;
				this.sent.push(...retained);
			}
		}

		let removedMutes = 0;
		const now = Date.now();
		for (const [topic, muteUntil] of this.topicMuteUntil.entries()) {
			if (muteUntil <= now) {
				this.topicMuteUntil.delete(topic);
				removedMutes += 1;
			}
		}

		return {
			notifications: removedNotifications,
			mutes: removedMutes,
		};
	}

	clear(request: NotificationClearRequest): number {
		const before = this.sent.length;
		const retained = this.sent.filter((record) => {
			if (request.topic && record.topic !== request.topic) return true;
			if (request.severity && record.severity !== request.severity) return true;
			if (!request.topic && !request.severity) return false;
			return false;
		});
		this.sent.length = 0;
		this.sent.push(...retained);
		return before - retained.length;
	}

	muteTopic(request: MuteTopicRequest): void {
		this.topicMuteUntil.set(request.topic, Date.now() + request.durationMs);
	}

	unmuteTopic(topic: string): boolean {
		return this.topicMuteUntil.delete(topic);
	}

	listMutes(): NotificationMuteRecord[] {
		const now = Date.now();
		const records: NotificationMuteRecord[] = [];
		for (const [topic, muteUntil] of this.topicMuteUntil.entries()) {
			if (muteUntil <= now) {
				this.topicMuteUntil.delete(topic);
				continue;
			}
			records.push({
				topic,
				muteUntil: new Date(muteUntil).toISOString(),
			});
		}
		return records.sort((a, b) => a.topic.localeCompare(b.topic));
	}

	getStats(): NotificationStats {
		return {
			sent: this.stats.sent,
			dropped: { ...this.stats.dropped },
			byTopic: Object.fromEntries(
				Object.entries(this.stats.byTopic).map(([topic, value]) => [topic, { ...value }]),
			),
		};
	}

	getPolicy(): {
		dedupeWindowMs: number;
		rateLimit?: {
			limit: number;
			windowMs: number;
		};
		retentionLimit?: number;
	} {
		return {
			dedupeWindowMs: this.policy.dedupeWindowMs,
			rateLimit: this.policy.rateLimit,
			retentionLimit: this.policy.retentionLimit,
		};
	}

	registerChannelAdapter(adapter: NotificationChannelAdapter): void {
		this.channelAdapters.set(adapter.name, adapter);
		if (!this.channelStats.has(adapter.name)) {
			this.channelStats.set(adapter.name, {
				success: 0,
				failure: 0,
				retried: 0,
			});
		}
	}

	getChannelStats(): Record<
		string,
		{
			success: number;
			failure: number;
			retried: number;
		}
	> {
		return Object.fromEntries(
			[...this.channelStats.entries()].map(([name, stats]) => [name, { ...stats }]),
		);
	}

	updatePolicy(patch: NotificationPolicyPatch): ReturnType<NotificationService["getPolicy"]> {
		if (patch.dedupeWindowMs !== undefined && patch.dedupeWindowMs >= 0) {
			this.policy.dedupeWindowMs = patch.dedupeWindowMs;
		}
		if (patch.rateLimit !== undefined) {
			if (patch.rateLimit.limit > 0 && patch.rateLimit.windowMs > 0) {
				this.policy.rateLimit = patch.rateLimit;
			} else {
				this.policy.rateLimit = undefined;
			}
		}
		if (patch.retentionLimit !== undefined) {
			if (patch.retentionLimit > 0) {
				this.policy.retentionLimit = patch.retentionLimit;
				if (this.sent.length > patch.retentionLimit) {
					this.sent.splice(0, this.sent.length - patch.retentionLimit);
				}
			} else {
				this.policy.retentionLimit = undefined;
			}
		}
		return this.getPolicy();
	}

	private isTopicMuted(topic: string): boolean {
		const muteUntil = this.topicMuteUntil.get(topic);
		if (muteUntil === undefined) return false;
		if (Date.now() <= muteUntil) return true;
		this.topicMuteUntil.delete(topic);
		return false;
	}

	private isWithinRateLimit(topic: string): boolean {
		const limitRule = this.policy.rateLimit;
		if (!limitRule) return true;
		const now = Date.now();
		const windowStart = now - limitRule.windowMs;
		const current = this.topicSendTimes.get(topic) ?? [];
		const filtered = current.filter((timestamp) => timestamp >= windowStart);
		if (filtered.length >= limitRule.limit) {
			this.topicSendTimes.set(topic, filtered);
			return false;
		}
		filtered.push(now);
		this.topicSendTimes.set(topic, filtered);
		return true;
	}

	private deliverToChannels(record: NotificationRecord): void {
		for (const [name, adapter] of this.channelAdapters.entries()) {
			this.sendToChannel(name, adapter, record, 0);
		}
	}

	private sendToChannel(
		name: string,
		adapter: NotificationChannelAdapter,
		record: NotificationRecord,
		attempt: number,
	): void {
		Promise.resolve(adapter.send(record))
			.then(() => {
				const stats = this.channelStats.get(name);
				if (!stats) return;
				stats.success += 1;
				this.channelStats.set(name, stats);
			})
			.catch(() => {
				if (attempt < this.channelDelivery.retries) {
					const stats = this.channelStats.get(name);
					if (stats) {
						stats.retried += 1;
						this.channelStats.set(name, stats);
					}
					setTimeout(() => {
						this.sendToChannel(name, adapter, record, attempt + 1);
					}, this.channelDelivery.backoffMs * (attempt + 1));
					return;
				}
				const stats = this.channelStats.get(name);
				if (!stats) return;
				stats.failure += 1;
				this.channelStats.set(name, stats);
			});
	}

	private recordSent(topic: string): void {
		this.stats.sent += 1;
		const current = this.stats.byTopic[topic] ?? { sent: 0, dropped: 0 };
		current.sent += 1;
		this.stats.byTopic[topic] = current;
	}

	private recordDrop(topic: string, reason: "dedupe" | "muted" | "rateLimited"): void {
		this.stats.dropped[reason] += 1;
		const current = this.stats.byTopic[topic] ?? { sent: 0, dropped: 0 };
		current.dropped += 1;
		this.stats.byTopic[topic] = current;
	}

	private nextId(): string {
		this.sequence += 1;
		return `ntf-${Date.now()}-${this.sequence}`;
	}
}

export function createNotificationSendService(
	notification: NotificationService,
): OSService<NotifyRequest, { sent: boolean }> {
	return {
		name: "notification.send",
		requiredPermissions: ["notification:write"],
		execute: async (req) => {
			return { sent: notification.send(req) };
		},
	};
}

export function createNotificationListService(
	notification: NotificationService,
): OSService<NotificationListRequest, { notifications: NotificationRecord[] }> {
	return {
		name: "notification.list",
		requiredPermissions: ["notification:read"],
		execute: async (req) => ({
			notifications: notification.query(req),
		}),
	};
}

export function createNotificationMuteService(
	notification: NotificationService,
): OSService<MuteTopicRequest, { muted: true }> {
	return {
		name: "notification.mute",
		requiredPermissions: ["notification:write"],
		execute: async (req) => {
			notification.muteTopic(req);
			return { muted: true };
		},
	};
}

export function createNotificationUnmuteService(
	notification: NotificationService,
): OSService<{ topic: string }, { unmuted: boolean }> {
	return {
		name: "notification.unmute",
		requiredPermissions: ["notification:write"],
		execute: async (req) => ({
			unmuted: notification.unmuteTopic(req.topic),
		}),
	};
}

export function createNotificationMuteListService(
	notification: NotificationService,
): OSService<Record<string, never>, { mutes: NotificationMuteRecord[] }> {
	return {
		name: "notification.mute.list",
		requiredPermissions: ["notification:read"],
		execute: async () => ({
			mutes: notification.listMutes(),
		}),
	};
}

export function createNotificationStatsService(
	notification: NotificationService,
): OSService<Record<string, never>, { stats: NotificationStats }> {
	return {
		name: "notification.stats",
		requiredPermissions: ["notification:read"],
		execute: async () => ({
			stats: notification.getStats(),
		}),
	};
}

export function createNotificationAckService(
	notification: NotificationService,
): OSService<NotificationAckRequest, { acknowledged: number }> {
	return {
		name: "notification.ack",
		requiredPermissions: ["notification:write"],
		execute: async (req) => ({
			acknowledged: notification.ack(req),
		}),
	};
}

export function createNotificationAckAllService(
	notification: NotificationService,
): OSService<NotificationAckAllRequest, { acknowledged: number }> {
	return {
		name: "notification.ackAll",
		requiredPermissions: ["notification:write"],
		execute: async (req) => ({
			acknowledged: notification.ackAll(req),
		}),
	};
}

export function createNotificationCleanupService(
	notification: NotificationService,
): OSService<NotificationCleanupRequest, { notifications: number; mutes: number }> {
	return {
		name: "notification.cleanup",
		requiredPermissions: ["notification:write"],
		execute: async (req) => notification.cleanup(req),
	};
}

export function createNotificationPolicyUpdateService(
	notification: NotificationService,
): OSService<NotificationPolicyPatch, { policy: ReturnType<NotificationService["getPolicy"]> }> {
	return {
		name: "notification.policy.update",
		requiredPermissions: ["notification:write"],
		execute: async (req) => ({
			policy: notification.updatePolicy(req),
		}),
	};
}
