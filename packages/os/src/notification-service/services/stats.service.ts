import { createOSServiceClass } from "../../os-service-class.js";
import { NOTIFICATION_STATS, NOTIFICATION_CHANNEL_STATS } from "../../tokens.js";
import type { OSService } from "../../types/os.js";
import type { NotificationService } from "../notification.service.js";
import type { NotificationStats } from "../types.js";

export const NotificationStatsOSService = createOSServiceClass(NOTIFICATION_STATS, {
	requiredPermissions: ["notification:read"],
	execute: ([notification]: [NotificationService]) => ({
		stats: notification.getStats(),
	}),
});

export function createNotificationStatsService(
	notification: NotificationService,
): OSService<Record<string, never>, { stats: NotificationStats }> {
	return new NotificationStatsOSService(notification);
}

export const NotificationChannelStatsOSService = createOSServiceClass(NOTIFICATION_CHANNEL_STATS, {
	requiredPermissions: ["notification:read"],
	execute: ([notification]: [NotificationService]) => ({
		channels: notification.getChannelStats(),
	}),
});

export function createNotificationChannelStatsService(
	notification: NotificationService,
): OSService<Record<string, never>, { channels: ReturnType<NotificationService["getChannelStats"]> }> {
	return new NotificationChannelStatsOSService(notification);
}
