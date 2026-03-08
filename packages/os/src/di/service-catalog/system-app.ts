import {
	createSystemAppDeltaService,
	createSystemAppInstallReportService,
	createSystemAppRollbackAuditService,
	createSystemAppRollbackGCService,
	createSystemAppRollbackStateExportService,
	createSystemAppRollbackStateImportService,
	createSystemAppRollbackStatePersistService,
	createSystemAppRollbackStateRecoverService,
	createSystemAppRollbackStatsService,
	createSystemRoutesService,
	createSystemRoutesStatsService,
} from "../../system-service/index.js";
import * as TOKENS from "../../tokens.js";
import { OS_APP_MANAGER, OS_KERNEL, OS_STORE } from "../tokens.js";
import { createDelegatingOSServiceClass } from "./delegating-service.js";
import { defineInjectableOSService } from "./definition.js";

export const SystemRoutesOSService = createDelegatingOSServiceClass(
	TOKENS.SYSTEM_ROUTES,
	["system:read"],
	createSystemRoutesService,
);
export const SystemRoutesStatsOSService = createDelegatingOSServiceClass(
	TOKENS.SYSTEM_ROUTES_STATS,
	["system:read"],
	createSystemRoutesStatsService,
);
export const SystemAppInstallReportOSService = createDelegatingOSServiceClass(
	TOKENS.SYSTEM_APP_INSTALL_REPORT,
	["system:read"],
	createSystemAppInstallReportService,
);
export const SystemAppDeltaOSService = createDelegatingOSServiceClass(
	TOKENS.SYSTEM_APP_DELTA,
	["system:read"],
	createSystemAppDeltaService,
);
export const SystemAppRollbackStateExportOSService = createDelegatingOSServiceClass(
	TOKENS.SYSTEM_APP_ROLLBACK_STATE_EXPORT,
	["system:read"],
	createSystemAppRollbackStateExportService,
);
export const SystemAppRollbackStateImportOSService = createDelegatingOSServiceClass(
	TOKENS.SYSTEM_APP_ROLLBACK_STATE_IMPORT,
	["system:write"],
	createSystemAppRollbackStateImportService,
);
export const SystemAppRollbackStatePersistOSService = createDelegatingOSServiceClass(
	TOKENS.SYSTEM_APP_ROLLBACK_STATE_PERSIST,
	["system:write"],
	createSystemAppRollbackStatePersistService,
);
export const SystemAppRollbackStateRecoverOSService = createDelegatingOSServiceClass(
	TOKENS.SYSTEM_APP_ROLLBACK_STATE_RECOVER,
	["system:write"],
	createSystemAppRollbackStateRecoverService,
);
export const SystemAppRollbackStatsOSService = createDelegatingOSServiceClass(
	TOKENS.SYSTEM_APP_ROLLBACK_STATS,
	["system:read"],
	createSystemAppRollbackStatsService,
);
export const SystemAppRollbackGCOSService = createDelegatingOSServiceClass(
	TOKENS.SYSTEM_APP_ROLLBACK_GC,
	["system:write"],
	createSystemAppRollbackGCService,
);
export const SystemAppRollbackAuditOSService = createDelegatingOSServiceClass(
	TOKENS.SYSTEM_APP_ROLLBACK_AUDIT,
	["system:read"],
	createSystemAppRollbackAuditService,
);

export const SYSTEM_APP_SERVICE_DEFINITIONS = [
	defineInjectableOSService(TOKENS.SYSTEM_ROUTES, SystemRoutesOSService, [OS_APP_MANAGER] as const),
	defineInjectableOSService(TOKENS.SYSTEM_ROUTES_STATS, SystemRoutesStatsOSService, [OS_APP_MANAGER] as const),
	defineInjectableOSService(TOKENS.SYSTEM_APP_INSTALL_REPORT, SystemAppInstallReportOSService, [OS_APP_MANAGER] as const),
	defineInjectableOSService(TOKENS.SYSTEM_APP_DELTA, SystemAppDeltaOSService, [OS_APP_MANAGER] as const),
	defineInjectableOSService(TOKENS.SYSTEM_APP_ROLLBACK_STATE_EXPORT, SystemAppRollbackStateExportOSService, [OS_APP_MANAGER] as const),
	defineInjectableOSService(TOKENS.SYSTEM_APP_ROLLBACK_STATE_IMPORT, SystemAppRollbackStateImportOSService, [OS_APP_MANAGER] as const),
	defineInjectableOSService(TOKENS.SYSTEM_APP_ROLLBACK_STATE_PERSIST, SystemAppRollbackStatePersistOSService, [OS_APP_MANAGER, OS_STORE] as const),
	defineInjectableOSService(TOKENS.SYSTEM_APP_ROLLBACK_STATE_RECOVER, SystemAppRollbackStateRecoverOSService, [OS_APP_MANAGER, OS_STORE] as const),
	defineInjectableOSService(TOKENS.SYSTEM_APP_ROLLBACK_STATS, SystemAppRollbackStatsOSService, [OS_APP_MANAGER] as const),
	defineInjectableOSService(TOKENS.SYSTEM_APP_ROLLBACK_GC, SystemAppRollbackGCOSService, [OS_APP_MANAGER] as const),
	defineInjectableOSService(TOKENS.SYSTEM_APP_ROLLBACK_AUDIT, SystemAppRollbackAuditOSService, [OS_KERNEL] as const),
] as const;
