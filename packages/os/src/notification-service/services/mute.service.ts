import { createOSServiceClass } from "../../os-service-class.js";
import { NOTIFICATION_MUTE, NOTIFICATION_UNMUTE, NOTIFICATION_MUTE_LIST } from "../../tokens.js";
import type { OSService } from "../../types/os.js";
import type { NotificationService } from "../notification.service.js";
import type { MuteTopicRequest, NotificationMuteRecord } from "../types.js";

export const NotificationMuteOSService = createOSServiceClass(NOTIFICATION_MUTE, {
	requiredPermissions: ["notification:write"],
	execute: ([notification]: [NotificationService], req: MuteTopicRequest) => {
		notification.muteTopic(req);
		return { muted: true as const };
	},
});

export function createNotificationMuteService(
	notification: NotificationService,
): OSService<MuteTopicRequest, { muted: true }> {
	return new NotificationMuteOSService(notification);
}

export const NotificationUnmuteOSService = createOSServiceClass(NOTIFICATION_UNMUTE, {
	requiredPermissions: ["notification:write"],
	execute: ([notification]: [NotificationService], req: { topic: string }) => ({
		unmuted: notification.unmuteTopic(req.topic),
	}),
});

export function createNotificationUnmuteService(
	notification: NotificationService,
): OSService<{ topic: string }, { unmuted: boolean }> {
	return new NotificationUnmuteOSService(notification);
}

export const NotificationMuteListOSService = createOSServiceClass(NOTIFICATION_MUTE_LIST, {
	requiredPermissions: ["notification:read"],
	execute: ([notification]: [NotificationService]) => ({
		mutes: notification.listMutes(),
	}),
});

export function createNotificationMuteListService(
	notification: NotificationService,
): OSService<Record<string, never>, { mutes: NotificationMuteRecord[] }> {
	return new NotificationMuteListOSService(notification);
}
