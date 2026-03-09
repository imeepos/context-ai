import type { NotificationService } from "../types.js";
import type { OSService } from "../../types/os.js";
import * as TOKENS from "../../tokens.js";
import { createSystemAlertsUnackedService } from "./unacked.service.js";
import { createSystemAlertsSLOService } from "./slo.service.js";
    import { createSystemAlertsTrendsService } from "./trends.service.js"

export interface SystemAlertsBreachesRequest {
	windowMinutes: number;
	topic?: string;
	criticalThreshold?: number;
	unackedThreshold?: number;
	ackP95ThresholdMs?: number;
}

export interface SystemAlertsBreachesResponse {
	breaches: Array<{
		metric: "critical_count" | "unacked_count" | "ack_p95_ms";
		value: number;
		threshold: number;
		reason: string;
		severity: "warning" | "critical"
	}>;
}

export function createSystemAlertsBreachesService(
	notificationService: NotificationService,
): OSService<SystemAlertsBreachesRequest, SystemAlertsBreachesResponse> {
    return {
        name: TOKENS.SYSTEM_ALERTS_BREACHES,
        requiredPermissions: ["system:read"],
        execute: async (req) => {
            const windowMinutes = req.windowMinutes > 0 ? req.windowMinutes : 10
            const criticalThreshold = req.criticalThreshold ?? 10
            const unackedThreshold = req.unackedThreshold ?? 20
            const ackP95ThresholdMs = req.ackP95ThresholdMs ?? 300000

            const trends = await createSystemAlertsTrendsService(notificationService).execute(
                { topic: req.topic, windowMinutes },
                { appId: "system", sessionId: "system", permissions: ["system:read"], workingDirectory: process.cwd() },
            )
            const unacked = await createSystemAlertsUnackedService(notificationService).execute(
                { topic: req.topic },
                { appId: "system", sessionId: "system", permissions: ["system:read"], workingDirectory: process.cwd() },
            )
            const slo = await createSystemAlertsSLOService(notificationService).execute(
                {},
                { appId: "system", sessionId: "system", permissions: ["system:read"], workingDirectory: process.cwd() },
            )
            const breaches: SystemAlertsBreachesResponse["breaches"] = []
            const criticalCount = trends.bySeverity.critical ?? 0
            if (criticalCount > criticalThreshold) {
                breaches.push({
                    metric: "critical_count",
                    value: criticalCount,
                    threshold: criticalThreshold,
                    reason: `Critical alerts ${criticalCount} exceeded threshold ${criticalThreshold} in ${windowMinutes}m`,
                    severity: "critical",
                })
            }
            if (unacked.total > unackedThreshold) {
                breaches.push({
                    metric: "unacked_count",
                    value: unacked.total,
                    threshold: unackedThreshold,
                    reason: `Unacked alerts ${unacked.total} exceeded threshold ${unackedThreshold}`,
                    severity: "warning",
                })
            }
            if (slo.p95AckLatencyMs > ackP95ThresholdMs) {
                breaches.push({
                    metric: "ack_p95_ms",
                    value: slo.p95AckLatencyMs,
                    threshold: ackP95ThresholdMs,
                    reason: `Ack p95 ${slo.p95AckLatencyMs}ms exceeded threshold ${ackP95ThresholdMs}ms`,
                    severity: "warning",
                })
            }
            return { breaches }
        },
    }
}
