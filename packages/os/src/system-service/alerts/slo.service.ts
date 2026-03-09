import type { NotificationService } from "../types.js";
import type { OSService } from "../../types/os.js";
import * as TOKENS from "../../tokens.js";

export interface SystemAlertsSLOResponse {
	ackedCount: number;
	avgAckLatencyMs: number;
	p95AckLatencyMs: number;
}

export function createSystemAlertsSLOService(
	notificationService: NotificationService,
): OSService<Record<string, never>, SystemAlertsSLOResponse> {
	return {
		name: TOKENS.SYSTEM_ALERTS_SLO,
		requiredPermissions: ["system:read"],
		execute: async () => {
            const acked = notificationService
                .query({})
                .filter((item) => item.acknowledged && item.ackedAt)
                .map((item) => Date.parse(item.ackedAt!) - Date.parse(item.timestamp))
                .filter((value) => Number.isFinite(value) && value >= 0)
                .sort((a, b) => a - b)
            if (acked.length === 0) {
                return {
                    ackedCount: 0,
                    avgAckLatencyMs: 0,
                    p95AckLatencyMs: 0,
                }
            }
            const sum = acked.reduce((total, current) => total + current, 0)
            const avg = Math.round(sum / acked.length)
            const p95Index = Math.ceil(acked.length * 0.95) - 1
            const p95 = acked[Math.max(0, p95Index)] ?? acked[acked.length - 1] ?? 0
            return {
                ackedCount: acked.length,
                avgAckLatencyMs: avg,
                p95AckLatencyMs: p95,
            }
        },
    }
}
