import * as SystemService from "../../system-service/index.js";
import { token, type RequestOf, type ResponseOf } from "../shared.js";

// Rollback Stats, Audit, and GC Tokens
// Note: Rollback State tokens (EXPORT, IMPORT, PERSIST, RECOVER) are now in audit.ts

export const SYSTEM_APP_ROLLBACK_STATS = token<RequestOf<typeof SystemService.createSystemAppRollbackStatsService>, ResponseOf<typeof SystemService.createSystemAppRollbackStatsService>, "system.app.rollback.stats">("system.app.rollback.stats");
export const SYSTEM_APP_ROLLBACK_GC = token<RequestOf<typeof SystemService.createSystemAppRollbackGCService>, ResponseOf<typeof SystemService.createSystemAppRollbackGCService>, "system.app.rollback.gc">("system.app.rollback.gc");
export const SYSTEM_APP_ROLLBACK_AUDIT = token<RequestOf<typeof SystemService.createSystemAppRollbackAuditService>, ResponseOf<typeof SystemService.createSystemAppRollbackAuditService>, "system.app.rollback.audit">("system.app.rollback.audit");
