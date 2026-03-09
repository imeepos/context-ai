import { createOSServiceClass } from "../../os-service-class.js";
import { NOTIFICATION_CHANNEL_CONFIGURE } from "../../tokens.js";
import type { OSService } from "../../types/os.js";
import type { NotificationService } from "../notification.service.js";
import type { NotificationChannelsConfig } from "../types.js";

export const NotificationChannelConfigureOSService = createOSServiceClass(
	NOTIFICATION_CHANNEL_CONFIGURE,
	{
		requiredPermissions: ["notification:write"],
		execute: ([notification]: [NotificationService], req: NotificationChannelsConfig) =>
			notification.configureChannels(req),
	},
);

export function createNotificationChannelConfigureService(
	notification: NotificationService,
): OSService<NotificationChannelsConfig, { configured: string[] }> {
	return new NotificationChannelConfigureOSService(notification);
}
