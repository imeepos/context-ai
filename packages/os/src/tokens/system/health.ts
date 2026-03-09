import * as SystemService from "../../system-service/index.js";
import { token, type RequestOf, type ResponseOf } from "../shared.js";

// Health & Monitoring Tokens
export const SYSTEM_HEALTH = token<RequestOf<typeof SystemService.createSystemHealthService>, ResponseOf<typeof SystemService.createSystemHealthService>, "system.health">("system.health");
export const SYSTEM_DEPENDENCIES = token<RequestOf<typeof SystemService.createSystemDependenciesService>, ResponseOf<typeof SystemService.createSystemDependenciesService>, "system.dependencies">("system.dependencies");
export const SYSTEM_ROUTES = token<RequestOf<typeof SystemService.createSystemRoutesService>, ResponseOf<typeof SystemService.createSystemRoutesService>, "system.routes">("system.routes");
export const SYSTEM_ROUTES_STATS = token<RequestOf<typeof SystemService.createSystemRoutesStatsService>, ResponseOf<typeof SystemService.createSystemRoutesStatsService>, "system.routes.stats">("system.routes.stats");
export const SYSTEM_METRICS = token<RequestOf<typeof SystemService.createSystemMetricsService>, ResponseOf<typeof SystemService.createSystemMetricsService>, "system.metrics">("system.metrics");
export const SYSTEM_TOPOLOGY = token<RequestOf<typeof SystemService.createSystemTopologyService>, ResponseOf<typeof SystemService.createSystemTopologyService>, "system.topology">("system.topology");
export const SYSTEM_EVENTS = token<RequestOf<typeof SystemService.createSystemEventsService>, ResponseOf<typeof SystemService.createSystemEventsService>, "system.events">("system.events");
export const SYSTEM_CAPABILITIES = token<RequestOf<typeof SystemService.createSystemCapabilitiesService>, ResponseOf<typeof SystemService.createSystemCapabilitiesService>, "system.capabilities">("system.capabilities");
export const SYSTEM_CAPABILITIES_LIST = token<RequestOf<typeof SystemService.createSystemCapabilitiesListService>, ResponseOf<typeof SystemService.createSystemCapabilitiesListService>, "system.capabilities.list">("system.capabilities.list");
export const SYSTEM_SNAPSHOT = token<RequestOf<typeof SystemService.createSystemSnapshotService>, ResponseOf<typeof SystemService.createSystemSnapshotService>, "system.snapshot">("system.snapshot");

// App Install & Delta Tokens
export const SYSTEM_APP_INSTALL_REPORT = token<RequestOf<typeof SystemService.createSystemAppInstallReportService>, ResponseOf<typeof SystemService.createSystemAppInstallReportService>, "system.app.install.report">("system.app.install.report");
export const SYSTEM_APP_DELTA = token<RequestOf<typeof SystemService.createSystemAppDeltaService>, ResponseOf<typeof SystemService.createSystemAppDeltaService>, "system.app.delta">("system.app.delta");
