import type { NotificationService, NotificationSeverity } from "../types.js";
import type { OSService } from "../../types/os.js";
import * as TOKENS from "../../tokens.js";

export interface SystemAlertsHotspotsRequest {
	windowMinutes: number;
	topic?: string;
	limit?: number;
}

export interface SystemAlertsHotspotsResponse {
	windowMinutes: number;
	items: Array<{
		signature: string;
		message: string;
		severity: NotificationSeverity;
		currentCount: number;
		previousCount: number;
		delta: number;
	}>;
}

export function createSystemAlertsHotspotsService(
	notificationService: NotificationService,
): OSService<SystemAlertsHotspotsRequest, SystemAlertsHotspotsResponse> {
	return {
		name: TOKENS.SYSTEM_ALERTS_HOTSPOTS,
		requiredPermissions: ["system:read"],
		execute: async (req) => {
			const windowMinutes = req.windowMinutes > 0 ? req.windowMinutes : 10;
			const windowMs = windowMinutes * 60 * 1000;
			const nowMs = Date.now();
			const currentStart = nowMs - windowMs;
			const previousStart = currentStart - windowMs;

			const all = notificationService.query({
				topic: req.topic,
				since: new Date(previousStart).toISOString(),
				until: new Date(nowMs).toISOString(),
			});
			const currentMap = new Map<string, { message: string; severity: NotificationSeverity; count: number }>();
			const previousMap = new Map<string, { message: string; severity: NotificationSeverity; count: number }>();

			for (const alert of all) {
				const ts = Date.parse(alert.timestamp);
				const signature = `${alert.message}::${alert.severity}`;
				if (ts >= currentStart && ts <= nowMs) {
					const cur = currentMap.get(signature);
					if (cur) {
						cur.count += 1;
					} else {
						currentMap.set(signature, { message: alert.message, severity: alert.severity, count: 1 });
					}
				} else if (ts >= previousStart && ts < currentStart) {
					const prev = previousMap.get(signature);
					if (prev) {
						prev.count += 1;
					} else {
						previousMap.set(signature, { message: alert.message, severity: alert.severity, count: 1 });
					}
				}
			}

			const keys = new Set([...currentMap.keys(), ...previousMap.keys()]);
			const items = [...keys]
				.map((signature) => {
					const current = currentMap.get(signature);
					const previous = previousMap.get(signature);
					const currentCount = current?.count ?? 0;
					const previousCount = previous?.count ?? 0;
					return {
						signature,
						message: current?.message ?? previous?.message ?? "",
						severity: current?.severity ?? previous?.severity ?? "info",
						currentCount,
						previousCount,
						delta: currentCount - previousCount,
					};
				})
				.filter((item) => item.currentCount > 0 || item.previousCount > 0)
				.sort((a, b) => b.delta - a.delta || b.currentCount - a.currentCount);

			return {
				windowMinutes,
				items: req.limit && req.limit > 0 ? items.slice(0, req.limit) : items,
			}
		},
	};
}
