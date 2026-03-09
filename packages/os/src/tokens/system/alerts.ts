import * as SystemService from "../../system-service/index.js";
import { token, type RequestOf, type ResponseOf } from "../shared.js";

// Alerts Core Tokens
export const SYSTEM_ALERTS = token<RequestOf<typeof SystemService.createSystemAlertsService>, ResponseOf<typeof SystemService.createSystemAlertsService>, "system.alerts">("system.alerts");
export const SYSTEM_ALERTS_CLEAR = token<RequestOf<typeof SystemService.createSystemAlertsClearService>, ResponseOf<typeof SystemService.createSystemAlertsClearService>, "system.alerts.clear">("system.alerts.clear");
export const SYSTEM_ALERTS_EXPORT = token<RequestOf<typeof SystemService.createSystemAlertsExportService>, ResponseOf<typeof SystemService.createSystemAlertsExportService>, "system.alerts.export">("system.alerts.export");
export const SYSTEM_ALERTS_STATS = token<RequestOf<typeof SystemService.createSystemAlertsStatsService>, ResponseOf<typeof SystemService.createSystemAlertsStatsService>, "system.alerts.stats">("system.alerts.stats");
export const SYSTEM_ALERTS_TOPICS = token<RequestOf<typeof SystemService.createSystemAlertsTopicsService>, ResponseOf<typeof SystemService.createSystemAlertsTopicsService>, "system.alerts.topics">("system.alerts.topics");
export const SYSTEM_ALERTS_UNACKED = token<RequestOf<typeof SystemService.createSystemAlertsUnackedService>, ResponseOf<typeof SystemService.createSystemAlertsUnackedService>, "system.alerts.unacked">("system.alerts.unacked");
// Alerts Policy Token
export const SYSTEM_ALERTS_POLICY = token<RequestOf<typeof SystemService.createSystemAlertsPolicyService>, ResponseOf<typeof SystemService.createSystemAlertsPolicyService>, "system.alerts.policy">("system.alerts.policy");

// Alerts Analysis Tokens
export const SYSTEM_ALERTS_TRENDS = token<RequestOf<typeof SystemService.createSystemAlertsTrendsService>, ResponseOf<typeof SystemService.createSystemAlertsTrendsService>, "system.alerts.trends">("system.alerts.trends");
export const SYSTEM_ALERTS_SLO = token<RequestOf<typeof SystemService.createSystemAlertsSLOService>, ResponseOf<typeof SystemService.createSystemAlertsSLOService>, "system.alerts.slo">("system.alerts.slo");
export const SYSTEM_ALERTS_INCIDENTS = token<RequestOf<typeof SystemService.createSystemAlertsIncidentsService>, ResponseOf<typeof SystemService.createSystemAlertsIncidentsService>, "system.alerts.incidents">("system.alerts.incidents");
export const SYSTEM_ALERTS_DIGEST = token<RequestOf<typeof SystemService.createSystemAlertsDigestService>, ResponseOf<typeof SystemService.createSystemAlertsDigestService>, "system.alerts.digest">("system.alerts.digest");
export const SYSTEM_ALERTS_REPORT = token<RequestOf<typeof SystemService.createSystemAlertsReportService>, ResponseOf<typeof SystemService.createSystemAlertsReportService>, "system.alerts.report">("system.alerts.report");
export const SYSTEM_ALERTS_REPORT_COMPACT = token<RequestOf<typeof SystemService.createSystemAlertsReportCompactService>, ResponseOf<typeof SystemService.createSystemAlertsReportCompactService>, "system.alerts.report.compact">("system.alerts.report.compact");
export const SYSTEM_ALERTS_FLAPPING = token<RequestOf<typeof SystemService.createSystemAlertsFlappingService>, ResponseOf<typeof SystemService.createSystemAlertsFlappingService>, "system.alerts.flapping">("system.alerts.flapping");
export const SYSTEM_ALERTS_TIMELINE = token<RequestOf<typeof SystemService.createSystemAlertsTimelineService>, ResponseOf<typeof SystemService.createSystemAlertsTimelineService>, "system.alerts.timeline">("system.alerts.timeline");
export const SYSTEM_ALERTS_HOTSPOTS = token<RequestOf<typeof SystemService.createSystemAlertsHotspotsService>, ResponseOf<typeof SystemService.createSystemAlertsHotspotsService>, "system.alerts.hotspots">("system.alerts.hotspots");
export const SYSTEM_ALERTS_RECOMMENDATIONS = token<RequestOf<typeof SystemService.createSystemAlertsRecommendationsService>, ResponseOf<typeof SystemService.createSystemAlertsRecommendationsService>, "system.alerts.recommendations">("system.alerts.recommendations");

// Alerts Feed & Backlog Tokens
export const SYSTEM_ALERTS_FEED = token<RequestOf<typeof SystemService.createSystemAlertsFeedService>, ResponseOf<typeof SystemService.createSystemAlertsFeedService>, "system.alerts.feed">("system.alerts.feed");
export const SYSTEM_ALERTS_BACKLOG = token<RequestOf<typeof SystemService.createSystemAlertsBacklogService>, ResponseOf<typeof SystemService.createSystemAlertsBacklogService>, "system.alerts.backlog">("system.alerts.backlog");
export const SYSTEM_ALERTS_BREACHES = token<RequestOf<typeof SystemService.createSystemAlertsBreachesService>, ResponseOf<typeof SystemService.createSystemAlertsBreachesService>, "system.alerts.breaches">("system.alerts.breaches");
export const SYSTEM_ALERTS_HEALTH = token<RequestOf<typeof SystemService.createSystemAlertsHealthService>, ResponseOf<typeof SystemService.createSystemAlertsHealthService>, "system.alerts.health">("system.alerts.health");

// Auto-Remediation Tokens
export const SYSTEM_ALERTS_AUTO_REMEDIATE_PLAN = token<RequestOf<typeof SystemService.createSystemAlertsAutoRemediatePlanService>, ResponseOf<typeof SystemService.createSystemAlertsAutoRemediatePlanService>, "system.alerts.auto-remediate.plan">("system.alerts.auto-remediate.plan");
export const SYSTEM_ALERTS_AUTO_REMEDIATE_EXECUTE = token<RequestOf<typeof SystemService.createSystemAlertsAutoRemediateExecuteService>, ResponseOf<typeof SystemService.createSystemAlertsAutoRemediateExecuteService>, "system.alerts.auto-remediate.execute">("system.alerts.auto-remediate.execute");
export const SYSTEM_ALERTS_AUTO_REMEDIATE_AUDIT = token<RequestOf<typeof SystemService.createSystemAlertsAutoRemediateAuditService>, ResponseOf<typeof SystemService.createSystemAlertsAutoRemediateAuditService>, "system.alerts.auto-remediate.audit">("system.alerts.auto-remediate.audit");
