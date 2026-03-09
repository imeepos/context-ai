import type { EventBus } from "../kernel/event-bus.js";
import type {
	NotifyRequest,
	NotificationListRequest,
	NotificationRecord,
	NotificationAckRequest,
	NotificationAckAllRequest,
	NotificationCleanupRequest,
	NotificationClearRequest,
	NotificationStats,
	NotificationServiceOptions,
	NotificationPolicyPatch,
	NotificationChannelsConfig,
	MuteTopicRequest,
} from "./types.js";
import { MuteManager } from "./mutes.js";
import { PolicyManager } from "./policy.js";
import { ChannelManager } from "./channels.js";

export class NotificationService {
	private readonly sent: NotificationRecord[] = [];
	private readonly lastSentAt = new Map<string, number>();
	private readonly topicSendTimes = new Map<string, number[]>();
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

	private readonly muteManager: MuteManager;
	private readonly policyManager: PolicyManager;
	private readonly channelManager: ChannelManager;

	constructor(
		private readonly eventBus: EventBus,
		options: NotificationServiceOptions = {},
	) {
		this.muteManager = new MuteManager();
		this.policyManager = new PolicyManager({
			dedupeWindowMs: options.dedupeWindowMs,
			rateLimit: options.rateLimit,
			retentionLimit: options.retentionLimit,
		});
		this.channelManager = new ChannelManager(options.channelDelivery);
	}

	send(request: NotifyRequest): boolean {
		if (this.muteManager.isTopicMuted(request.topic)) {
			this.recordDrop(request.topic, "muted");
			return false;
		}

		const severity = request.severity ?? "info";
		if (!this.isWithinRateLimit(request.topic)) {
			this.recordDrop(request.topic, "rateLimited");
			return false;
		}

		const dedupeWindowMs = this.policyManager.dedupeWindowMs;
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
		this.enforceRetentionLimit();
		this.eventBus.publish(request.topic, {
			message: request.message,
			severity,
		});
		this.channelManager.deliverToChannels(record);
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

		const removedMutes = this.muteManager.cleanupExpiredMutes();

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
		this.muteManager.muteTopic(request.topic, request.durationMs);
	}

	unmuteTopic(topic: string): boolean {
		return this.muteManager.unmuteTopic(topic);
	}

	listMutes() {
		return this.muteManager.listMutes();
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

	getPolicy() {
		return this.policyManager.getPolicy();
	}

	updatePolicy(patch: NotificationPolicyPatch) {
		const result = this.policyManager.updatePolicy(patch);
		this.enforceRetentionLimit();
		return result;
	}

	configureChannels(config: NotificationChannelsConfig) {
		return this.channelManager.configureChannels(config);
	}

	getChannelStats() {
		return this.channelManager.getStats();
	}

	private isWithinRateLimit(topic: string): boolean {
		const limitRule = this.policyManager.rateLimit;
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

	private enforceRetentionLimit(): void {
		const retentionLimit = this.policyManager.retentionLimit;
		if (retentionLimit && retentionLimit > 0 && this.sent.length > retentionLimit) {
			const overflow = this.sent.length - retentionLimit;
			this.sent.splice(0, overflow);
		}
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
