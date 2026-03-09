import type { NotificationService, SchedulerService, NetService } from "../../types.js";
import type { OSService } from "../../../types/os.js";
import * as TOKENS from "../../../tokens.js";
import type {
	SystemAlertsAutoRemediateExecuteRequest,
	SystemAlertsAutoRemediateExecuteResponse,
	SystemAlertsAutoRemediateAction,
	SystemAlertsAutoRemediateAuditRecord,
} from "../types.js";
import { addAuditRecord } from "./audit.service.js";

export function createSystemAlertsAutoRemediateExecuteService(
	notificationService: NotificationService,
	schedulerService?: SchedulerService,
	netService?: NetService,
): OSService<SystemAlertsAutoRemediateExecuteRequest, SystemAlertsAutoRemediateExecuteResponse> {
	return {
		name: TOKENS.SYSTEM_ALERTS_AUTO_REMEDIATE_EXECUTE,
		requiredPermissions: ["system:write"],
		execute: async (req, ctx) => {
			const results: Array<{
				id: string;
				ok: boolean;
				message: string;
				rollback?: SystemAlertsAutoRemediateAction["rollback"];
			}> = [];

			for (const action of req.actions) {
				try {
                    switch (action.type) {
                        case "reset_net_circuit":
                            if (netService) {
                                await netService.resetCircuits?.();
                                results.push({
                                    id: action.id,
                                    ok: true,
                                    message: `Circuit reset for ${action.params.topic}`,
                                    rollback: action.rollback,
                                });
                            } else {
                                results.push({
                                    id: action.id,
                                    ok: false,
                                    message: "NetService not available",
                                });
                            }
                            break;

                        case "replay_scheduler_failure":
                            if (schedulerService) {
                                const failureId = action.params.failureId as string;
                                const failures = schedulerService.listFailures?.() ?? [];
                                const failure = failures.find((f) => f.id === failureId);
                                if (failure) {
                                    results.push({
                                        id: action.id,
                                        ok: true,
                                        message: `Identified failure ${failureId} for replay`,
                                    });
                                } else {
                                    results.push({
                                        id: action.id,
                                        ok: false,
                                        message: `Failure ${failureId} not found`,
                                    });
                                }
                            } else {
                                results.push({
                                    id: action.id,
                                    ok: false,
                                    message: "SchedulerService not available",
                                });
                            }
                            break;

                        case "mute_topic":
                            notificationService.muteTopic?.({
                                topic: action.params.topic as string,
                                durationMs: action.params.durationMs as number,
                            });
                            results.push({
                                id: action.id,
                                ok: true,
                                message: `Muted topic ${action.params.topic} for ${action.params.durationMs}ms`,
                                rollback: action.rollback,
                            });
                            break;

                        default:
                            results.push({
                                id: action.id,
                                ok: false,
                                message: `Unknown action type: ${(action as { type: string }).type}`,
                            });
                    }
                } catch (error) {
                    results.push({
                    id: action.id,
                    ok: false,
                    message: `Error: ${error instanceof Error ? error.message : String(error)}`,
                    });
                }
            }

            // Record audit entry
            const auditRecord: SystemAlertsAutoRemediateAuditRecord = {
                id: `audit-${Date.now()}-${Math.random().toString(36).slice(2)}`,
                timestamp: new Date().toISOString(),
                appId: ctx?.appId ?? "system",
                sessionId: ctx?.sessionId ?? "unknown",
                traceId: ctx?.traceId,
                approved: req.approved ?? false,
                approver: req.approver,
                approvalExpiresAt: req.approvalExpiresAt,
                dryRun: req.dryRun ?? false,
                ticketId: req.ticketId,
                executed: results.filter((r) => r.ok).length,
                results,
            };
            addAuditRecord(auditRecord);

            return {
                approved: req.approved ?? false,
                executed: results.filter((r) => r.ok).length,
                results,
            };
        },
    };
}
