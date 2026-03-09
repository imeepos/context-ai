import { createOSServiceClass } from "../../os-service-class.js";
import { NOTIFICATION_ACK, NOTIFICATION_ACK_ALL } from "../../tokens.js";
import type { OSService } from "../../types/os.js";
import type { NotificationService } from "../notification.service.js";
import type { NotificationAckRequest, NotificationAckAllRequest } from "../types.js";

export const NotificationAckOSService = createOSServiceClass(NOTIFICATION_ACK, {
	requiredPermissions: ["notification:write"],
	execute: ([notification]: [NotificationService], req: NotificationAckRequest) => ({
		acknowledged: notification.ack(req),
	}),
});

export function createNotificationAckService(
	notification: NotificationService,
): OSService<NotificationAckRequest, { acknowledged: number }> {
	return new NotificationAckOSService(notification);
}

export const NotificationAckAllOSService = createOSServiceClass(NOTIFICATION_ACK_ALL, {
	requiredPermissions: ["notification:write"],
	execute: ([notification]: [NotificationService], req: NotificationAckAllRequest) => ({
		acknowledged: notification.ackAll(req),
	}),
});

export function createNotificationAckAllService(
	notification: NotificationService,
): OSService<NotificationAckAllRequest, { acknowledged: number }> {
	return new NotificationAckAllOSService(notification);
}
