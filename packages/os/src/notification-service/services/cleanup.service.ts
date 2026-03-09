import { createOSServiceClass } from "../../os-service-class.js";
import { NOTIFICATION_CLEANUP } from "../../tokens.js";
import type { OSService } from "../../types/os.js";
import type { NotificationService } from "../notification.service.js";
import type { NotificationCleanupRequest } from "../types.js";

export const NotificationCleanupOSService = createOSServiceClass(NOTIFICATION_CLEANUP, {
	requiredPermissions: ["notification:write"],
	execute: ([notification]: [NotificationService], req: NotificationCleanupRequest) =>
		notification.cleanup(req),
});

export function createNotificationCleanupService(
	notification: NotificationService,
): OSService<NotificationCleanupRequest, { notifications: number; mutes: number }> {
	return new NotificationCleanupOSService(notification);
}
