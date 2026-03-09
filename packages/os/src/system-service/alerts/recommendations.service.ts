import type { NotificationService } from "../types.js";
import type { OSService } from "../../types/os.js";
import * as TOKENS from "../../tokens.js";
import { createSystemAlertsTrendsService } from "./trends.service.js";
import { createSystemAlertsFlappingService } from "./flapping.service.js";
import { createSystemAlertsHotspotsService } from "./hotspots.service.js";

export interface SystemAlertsRecommendationsRequest {
	topic?: string;
	windowMinutes: number;
}

export interface SystemAlertsRecommendationsResponse {
	recommendations: Array<{
		title: string;
		reason: string;
		action: string;
		priority: "low" | "medium" | "high";
	}>;
}

export function createSystemAlertsRecommendationsService(
	notificationService: NotificationService,
): OSService<SystemAlertsRecommendationsRequest, SystemAlertsRecommendationsResponse> {
	return {
		name: TOKENS.SYSTEM_ALERTS_RECOMMENDATIONS,
		requiredPermissions: ["system:read"],
		execute: async (req) => {
			const windowMinutes = req.windowMinutes > 0 ? req.windowMinutes : 10;
			const trends = await createSystemAlertsTrendsService(notificationService).execute(
				{
					windowMinutes,
					topic: req.topic,
				},
				{
					appId: "system",
					sessionId: "system",
					permissions: ["system:read"],
					workingDirectory: process.cwd(),
				},
			);
			const flapping = await createSystemAlertsFlappingService(notificationService).execute(
				{
					windowMinutes,
					threshold: 3,
					topic: req.topic,
				},
				{
					appId: "system",
					sessionId: "system",
					permissions: ["system:read"],
					workingDirectory: process.cwd(),
				},
			);
			const hotspots = await createSystemAlertsHotspotsService(notificationService).execute(
				{
					windowMinutes,
					topic: req.topic,
					limit: 3,
				},
				{
					appId: "system",
					sessionId: "system",
					permissions: ["system:read"],
					workingDirectory: process.cwd(),
				},
			);

			const recommendations: Array<{
				title: string;
				reason: string;
				action: string;
				priority: "low" | "medium" | "high";
			}> = [];

			if ((trends.bySeverity.critical ?? 0) > 0) {
				recommendations.push({
					title: "Handle critical alerts first",
					reason: `Detected ${trends.bySeverity.critical} critical alerts in last ${windowMinutes} minutes`,
					action: "Escalate on-call and start incident bridge immediately",
					priority: "high",
				});
			}
			if (flapping.total > 0) {
				recommendations.push({
					title: "Suppress flapping alerts",
					reason: `Detected ${flapping.total} flapping signatures`,
					action: "Apply temporary mute/dedupe or tune thresholds for noisy signatures",
					priority: "medium",
				});
			}
			const topHotspot = hotspots.items[0];
			if (topHotspot && topHotspot.delta > 0) {
				recommendations.push({
					title: "Investigate rising hotspot",
					reason: `${topHotspot.message} increased by ${topHotspot.delta} vs previous window`,
					action: "Run targeted diagnostics for related service and recent deployments",
					priority: topHotspot.severity === "critical" ? "high" : "medium",
				});
			}
			if (recommendations.length === 0) {
				recommendations.push({
					title: "System stable",
					reason: "No critical growth or flapping patterns detected",
					action: "Keep current policies and continue periodic monitoring",
					priority: "low",
				});
			}

			return { recommendations };
		},
	};
}
