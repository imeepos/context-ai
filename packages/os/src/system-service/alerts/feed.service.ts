import type { NotificationService, NotificationSeverity } from "../types.js";
import type { OSService } from "../../types/os.js";
import * as TOKENS from "../../tokens.js";

export interface SystemAlertsFeedRequest {
	topic?: string;
	severity?: NotificationSeverity;
	acknowledged?: boolean;
	offset?: number;
	limit?: number;
}

export interface SystemAlertsFeedResponse {
	total: number;
	offset: number;
	limit: number;
	hasMore: boolean;
	items: ReturnType<NotificationService["query"]>;
}

export function createSystemAlertsFeedService(
	notificationService: NotificationService,
): OSService<SystemAlertsFeedRequest, SystemAlertsFeedResponse> {
	return {
		name: TOKENS.SYSTEM_ALERTS_FEED,
		requiredPermissions: ["system:read"],
		execute: async (req) => {
			const offset = req.offset && req.offset > 0 ? req.offset : 0;
			const limit = req.limit && req.limit > 0 ? req.limit : 20
            const all = notificationService
                .query({
                    topic: req.topic,
                    severity: req.severity,
                    acknowledged: req.acknowledged,
                })
                .slice()
                .sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1))
            const items = all.slice(offset, offset + limit)
            return {
                total: all.length,
                offset,
                limit,
                hasMore: offset + limit < all.length,
                items,
            }
        },
    }
}
