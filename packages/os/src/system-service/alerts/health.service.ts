import type { NotificationService } from "../types.js";
import type { OSService } from "../../types/os.js";
import * as TOKENS from "../../tokens.js";
import { createSystemAlertsBreachesService } from "./breaches.service.js";
import { createSystemAlertsUnackedService } from "./unacked.service.js";
import { createSystemAlertsSLOService } from "./slo.service.js";
import { createSystemAlertsTrendsService } from "./trends.service.js";
import type { SystemAlertsBreachesResponse } from "./types.js";

export interface SystemAlertsHealthRequest {
	windowMinutes?: number;
	topic?: string;
	criticalThreshold?: number;
	unackedThreshold?: number;
	ackP95ThresholdMs?: number;
	dropRateThreshold?: number;
}

export interface SystemAlertsHealthResponse {
	score: number;
	level: "healthy" | "degraded" | "critical";
	indicators: {
		criticalCount: number;
		unackedCount: number;
		ackP95Ms: number;
		dropRate: number;
	};
	breaches: SystemAlertsBreachesResponse["breaches"];
}

export function createSystemAlertsHealthService(
	notificationService: NotificationService,
): OSService<SystemAlertsHealthRequest, SystemAlertsHealthResponse> {
	return {
		name: TOKENS.SYSTEM_ALERTS_HEALTH,
		requiredPermissions: ["system:read"],
		execute: async (req, ctx) => {
			const windowMinutes = req.windowMinutes && req.windowMinutes > 0 ? req.windowMinutes : 10;
			const criticalThreshold = req.criticalThreshold ?? 10;
			const unackedThreshold = req.unackedThreshold ?? 20;
			const ackP95ThresholdMs = req.ackP95ThresholdMs ?? 300000;
			const dropRateThreshold = req.dropRateThreshold ?? 0.1;

			const breaches = await createSystemAlertsBreachesService(notificationService).execute(
				{ windowMinutes, topic: req.topic, criticalThreshold, unackedThreshold, ackP95ThresholdMs },
				ctx,
			);
			const trends = await createSystemAlertsTrendsService(notificationService).execute(
				{ windowMinutes, topic: req.topic },
				ctx,
			);
			const unacked = await createSystemAlertsUnackedService(notificationService).execute(
				{ topic: req.topic },
				ctx,
			);
			const slo = await createSystemAlertsSLOService(notificationService).execute({}, ctx);

			const stats = notificationService.getStats();
			const droppedTotal = stats.dropped.dedupe + stats.dropped.muted + stats.dropped.rateLimited;
			const dropRate = stats.sent + droppedTotal === 0 ? 0 : droppedTotal / (stats.sent + droppedTotal);

			let score = 100;
			score -= breaches.breaches.length * 25;
			if (dropRate > dropRateThreshold) {
				score -= 20;
			}
			if (score < 0) {
				score = 1;
			}

			const level: SystemAlertsHealthResponse["level"] =
				score >= 80 ? "healthy" : score >= 50 ? "degraded" : "critical";

			return {
				score,
				level,
				indicators: {
					criticalCount: trends.bySeverity.critical ?? 0,
					unackedCount: unacked.total,
					ackP95Ms: slo.p95AckLatencyMs,
					dropRate,
				},
				breaches: breaches.breaches,
			};
		},
	};
}
