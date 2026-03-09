import { createOSServiceClass } from "../../os-service-class.js";
import { NOTIFICATION_SEND } from "../../tokens.js";
import type { OSService } from "../../types/os.js";
import type { NotificationService } from "../notification.service.js";
import type { NotifyRequest } from "../types.js";

export const NotificationSendOSService = createOSServiceClass(NOTIFICATION_SEND, {
	requiredPermissions: ["notification:write"],
	execute: ([notification]: [NotificationService], req: NotifyRequest) => ({
		sent: notification.send(req),
	}),
});

export function createNotificationSendService(
	notification: NotificationService,
): OSService<NotifyRequest, { sent: boolean }> {
	return new NotificationSendOSService(notification);
}
