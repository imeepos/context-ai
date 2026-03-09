import {
	createSystemAuditService,
	createSystemCapabilitiesListService,
	createSystemCapabilitiesService,
	createSystemDependenciesService,
	createSystemEventsService,
	createSystemHealthService,
	createSystemMetricsService,
	createSystemTopologyService,
} from "../../system-service/index.js";
import * as TOKENS from "../../tokens.js";
import { OS_KERNEL } from "../tokens.js";
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

export const SystemTopologyOSService = createDelegatingOSServiceClass(
	TOKENS.SYSTEM_TOPOLOGY,
    ["system:read"],
    createSystemTopologyService,
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

export const SystemEventsOSService = createDelegatingOSServiceClass(
	TOKENS.SYSTEM_EVENTS,
    ["system:read"],
    createSystemEventsService,
);

export const SystemAuditOSService = createDelegatingOSServiceClass(
	TOKENS.SYSTEM_AUDIT,
    ["system:read"],
    createSystemAuditService,
);

export const SYSTEM_OBSERVABILITY_SERVICE_DEFINITIONS = [
    defineInjectableOSService(TOKENS.SYSTEM_HEALTH, SystemHealthOSService, [OS_KERNEL] as const),
    defineInjectableOSService(TOKENS.SYSTEM_DEPENDENCIES, SystemDependenciesOSService, [OS_KERNEL] as const),
    defineInjectableOSService(TOKENS.SYSTEM_METRICS, SystemMetricsOSService, [OS_KERNEL] as const),
    defineInjectableOSService(TOKENS.SYSTEM_TOPOLOGY, SystemTopologyOSService, [OS_KERNEL] as const),
    defineInjectableOSService(TOKENS.SYSTEM_EVENTS, SystemEventsOSService, [OS_KERNEL] as const),
    defineInjectableOSService(TOKENS.SYSTEM_CAPABILITIES, SystemCapabilitiesOSService, [OS_KERNEL] as const),
    defineInjectableOSService(TOKENS.SYSTEM_CAPABILITIES_LIST, SystemCapabilitiesListOSService, [OS_KERNEL] as const),
    defineInjectableOSService(TOKENS.SYSTEM_AUDIT, SystemAuditOSService, [OS_KERNEL] as const),
] as const;
