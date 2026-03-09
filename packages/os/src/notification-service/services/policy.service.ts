import { createOSServiceClass } from "../../os-service-class.js";
import { NOTIFICATION_POLICY_UPDATE } from "../../tokens.js";
import type { OSService } from "../../types/os.js";
import type { NotificationService } from "../notification.service.js";
import type { NotificationPolicyPatch, NotificationPolicy } from "../types.js";

export const NotificationPolicyUpdateOSService = createOSServiceClass(NOTIFICATION_POLICY_UPDATE, {
	requiredPermissions: ["notification:write"],
	execute: ([notification]: [NotificationService], req: NotificationPolicyPatch) => ({
		policy: notification.updatePolicy(req),
	}),
});

export function createNotificationPolicyUpdateService(
	notification: NotificationService,
): OSService<NotificationPolicyPatch, { policy: NotificationPolicy }> {
	return new NotificationPolicyUpdateOSService(notification);
}
