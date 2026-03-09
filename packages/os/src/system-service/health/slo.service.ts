import type { LLMOSKernel, NotificationService, SLOThresholdRule } from "../types.js";
import type { OSService } from "../../types/os.js";
import * as TOKENS from "../../tokens.js";

// SLO Rules state (shared with governance)
const sloRules = new Map<string, SLOThresholdRule>();

export interface SystemSLORequest {
	services?: string[];
}

export interface SystemSLOResponse {
	global: {
		total: number;
		success: number;
		failure: number;
		successRate: number;
		errorRate: number;
		p95DurationMs: number;
	};
	services: ReturnType<LLMOSKernel["metrics"]["allSnapshots"]>;
	alerting: {
		ackedCount: number;
		p95AckLatencyMs: number;
	};
}

export function createSystemSLOService(
	kernel: LLMOSKernel,
	notificationService: NotificationService,
): OSService<SystemSLORequest, SystemSLOResponse> {
	return {
		name: TOKENS.SYSTEM_SLO,
		requiredPermissions: ["system:read"],
		execute: async (req) => {
			const serviceMetrics = kernel.metrics
				.allSnapshots()
				.filter((metric) => !req.services || req.services.includes(metric.service));
			const total = serviceMetrics.reduce((sum, item) => sum + item.total, 0);
			const success = serviceMetrics.reduce((sum, item) => sum + item.success, 0);
			const failure = serviceMetrics.reduce((sum, item) => sum + item.failure, 0);
			const p95DurationMs =
				serviceMetrics.length === 0 ? 0 : Math.max(...serviceMetrics.map((item) => item.p95DurationMs));
			const unacked = notificationService.query({ acknowledged: false });
			const acked = notificationService
				.query({})
				.filter((item) => item.acknowledged && item.ackedAt)
				.map((item) => Date.parse(item.ackedAt!) - Date.parse(item.timestamp))
				.filter((value) => Number.isFinite(value) && value >= 0)
				.sort((a, b) => a - b);
			const p95AckLatencyMs = acked.length === 0 ? 0 : acked[Math.max(0, Math.ceil(acked.length * 0.95) - 1)] ?? 0;
			return {
				global: {
					total,
					success,
					failure,
					successRate: total === 0 ? 1 : success / total,
					errorRate: total === 0 ? 0 : failure / total,
					p95DurationMs,
				},
				services: serviceMetrics,
				alerting: {
					ackedCount: unacked.length,
					p95AckLatencyMs,
				},
			};
		},
	};
}

export function createSystemSLORulesUpsertService(): OSService<{ rule: SLOThresholdRule }, { rule: SLOThresholdRule }> {
	return {
		name: TOKENS.SYSTEM_SLO_RULES_UPSERT,
		requiredPermissions: ["system:write"],
		execute: async (req) => {
			sloRules.set(req.rule.id, req.rule);
			return { rule: req.rule };
		},
	};
}

export function createSystemSLORulesListService(): OSService<Record<string, never>, { rules: SLOThresholdRule[] }> {
	return {
		name: TOKENS.SYSTEM_SLO_RULES_LIST,
		requiredPermissions: ["system:read"],
		execute: async () => ({
			rules: [...sloRules.values()],
		}),
	};
}

export function createSystemSLORulesEvaluateService(
	kernel: LLMOSKernel,
	notificationService: NotificationService,
): OSService<
	Record<string, never>,
	{
		breaches: Array<{
			ruleId: string;
			metric: SLOThresholdRule["metric"];
			value: number;
			threshold: number;
			severity: SLOThresholdRule["severity"];
		}>;
	}
> {
	return {
		name: TOKENS.SYSTEM_SLO_RULES_EVALUATE,
		requiredPermissions: ["system:read"],
		execute: async () => {
			const slo = await createSystemSLOService(kernel, notificationService).execute(
				{},
				{
					appId: "system",
					sessionId: "system",
					permissions: ["system:read"],
					workingDirectory: process.cwd(),
				},
			);
			const valueByMetric: Record<SLOThresholdRule["metric"], number> = {
				global_success_rate: slo.global.successRate,
				global_error_rate: slo.global.errorRate,
				alert_ack_p95_ms: slo.alerting.p95AckLatencyMs,
			};
			const breaches: Array<{
				ruleId: string;
				metric: SLOThresholdRule["metric"];
				value: number;
				threshold: number;
				severity: SLOThresholdRule["severity"];
			}> = [];
			for (const rule of sloRules.values()) {
				const value = valueByMetric[rule.metric];
				const matched = rule.operator === "gt" ? value > rule.threshold : value < rule.threshold;
				if (matched) {
					breaches.push({
						ruleId: rule.id,
						metric: rule.metric,
						value,
						threshold: rule.threshold,
						severity: rule.severity,
					});
				}
			}
			return { breaches };
		},
	};
}

// Export sloRules for governance module access
export { sloRules };
