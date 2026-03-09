import type { NotificationService, NotificationSeverity } from "../types.js";
import type { OSService } from "../../types/os.js";
import * as TOKENS from "../../tokens.js";

export interface SystemAlertsIncidentsRequest {
	topic?: string;
	severity?: NotificationSeverity;
	limit?: number;
}

export interface SystemAlertsIncidentsResponse {
	totalIncidents: number;
	incidents: Array<{
		signature: string;
		topic: string;
		severity: NotificationSeverity;
		message: string;
		count: number;
		firstSeen: string;
		lastSeen: string;
	 }>;
}

export function createSystemAlertsIncidentsService(
	notificationService: NotificationService,
): OSService<SystemAlertsIncidentsRequest, SystemAlertsIncidentsResponse> {
	return {
		name: TOKENS.SYSTEM_ALERTS_INCIDENTS,
	 requiredPermissions: ["system:read"],
        execute: async (req) => {
            const alerts = notificationService.query({
                topic: req.topic,
                severity: req.severity,
                acknowledged: false,
                limit: req.limit,
            });
            const groups = new Map<
                string,
                {
                    signature: string;
                    topic: string;
                    severity: NotificationSeverity;
                    message: string;
                    count: number;
                    firstSeen: string;
                    lastSeen: string;
                }
            >();
            for (const alert of alerts) {
                const signature = `${alert.topic}::${alert.severity}::${alert.message}`;
                const current = groups.get(signature);
                if (!current) {
                    groups.set(signature, {
                        signature,
                        topic: alert.topic,
                        severity: alert.severity,
                        message: alert.message,
                        count: 1,
                        firstSeen: alert.timestamp,
                        lastSeen: alert.timestamp,
                    });
                } else {
                    current.count += 1;
                    if (!current.firstSeen || alert.timestamp < current.firstSeen) {
                        current.firstSeen = alert.timestamp
                    }
                    if (alert.timestamp > current.lastSeen) current.lastSeen = alert.timestamp
                }
            }
            return {
                totalIncidents: groups.size,
                incidents: [...groups.values()].sort((a, b) => b.count - a.count),
            };
        },
    };
}
