import type { NotificationService, NotificationSeverity } from "../types.js";
import type { OSService } from "../../types/os.js";
import * as TOKENS from "../../tokens.js";

export interface SystemAlertsFlappingRequest {
	windowMinutes: number;
	threshold: number;
	topic?: string;
}

export interface SystemAlertsFlappingResponse {
	total: number;
	items: Array<{
		signature: string;
		topic: string;
		severity: NotificationSeverity;
		message: string;
		count: number;
	}>;
}

export function createSystemAlertsFlappingService(
	notificationService: NotificationService,
): OSService<SystemAlertsFlappingRequest, SystemAlertsFlappingResponse> {
	return {
		name: TOKENS.SYSTEM_ALERTS_FLAPPING,
		requiredPermissions: ["system:read"],
		execute: async (req) => {
			const windowMinutes = req.windowMinutes > 0 ? req.windowMinutes : 5;
			const threshold = req.threshold > 0 ? req.threshold : 3;
			const since = new Date(Date.now() - windowMinutes * 60 * 1000).toISOString();
			const alerts = notificationService.query({
				topic: req.topic,
				since,
			});
			const groups = new Map<
				string,
				{
					signature: string;
					topic: string;
					severity: NotificationSeverity;
					message: string;
					count: number;
				}
			>();
			for (const alert of alerts) {
				const signature = `${alert.topic}::${alert.severity}::${alert.message}`;
				const current = groups.get(signature);
				if (current) {
					current.count += 1;
				} else {
					groups.set(signature, {
						signature,
						topic: alert.topic,
						severity: alert.severity,
						message: alert.message,
						count: 1,
					});
				}
			}
			const items = [...groups.values()].filter((item) => item.count >= threshold).sort((a, b) => b.count - a.count);
			return {
				total: items.length,
				items,
			};
		},
	};
}
