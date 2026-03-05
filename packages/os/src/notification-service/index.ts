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
	since?: string;
	until?: string;
	limit?: number;
}

export interface NotificationServiceOptions {
	dedupeWindowMs?: number;
}

export interface NotificationRecord {
	topic: string;
	message: string;
	severity: NotificationSeverity;
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

export class NotificationService {
	private readonly sent: NotificationRecord[] = [];
	private readonly lastSentAt = new Map<string, number>();
	private readonly topicMuteUntil = new Map<string, number>();

	constructor(
		private readonly eventBus: EventBus,
		private readonly options: NotificationServiceOptions = {},
	) {}

	send(request: NotifyRequest): boolean {
		if (this.isTopicMuted(request.topic)) {
			return false;
		}

		const severity = request.severity ?? "info";
		const dedupeWindowMs = this.options.dedupeWindowMs ?? 0;
		if (dedupeWindowMs > 0) {
			const key = `${request.topic}::${severity}::${request.message}`;
			const now = Date.now();
			const last = this.lastSentAt.get(key);
			if (last !== undefined && now - last <= dedupeWindowMs) {
				return false;
			}
			this.lastSentAt.set(key, now);
		}
		this.sent.push({
			topic: request.topic,
			message: request.message,
			severity,
			timestamp: new Date().toISOString(),
		});
		this.eventBus.publish(request.topic, {
			message: request.message,
			severity,
		});
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

	private isTopicMuted(topic: string): boolean {
		const muteUntil = this.topicMuteUntil.get(topic);
		if (muteUntil === undefined) return false;
		if (Date.now() <= muteUntil) return true;
		this.topicMuteUntil.delete(topic);
		return false;
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
