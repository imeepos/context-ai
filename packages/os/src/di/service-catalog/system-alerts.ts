import {
	createSystemAlertsAutoRemediateAuditService,
	createSystemAlertsAutoRemediateExecuteService,
	createSystemAlertsAutoRemediatePlanService,
	createSystemAlertsBacklogService,
	createSystemAlertsBreachesService,
	createSystemAlertsClearService,
	createSystemAlertsDigestService,
	createSystemAlertsExportService,
	createSystemAlertsFeedService,
	createSystemAlertsFlappingService,
	createSystemAlertsHealthService,
	createSystemAlertsHotspotsService,
	createSystemAlertsIncidentsService,
	createSystemAlertsPolicyService,
	createSystemAlertsRecommendationsService,
	createSystemAlertsReportCompactService,
	createSystemAlertsReportService,
	createSystemAlertsService,
	createSystemAlertsSLOService,
	createSystemAlertsStatsService,
	createSystemAlertsTimelineService,
	createSystemAlertsTopicsService,
	createSystemAlertsTrendsService,
	createSystemAlertsUnackedService,
	createSystemSLOService,
	createSystemSLORulesEvaluateService,
	createSystemSLORulesListService,
	createSystemSLORulesUpsertService,
} from "../../system-service/index.js";
import * as TOKENS from "../../tokens.js";
import { OS_KERNEL, OS_NET, OS_NOTIFICATION, OS_SCHEDULER } from "../tokens.js";
import { createDelegatingOSServiceClass } from "./delegating-service.js";
import { defineInjectableOSService } from "./definition.js";

export const SystemAlertsOSService = createDelegatingOSServiceClass(
	TOKENS.SYSTEM_ALERTS,
	["system:read"],
	createSystemAlertsService,
);
export const SystemAlertsClearOSService = createDelegatingOSServiceClass(
	TOKENS.SYSTEM_ALERTS_CLEAR,
	["system:read"],
	createSystemAlertsClearService,
);
export const SystemAlertsExportOSService = createDelegatingOSServiceClass(
	TOKENS.SYSTEM_ALERTS_EXPORT,
	["system:read"],
	createSystemAlertsExportService,
);
export const SystemAlertsStatsOSService = createDelegatingOSServiceClass(
	TOKENS.SYSTEM_ALERTS_STATS,
	["system:read"],
	createSystemAlertsStatsService,
);
export const SystemAlertsTopicsOSService = createDelegatingOSServiceClass(
	TOKENS.SYSTEM_ALERTS_TOPICS,
	["system:read"],
	createSystemAlertsTopicsService,
);
export const SystemAlertsUnackedOSService = createDelegatingOSServiceClass(
	TOKENS.SYSTEM_ALERTS_UNACKED,
	["system:read"],
	createSystemAlertsUnackedService,
);
export const SystemAlertsPolicyOSService = createDelegatingOSServiceClass(
	TOKENS.SYSTEM_ALERTS_POLICY,
	["system:read"],
	createSystemAlertsPolicyService,
);
export const SystemAlertsTrendsOSService = createDelegatingOSServiceClass(
	TOKENS.SYSTEM_ALERTS_TRENDS,
	["system:read"],
	createSystemAlertsTrendsService,
);
export const SystemAlertsSLOOSService = createDelegatingOSServiceClass(
	TOKENS.SYSTEM_ALERTS_SLO,
	["system:read"],
	createSystemAlertsSLOService,
);
export const SystemAlertsIncidentsOSService = createDelegatingOSServiceClass(
	TOKENS.SYSTEM_ALERTS_INCIDENTS,
	["system:read"],
	createSystemAlertsIncidentsService,
);
export const SystemAlertsDigestOSService = createDelegatingOSServiceClass(
	TOKENS.SYSTEM_ALERTS_DIGEST,
	["system:read"],
	createSystemAlertsDigestService,
);
export const SystemAlertsReportOSService = createDelegatingOSServiceClass(
	TOKENS.SYSTEM_ALERTS_REPORT,
	["system:read"],
	createSystemAlertsReportService,
);
export const SystemAlertsReportCompactOSService = createDelegatingOSServiceClass(
	TOKENS.SYSTEM_ALERTS_REPORT_COMPACT,
	["system:read"],
	createSystemAlertsReportCompactService,
);
export const SystemAlertsFlappingOSService = createDelegatingOSServiceClass(
	TOKENS.SYSTEM_ALERTS_FLAPPING,
	["system:read"],
	createSystemAlertsFlappingService,
);
export const SystemAlertsTimelineOSService = createDelegatingOSServiceClass(
	TOKENS.SYSTEM_ALERTS_TIMELINE,
	["system:read"],
	createSystemAlertsTimelineService,
);
export const SystemAlertsHotspotsOSService = createDelegatingOSServiceClass(
	TOKENS.SYSTEM_ALERTS_HOTSPOTS,
	["system:read"],
	createSystemAlertsHotspotsService,
);
export const SystemAlertsRecommendationsOSService = createDelegatingOSServiceClass(
	TOKENS.SYSTEM_ALERTS_RECOMMENDATIONS,
	["system:read"],
	createSystemAlertsRecommendationsService,
);
export const SystemAlertsFeedOSService = createDelegatingOSServiceClass(
	TOKENS.SYSTEM_ALERTS_FEED,
	["system:read"],
	createSystemAlertsFeedService,
);
export const SystemAlertsBacklogOSService = createDelegatingOSServiceClass(
	TOKENS.SYSTEM_ALERTS_BACKLOG,
	["system:read"],
	createSystemAlertsBacklogService,
);
export const SystemAlertsBreachesOSService = createDelegatingOSServiceClass(
	TOKENS.SYSTEM_ALERTS_BREACHES,
	["system:read"],
	createSystemAlertsBreachesService,
);
export const SystemAlertsHealthOSService = createDelegatingOSServiceClass(
	TOKENS.SYSTEM_ALERTS_HEALTH,
	["system:read"],
	createSystemAlertsHealthService,
);
export const SystemAlertsAutoRemediatePlanOSService = createDelegatingOSServiceClass(
	TOKENS.SYSTEM_ALERTS_AUTO_REMEDIATE_PLAN,
	["system:read"],
	createSystemAlertsAutoRemediatePlanService,
);
export const SystemAlertsAutoRemediateExecuteOSService = createDelegatingOSServiceClass(
	TOKENS.SYSTEM_ALERTS_AUTO_REMEDIATE_EXECUTE,
	["system:write"],
	createSystemAlertsAutoRemediateExecuteService,
);
export const SystemAlertsAutoRemediateAuditOSService = createDelegatingOSServiceClass(
	TOKENS.SYSTEM_ALERTS_AUTO_REMEDIATE_AUDIT,
	["system:read"],
	createSystemAlertsAutoRemediateAuditService,
);
export const SystemSLOOSService = createDelegatingOSServiceClass(
	TOKENS.SYSTEM_SLO,
	["system:read"],
	createSystemSLOService,
);
export const SystemSLORulesUpsertOSService = createDelegatingOSServiceClass(
	TOKENS.SYSTEM_SLO_RULES_UPSERT,
	["system:write"],
	createSystemSLORulesUpsertService,
);
export const SystemSLORulesListOSService = createDelegatingOSServiceClass(
	TOKENS.SYSTEM_SLO_RULES_LIST,
	["system:read"],
	createSystemSLORulesListService,
);
export const SystemSLORulesEvaluateOSService = createDelegatingOSServiceClass(
	TOKENS.SYSTEM_SLO_RULES_EVALUATE,
	["system:read"],
	createSystemSLORulesEvaluateService,
);

export const SYSTEM_ALERTS_SERVICE_DEFINITIONS = [
	defineInjectableOSService(TOKENS.SYSTEM_ALERTS, SystemAlertsOSService, [OS_NOTIFICATION] as const),
	defineInjectableOSService(TOKENS.SYSTEM_ALERTS_CLEAR, SystemAlertsClearOSService, [OS_NOTIFICATION] as const),
	defineInjectableOSService(TOKENS.SYSTEM_ALERTS_EXPORT, SystemAlertsExportOSService, [OS_NOTIFICATION] as const),
	defineInjectableOSService(TOKENS.SYSTEM_ALERTS_STATS, SystemAlertsStatsOSService, [OS_NOTIFICATION] as const),
	defineInjectableOSService(TOKENS.SYSTEM_ALERTS_TOPICS, SystemAlertsTopicsOSService, [OS_NOTIFICATION] as const),
	defineInjectableOSService(TOKENS.SYSTEM_ALERTS_UNACKED, SystemAlertsUnackedOSService, [OS_NOTIFICATION] as const),
	defineInjectableOSService(TOKENS.SYSTEM_ALERTS_POLICY, SystemAlertsPolicyOSService, [OS_NOTIFICATION] as const),
	defineInjectableOSService(TOKENS.SYSTEM_ALERTS_TRENDS, SystemAlertsTrendsOSService, [OS_NOTIFICATION] as const),
	defineInjectableOSService(TOKENS.SYSTEM_ALERTS_SLO, SystemAlertsSLOOSService, [OS_NOTIFICATION] as const),
	defineInjectableOSService(TOKENS.SYSTEM_ALERTS_INCIDENTS, SystemAlertsIncidentsOSService, [OS_NOTIFICATION] as const),
	defineInjectableOSService(TOKENS.SYSTEM_ALERTS_DIGEST, SystemAlertsDigestOSService, [OS_NOTIFICATION] as const),
	defineInjectableOSService(TOKENS.SYSTEM_ALERTS_REPORT, SystemAlertsReportOSService, [OS_NOTIFICATION] as const),
	defineInjectableOSService(TOKENS.SYSTEM_ALERTS_REPORT_COMPACT, SystemAlertsReportCompactOSService, [OS_NOTIFICATION] as const),
	defineInjectableOSService(TOKENS.SYSTEM_ALERTS_FLAPPING, SystemAlertsFlappingOSService, [OS_NOTIFICATION] as const),
	defineInjectableOSService(TOKENS.SYSTEM_ALERTS_TIMELINE, SystemAlertsTimelineOSService, [OS_NOTIFICATION] as const),
	defineInjectableOSService(TOKENS.SYSTEM_ALERTS_HOTSPOTS, SystemAlertsHotspotsOSService, [OS_NOTIFICATION] as const),
	defineInjectableOSService(TOKENS.SYSTEM_ALERTS_RECOMMENDATIONS, SystemAlertsRecommendationsOSService, [OS_NOTIFICATION] as const),
	defineInjectableOSService(TOKENS.SYSTEM_ALERTS_FEED, SystemAlertsFeedOSService, [OS_NOTIFICATION] as const),
	defineInjectableOSService(TOKENS.SYSTEM_ALERTS_BACKLOG, SystemAlertsBacklogOSService, [OS_NOTIFICATION] as const),
	defineInjectableOSService(TOKENS.SYSTEM_ALERTS_BREACHES, SystemAlertsBreachesOSService, [OS_NOTIFICATION] as const),
	defineInjectableOSService(TOKENS.SYSTEM_ALERTS_HEALTH, SystemAlertsHealthOSService, [OS_NOTIFICATION] as const),
	defineInjectableOSService(TOKENS.SYSTEM_ALERTS_AUTO_REMEDIATE_PLAN, SystemAlertsAutoRemediatePlanOSService, [OS_NOTIFICATION, OS_SCHEDULER, OS_NET] as const),
	defineInjectableOSService(TOKENS.SYSTEM_ALERTS_AUTO_REMEDIATE_EXECUTE, SystemAlertsAutoRemediateExecuteOSService, [OS_NOTIFICATION, OS_SCHEDULER, OS_NET] as const),
	defineInjectableOSService(TOKENS.SYSTEM_ALERTS_AUTO_REMEDIATE_AUDIT, SystemAlertsAutoRemediateAuditOSService, [] as const),
	defineInjectableOSService(TOKENS.SYSTEM_SLO, SystemSLOOSService, [OS_KERNEL, OS_NOTIFICATION] as const),
	defineInjectableOSService(TOKENS.SYSTEM_SLO_RULES_UPSERT, SystemSLORulesUpsertOSService, [] as const),
	defineInjectableOSService(TOKENS.SYSTEM_SLO_RULES_LIST, SystemSLORulesListOSService, [] as const),
	defineInjectableOSService(TOKENS.SYSTEM_SLO_RULES_EVALUATE, SystemSLORulesEvaluateOSService, [OS_KERNEL, OS_NOTIFICATION] as const),
] as const;
