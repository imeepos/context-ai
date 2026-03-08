import {
	createSystemAuditKeysActivateService,
	createSystemAuditKeysListService,
	createSystemAuditKeysRotateService,
	createSystemAuditService,
	createSystemCapabilitiesListService,
	createSystemCapabilitiesService,
	createSystemDependenciesService,
	createSystemEventsService,
	createSystemGovernanceStateExportService,
	createSystemGovernanceStateImportService,
	createSystemGovernanceStatePersistService,
	createSystemGovernanceStateRecoverService,
	createSystemHealthService,
	createSystemMetricsService,
	createSystemTopologyService,
} from "../../system-service/index.js";
import * as TOKENS from "../../tokens.js";
import { OS_KERNEL, OS_STORE } from "../tokens.js";
import { createDelegatingOSServiceClass } from "./delegating-service.js";
import { defineInjectableOSService } from "./definition.js";

export const SystemHealthOSService = createDelegatingOSServiceClass(
	TOKENS.SYSTEM_HEALTH,
	["system:read"],
	createSystemHealthService,
);
export const SystemDependenciesOSService = createDelegatingOSServiceClass(
	TOKENS.SYSTEM_DEPENDENCIES,
	["system:read"],
	createSystemDependenciesService,
);
export const SystemMetricsOSService = createDelegatingOSServiceClass(
	TOKENS.SYSTEM_METRICS,
	["system:read"],
	createSystemMetricsService,
);
export const SystemAuditOSService = createDelegatingOSServiceClass(
	TOKENS.SYSTEM_AUDIT,
	["system:read"],
	createSystemAuditService,
);
export const SystemGovernanceStateExportOSService = createDelegatingOSServiceClass(
	TOKENS.SYSTEM_GOVERNANCE_STATE_EXPORT,
	["system:read"],
	createSystemGovernanceStateExportService,
);
export const SystemGovernanceStateImportOSService = createDelegatingOSServiceClass(
	TOKENS.SYSTEM_GOVERNANCE_STATE_IMPORT,
	["system:write"],
	createSystemGovernanceStateImportService,
);
export const SystemGovernanceStatePersistOSService = createDelegatingOSServiceClass(
	TOKENS.SYSTEM_GOVERNANCE_STATE_PERSIST,
	["system:write"],
	createSystemGovernanceStatePersistService,
);
export const SystemGovernanceStateRecoverOSService = createDelegatingOSServiceClass(
	TOKENS.SYSTEM_GOVERNANCE_STATE_RECOVER,
	["system:write"],
	createSystemGovernanceStateRecoverService,
);
export const SystemAuditKeysRotateOSService = createDelegatingOSServiceClass(
	TOKENS.SYSTEM_AUDIT_KEYS_ROTATE,
	["system:write"],
	createSystemAuditKeysRotateService,
);
export const SystemAuditKeysListOSService = createDelegatingOSServiceClass(
	TOKENS.SYSTEM_AUDIT_KEYS_LIST,
	["system:read"],
	createSystemAuditKeysListService,
);
export const SystemAuditKeysActivateOSService = createDelegatingOSServiceClass(
	TOKENS.SYSTEM_AUDIT_KEYS_ACTIVATE,
	["system:write"],
	createSystemAuditKeysActivateService,
);
export const SystemTopologyOSService = createDelegatingOSServiceClass(
	TOKENS.SYSTEM_TOPOLOGY,
	["system:read"],
	createSystemTopologyService,
);
export const SystemEventsOSService = createDelegatingOSServiceClass(
	TOKENS.SYSTEM_EVENTS,
	["system:read"],
	createSystemEventsService,
);
export const SystemCapabilitiesOSService = createDelegatingOSServiceClass(
	TOKENS.SYSTEM_CAPABILITIES,
	["system:read"],
	createSystemCapabilitiesService,
);
export const SystemCapabilitiesListOSService = createDelegatingOSServiceClass(
	TOKENS.SYSTEM_CAPABILITIES_LIST,
	["system:read"],
	createSystemCapabilitiesListService,
);

export const SYSTEM_OBSERVABILITY_SERVICE_DEFINITIONS = [
	defineInjectableOSService(TOKENS.SYSTEM_HEALTH, SystemHealthOSService, [OS_KERNEL] as const),
	defineInjectableOSService(TOKENS.SYSTEM_DEPENDENCIES, SystemDependenciesOSService, [OS_KERNEL] as const),
	defineInjectableOSService(TOKENS.SYSTEM_METRICS, SystemMetricsOSService, [OS_KERNEL] as const),
	defineInjectableOSService(TOKENS.SYSTEM_AUDIT, SystemAuditOSService, [OS_KERNEL] as const),
	defineInjectableOSService(TOKENS.SYSTEM_GOVERNANCE_STATE_EXPORT, SystemGovernanceStateExportOSService, [] as const),
	defineInjectableOSService(TOKENS.SYSTEM_GOVERNANCE_STATE_IMPORT, SystemGovernanceStateImportOSService, [] as const),
	defineInjectableOSService(TOKENS.SYSTEM_GOVERNANCE_STATE_PERSIST, SystemGovernanceStatePersistOSService, [OS_STORE] as const),
	defineInjectableOSService(TOKENS.SYSTEM_GOVERNANCE_STATE_RECOVER, SystemGovernanceStateRecoverOSService, [OS_STORE] as const),
	defineInjectableOSService(TOKENS.SYSTEM_AUDIT_KEYS_ROTATE, SystemAuditKeysRotateOSService, [] as const),
	defineInjectableOSService(TOKENS.SYSTEM_AUDIT_KEYS_LIST, SystemAuditKeysListOSService, [] as const),
	defineInjectableOSService(TOKENS.SYSTEM_AUDIT_KEYS_ACTIVATE, SystemAuditKeysActivateOSService, [] as const),
	defineInjectableOSService(TOKENS.SYSTEM_TOPOLOGY, SystemTopologyOSService, [OS_KERNEL] as const),
	defineInjectableOSService(TOKENS.SYSTEM_EVENTS, SystemEventsOSService, [OS_KERNEL] as const),
	defineInjectableOSService(TOKENS.SYSTEM_CAPABILITIES, SystemCapabilitiesOSService, [OS_KERNEL] as const),
	defineInjectableOSService(TOKENS.SYSTEM_CAPABILITIES_LIST, SystemCapabilitiesListOSService, [OS_KERNEL] as const),
] as const;
