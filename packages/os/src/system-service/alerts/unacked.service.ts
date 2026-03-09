import type { NotificationService } from "../types.js";
import type { OSService } from "../../types/os.js";
import * as TOKENS from "../../tokens.js";
import type {
	SystemAlertsUnackedRequest,
	SystemAlertsUnackedResponse,
} from "./types.js";

export function createSystemAlertsUnackedService(
	notificationService: NotificationService,
): OSService<SystemAlertsUnackedRequest, SystemAlertsUnackedResponse> {
	return {
		name: TOKENS.SYSTEM_ALERTS_UNACKED,
		requiredPermissions: ["system:read"],
		execute: async (req) => {
			const alerts = notificationService.query({
				topic: req.topic,
				severity: req.severity,
				acknowledged: false,
				limit: req.limit,
			});

			return {
				total: alerts.length,
				alerts: alerts.map((alert) => ({
					timestamp: alert.timestamp,
					topic: alert.topic,
					severity: alert.severity,
					message: alert.message,
					acknowledged: alert.acknowledged,
					ackedAt: alert.ackedAt,
				})),
			};
		},
	};
}
