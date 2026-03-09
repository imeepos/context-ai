import { createOSServiceClass } from "../../os-service-class.js";
import { NOTIFICATION_LIST } from "../../tokens.js";
import type { OSService } from "../../types/os.js";
import type { NotificationService } from "../notification.service.js";
import type { NotificationListRequest, NotificationRecord } from "../types.js";

export const NotificationListOSService = createOSServiceClass(NOTIFICATION_LIST, {
	requiredPermissions: ["notification:read"],
	execute: ([notification]: [NotificationService], req: NotificationListRequest) => ({
		notifications: notification.query(req),
	}),
});

export function createNotificationListService(
	notification: NotificationService,
): OSService<NotificationListRequest, { notifications: NotificationRecord[] }> {
	return new NotificationListOSService(notification);
}
