import type { NotificationService, SchedulerService } from "../types.js";
import type { OSService } from "../../types/os.js";
import * as TOKENS from "../../tokens.js";
import type {
	SystemAlertsAutoRemediatePlanRequest,
	SystemAlertsAutoRemediatePlanResponse,
	SystemAlertsAutoRemediateAction,
} from "./types.js";

export function createSystemAlertsAutoRemediatePlanService(
	notificationService: NotificationService,
	schedulerService?: SchedulerService,
): OSService<SystemAlertsAutoRemediatePlanRequest, SystemAlertsAutoRemediatePlanResponse> {
	return {
		name: TOKENS.SYSTEM_ALERTS_AUTO_REMEDIATE_PLAN,
		requiredPermissions: ["system:read"],
		execute: async (req) => {
			const windowMs = (req.windowMinutes ?? 5) * 60 * 1000;
			const overdueThresholdMs = req.overdueThresholdMs ?? 300000;
			const actions: SystemAlertsAutoRemediateAction[] = [];

			// Get unacknowledged alerts from notification service
			const alerts = notificationService.query({
				topic: req.topic,
				acknowledged: false,
			});

			// Check for flapping alerts (same signature appearing multiple times)
			const signatureCounts = new Map<string, { count: number; topic: string }>();
			for (const alert of alerts) {
				const sig = `${alert.topic}:${alert.severity}`;
				const existing = signatureCounts.get(sig);
				if (existing) {
					existing.count++;
				} else {
					signatureCounts.set(sig, { count: 1, topic: alert.topic });
				}
			}

			// Generate remediation actions for flapping signatures
			for (const [sig, item] of signatureCounts) {
				if (item.count >= 3) {
					const action: SystemAlertsAutoRemediateAction = {
						id: `mute-${sig}-${Date.now()}`,
						type: "mute_topic",
						params: { topic: item.topic, durationMs: windowMs },
						reason: `${item.count} occurrences of flapping signature detected`,
						rollback: {
							type: "notification.unmute",
							params: { topic: item.topic },
						},
					};
					actions.push(action);
				}
			}

			// Check for overdue alerts
			const now = Date.now();
			for (const alert of alerts) {
				const alertAge = now - new Date(alert.timestamp).getTime();
				if (alertAge > overdueThresholdMs && alert.topic.includes("circuit")) {
					const action: SystemAlertsAutoRemediateAction = {
						id: `reset-circuit-${Date.now()}`,
						type: "reset_net_circuit",
						params: { topic: alert.topic },
						reason: `Overdue alert (${alertAge}ms > ${overdueThresholdMs}ms threshold)`,
					};
					actions.push(action);
				}
			}

			// Check for scheduler failures if service available
			if (schedulerService) {
				const failures = schedulerService.listFailures?.() ?? [];
				for (const failure of failures) {
					const action: SystemAlertsAutoRemediateAction = {
						id: `replay-${failure.id}`,
						type: "replay_scheduler_failure",
						params: { failureId: failure.id },
						reason: `Scheduler failure: ${failure.error}`,
					};
					actions.push(action);
				}
			}

			return {
				generatedAt: new Date().toISOString(),
				actions,
			};
		},
	};
}
