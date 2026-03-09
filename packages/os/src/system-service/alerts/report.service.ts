import type { NotificationService, NotificationSeverity } from "../types.js";
import type { OSService } from "../../types/os.js";
import * as TOKENS from "../../tokens.js";
import { createSystemAlertsTrendsService } from "./trends.service.js";
import { createSystemAlertsSLOService } from "./slo.service.js";
import { createSystemAlertsDigestService } from "./digest.service.js";

export interface SystemAlertsReportRequest {
	topic?: string;
	windowMinutes?: number;
}

export interface SystemAlertsReportResponse {
	policy: ReturnType<NotificationService["getPolicy"]>;
	stats: ReturnType<NotificationService["getStats"]>;
	trends: {
		windowMinutes: number;
		total: number;
		bySeverity: Partial<Record<NotificationSeverity, number>>;
	};
	slo: {
		ackedCount: number;
		avgAckLatencyMs: number;
		p95AckLatencyMs: number;
	};
	digest: string;
}

export function createSystemAlertsReportService(
	notificationService: NotificationService,
): OSService<SystemAlertsReportRequest, SystemAlertsReportResponse> {
	return {
		name: TOKENS.SYSTEM_ALERTS_REPORT,
		requiredPermissions: ["system:read"],
	 execute: async (req) => {
            const windowMinutes = req.windowMinutes && req.windowMinutes > 0 ? req.windowMinutes : 60;
            const trends = await createSystemAlertsTrendsService(notificationService).execute(
                { topic: req.topic, windowMinutes },
                {
                    appId: "system",
                    sessionId: "system",
                    permissions: ["system:read"],
                    workingDirectory: process.cwd(),
                },
            )
            const slo = await createSystemAlertsSLOService(notificationService).execute(
                {},
                {
                    appId: "system",
                    sessionId: "system",
                    permissions: ["system:read"],
                    workingDirectory: process.cwd(),
                },
            )
            const digest = await createSystemAlertsDigestService(notificationService).execute(
                { topic: req.topic, limit: 20 },
                {
                    appId: "system",
                    sessionId: "system",
                    permissions: ["system:read"],
                    workingDirectory: process.cwd(),
                },
            )
            return {
                policy: notificationService.getPolicy(),
                stats: notificationService.getStats(),
                trends,
                slo,
                digest: digest.digest,
            }
        },
    }
}

