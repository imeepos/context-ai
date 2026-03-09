import type { SystemAlertsAutoRemediateAuditRecord } from "../types.js";
import type { OSService } from "../../../types/os.js";
import * as TOKENS from "../../../tokens.js";

const auditRecords: SystemAlertsAutoRemediateAuditRecord[] = [];

export function getAuditRecords(): SystemAlertsAutoRemediateAuditRecord[] {
    return [...auditRecords];
}

export function addAuditRecord(record: SystemAlertsAutoRemediateAuditRecord): void {
    auditRecords.push(record);
}

export function createSystemAlertsAutoRemediateAuditService(): OSService<
    { sessionId?: string; limit?: number },
    { records: SystemAlertsAutoRemediateAuditRecord[] }
> {
    return {
        name: TOKENS.SYSTEM_ALERTS_AUTO_REMEDIATE_AUDIT,
        requiredPermissions: ["system:read"],
        execute: async (req) => {
            let records = getAuditRecords();
            if (req.sessionId) {
                records = records.filter((item) => item.sessionId === req.sessionId);
            }
            if (req.limit && req.limit > 0) {
                records = records.slice(-req.limit);
            }
            return {
                records,
            };
        },
    };
}
