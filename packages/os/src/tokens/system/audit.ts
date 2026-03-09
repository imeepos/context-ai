import * as SystemService from "../../system-service/index.js";
import { token, type RequestOf, type ResponseOf } from "../shared.js";

// Audit Core Tokens
export const SYSTEM_AUDIT = token<RequestOf<typeof SystemService.createSystemAuditService>, ResponseOf<typeof SystemService.createSystemAuditService>, "system.audit">("system.audit");
export const SYSTEM_AUDIT_EXPORT = token<RequestOf<typeof SystemService.createSystemAuditExportService>, ResponseOf<typeof SystemService.createSystemAuditExportService>, "system.audit.export">("system.audit.export");

// Audit Keys Tokens
export const SYSTEM_AUDIT_KEYS_ROTATE = token<RequestOf<typeof SystemService.createSystemAuditKeysRotateService>, ResponseOf<typeof SystemService.createSystemAuditKeysRotateService>, "system.audit.keys.rotate">("system.audit.keys.rotate");
export const SYSTEM_AUDIT_KEYS_LIST = token<RequestOf<typeof SystemService.createSystemAuditKeysListService>, ResponseOf<typeof SystemService.createSystemAuditKeysListService>, "system.audit.keys.list">("system.audit.keys.list");
export const SYSTEM_AUDIT_KEYS_ACTIVATE = token<RequestOf<typeof SystemService.createSystemAuditKeysActivateService>, ResponseOf<typeof SystemService.createSystemAuditKeysActivateService>, "system.audit.keys.activate">("system.audit.keys.activate");

// Rollback State Tokens (renamed from Governance for clarity)
export const SYSTEM_APP_ROLLBACK_STATE_EXPORT = token<RequestOf<typeof SystemService.createSystemAppRollbackStateExportService>, ResponseOf<typeof SystemService.createSystemAppRollbackStateExportService>, "system.app.rollback.state.export">("system.app.rollback.state.export");
export const SYSTEM_APP_ROLLBACK_STATE_IMPORT = token<RequestOf<typeof SystemService.createSystemAppRollbackStateImportService>, ResponseOf<typeof SystemService.createSystemAppRollbackStateImportService>, "system.app.rollback.state.import">("system.app.rollback.state.import");
export const SYSTEM_APP_ROLLBACK_STATE_PERSIST = token<RequestOf<typeof SystemService.createSystemAppRollbackStatePersistService>, ResponseOf<typeof SystemService.createSystemAppRollbackStatePersistService>, "system.app.rollback.state.persist">("system.app.rollback.state.persist");
export const SYSTEM_APP_ROLLBACK_STATE_RECOVER = token<RequestOf<typeof SystemService.createSystemAppRollbackStateRecoverService>, ResponseOf<typeof SystemService.createSystemAppRollbackStateRecoverService>, "system.app.rollback.state.recover">("system.app.rollback.state.recover");

// Network Tokens
export const SYSTEM_NET_CIRCUIT = token<RequestOf<typeof SystemService.createSystemNetCircuitService>, ResponseOf<typeof SystemService.createSystemNetCircuitService>, "system.net.circuit">("system.net.circuit");
export const SYSTEM_NET_CIRCUIT_RESET = token<RequestOf<typeof SystemService.createSystemNetCircuitResetService>, ResponseOf<typeof SystemService.createSystemNetCircuitResetService>, "system.net.circuit.reset">("system.net.circuit.reset");

// Scheduler Failures Token
export const SYSTEM_SCHEDULER_FAILURES = token<RequestOf<typeof SystemService.createSystemSchedulerFailuresService>, ResponseOf<typeof SystemService.createSystemSchedulerFailuresService>, "system.scheduler.failures">("system.scheduler.failures");

// Errors Tokens
export const SYSTEM_ERRORS = token<RequestOf<typeof SystemService.createSystemErrorsService>, ResponseOf<typeof SystemService.createSystemErrorsService>, "system.errors">("system.errors");
export const SYSTEM_ERRORS_EXPORT = token<RequestOf<typeof SystemService.createSystemErrorsExportService>, ResponseOf<typeof SystemService.createSystemErrorsExportService>, "system.errors.export">("system.errors.export");

// Errors Keys Tokens
export const SYSTEM_ERRORS_KEYS_ROTATE = token<RequestOf<typeof SystemService.createSystemErrorsKeysRotateService>, ResponseOf<typeof SystemService.createSystemErrorsKeysRotateService>, "system.errors.keys.rotate">("system.errors.keys.rotate");
export const SYSTEM_ERRORS_KEYS_LIST = token<RequestOf<typeof SystemService.createSystemErrorsKeysListService>, ResponseOf<typeof SystemService.createSystemErrorsKeysListService>, "system.errors.keys.list">("system.errors.keys.list");
export const SYSTEM_ERRORS_KEYS_ACTIVATE = token<RequestOf<typeof SystemService.createSystemErrorsKeysActivateService>, ResponseOf<typeof SystemService.createSystemErrorsKeysActivateService>, "system.errors.keys.activate">("system.errors.keys.activate");
