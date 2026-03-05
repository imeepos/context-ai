import type { EventBus } from "../kernel/event-bus.js";
import type { OSService } from "../types/os.js";

export interface NotifyRequest {
	topic: string;
	message: string;
}

export interface NotificationListRequest {
	topic?: string;
	limit?: number;
}

export interface NotificationServiceOptions {
	dedupeWindowMs?: number;
}

export class NotificationService {
	private readonly sent: NotifyRequest[] = [];
	private readonly lastSentAt = new Map<string, number>();

	constructor(
		private readonly eventBus: EventBus,
		private readonly options: NotificationServiceOptions = {},
	) {}

	send(request: NotifyRequest): void {
		const dedupeWindowMs = this.options.dedupeWindowMs ?? 0;
		if (dedupeWindowMs > 0) {
			const key = `${request.topic}::${request.message}`;
			const now = Date.now();
			const last = this.lastSentAt.get(key);
			if (last !== undefined && now - last <= dedupeWindowMs) {
				return;
			}
			this.lastSentAt.set(key, now);
		}
		this.sent.push(request);
		this.eventBus.publish(request.topic, {
			message: request.message,
		});
	}

	list(): NotifyRequest[] {
		return [...this.sent];
	}

	query(request: NotificationListRequest): NotifyRequest[] {
		let records = this.list();
		if (request.topic) {
			records = records.filter((record) => record.topic === request.topic);
		}
		if (request.limit && request.limit > 0) {
			records = records.slice(-request.limit);
		}
		return records;
	}
}

export function createNotificationSendService(notification: NotificationService): OSService<NotifyRequest, { sent: true }> {
	return {
		name: "notification.send",
		requiredPermissions: ["notification:write"],
		execute: async (req) => {
			notification.send(req);
			return { sent: true };
		},
	};
}

export function createNotificationListService(
	notification: NotificationService,
): OSService<NotificationListRequest, { notifications: NotifyRequest[] }> {
	return {
		name: "notification.list",
		requiredPermissions: ["notification:read"],
		execute: async (req) => ({
			notifications: notification.query(req),
		}),
	};
}
