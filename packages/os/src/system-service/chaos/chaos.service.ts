import type { LLMOSKernel, NotificationService, SchedulerService, SLOThresholdRule, TenantQuotaPolicyRule } from "../types.js";
import type { OSService } from "../../types/os.js";
import * as TOKENS from "../../tokens.js";
import { OSError } from "../../kernel/errors.js";

export interface SystemChaosRunRequest {
	scenario: "policy_denied" | "scheduler_failure" | "alert_storm" | "scheduler_replay";
}

export interface SystemChaosRunResponse {
	scenario: SystemChaosRunRequest["scenario"];
	passed: boolean;
	details: Record<string, unknown>;
}

export function createSystemChaosRunService(
	kernel: LLMOSKernel,
	notificationService: NotificationService,
	schedulerService: SchedulerService,
): OSService<SystemChaosRunRequest, SystemChaosRunResponse> {
	return {
		name: TOKENS.SYSTEM_CHAOS_RUN,
		requiredPermissions: ["system:write"],
		execute: async (req) => {
			if (req.scenario === "policy_denied") {
				const decision = kernel.policy.evaluate(
					{
						command: "rm -rf /",
					},
					{
						appId: "chaos",
						sessionId: "chaos",
						permissions: [],
						workingDirectory: process.cwd(),
					},
				);
				return {
					scenario: req.scenario,
					passed: !decision.allowed,
					details: {
						decision,
					},
				};
			}
			if (req.scenario === "scheduler_failure") {
				const id = `chaos-${Date.now()}`;
				schedulerService.scheduleRetryable(
					id,
					async () => {
						throw new OSError("E_SERVICE_EXECUTION", "chaos-failure");
					},
					{ maxRetries: 0, backoffMs: 1 },
				);
				await new Promise((resolve) => setTimeout(resolve, 5));
				const failures = schedulerService.listFailures(5).filter((item) => item.id === id);
				return {
					scenario: req.scenario,
					passed: failures.length > 0,
					details: {
						failures,
					},
				};
			}
			if (req.scenario === "scheduler_replay") {
				const id = `chaos-replay-${Date.now()}`;
				schedulerService.scheduleRetryable(
					id,
					async () => {
						throw new OSError("E_SERVICE_EXECUTION", "chaos-replay-failure");
					},
					{ maxRetries: 0, backoffMs: 1 },
				);
				await new Promise((resolve) => setTimeout(resolve, 5));
				const replayed = schedulerService.replayFailure(id);
				return {
					scenario: req.scenario,
					passed: replayed,
					details: {
						replayed,
					},
				};
			}
			// alert_storm scenario
			const before = notificationService.getStats();
			notificationService.send({ topic: "system.alert", message: "chaos-a", severity: "critical" });
			notificationService.send({ topic: "system.alert", message: "chaos-b", severity: "critical" });
			const after = notificationService.getStats();
			return {
				scenario: req.scenario,
				passed: after.sent >= before.sent,
				details: {
					before,
					after,
				},
			};
		},
	};
}

const chaosBaselines = new Map<
	string,
	{
		capturedAt: string;
		total: number;
		failure: number;
		errorRate: number;
	}
>();

export function createSystemChaosBaselineCaptureService(
	kernel: LLMOSKernel,
): OSService<
	{
		name: string;
	},
	{
		name: string;
		baseline: {
			capturedAt: string;
			total: number;
			failure: number;
			errorRate: number;
		};
	}
> {
	return {
		name: TOKENS.SYSTEM_CHAOS_BASELINE_CAPTURE,
		requiredPermissions: ["system:write"],
		execute: async (req) => {
			const metrics = kernel.metrics.allSnapshots();
			const total = metrics.reduce((sum, item) => sum + item.total, 0);
			const failure = metrics.reduce((sum, item) => sum + item.failure, 0);
			const baseline = {
				capturedAt: new Date().toISOString(),
				total,
				failure,
				errorRate: total === 0 ? 0 : failure / total,
			};
			chaosBaselines.set(req.name, baseline);
			return {
				name: req.name,
				baseline,
			};
		},
	};
}

export function createSystemChaosBaselineVerifyService(
	kernel: LLMOSKernel,
): OSService<
	{
		name: string;
		maxErrorRateDelta?: number;
		maxFailureDelta?: number;
	},
	{
		name: string;
		passed: boolean;
		reason?: string;
		current: {
			total: number;
			failure: number;
			errorRate: number;
		};
		baseline?: {
			capturedAt: string;
			total: number;
			failure: number;
			errorRate: number;
		};
	}
> {
	return {
		name: TOKENS.SYSTEM_CHAOS_BASELINE_VERIFY,
		requiredPermissions: ["system:read"],
		execute: async (req) => {
			const baseline = chaosBaselines.get(req.name);
			const metrics = kernel.metrics.allSnapshots();
			const total = metrics.reduce((sum, item) => sum + item.total, 0);
			const failure = metrics.reduce((sum, item) => sum + item.failure, 0);
			const current = {
				total,
				failure,
				errorRate: total === 0 ? 0 : failure / total,
			};
			if (!baseline) {
				return {
					name: req.name,
					passed: false,
					reason: "baseline_not_found",
					current,
				};
			}
			const maxErrorRateDelta = req.maxErrorRateDelta ?? 0.05;
			const maxFailureDelta = req.maxFailureDelta ?? 10;
			const errorRateDelta = current.errorRate - baseline.errorRate;
			const failureDelta = current.failure - baseline.failure;
			const passed = errorRateDelta <= maxErrorRateDelta && failureDelta <= maxFailureDelta;
			return {
				name: req.name,
				passed,
				reason: passed ? undefined : "baseline_regression",
				current,
				baseline,
			};
		},
	};
}

// Governance state management
interface AuditKeyRecord {
	keyId: string;
	secret: string;
	createdAt: string;
}

const auditSigningKeys = new Map<string, AuditKeyRecord>();
let activeAuditSigningKeyId = "default";

const sloRules = new Map<string, SLOThresholdRule>();
const quotaPolicies = new Map<string, TenantQuotaPolicyRule>();

export interface GovernanceStateSnapshot {
	sloRules: SLOThresholdRule[];
	quotaPolicies: TenantQuotaPolicyRule[];
	auditKeys: Array<{ keyId: string; secret: string; createdAt: string }>;
	activeAuditKeyId: string;
	chaosBaselines: Array<{
		name: string;
		capturedAt: string;
		total: number;
		failure: number;
		errorRate: number;
	}>;
}

function exportGovernanceState(): GovernanceStateSnapshot {
	return {
		sloRules: [...sloRules.values()],
		quotaPolicies: [...quotaPolicies.values()],
		auditKeys: [...auditSigningKeys.values()].map((item) => ({
			keyId: item.keyId,
			secret: item.secret,
			createdAt: item.createdAt,
		})),
		activeAuditKeyId: activeAuditSigningKeyId,
		chaosBaselines: [...chaosBaselines.entries()].map(([name, baseline]) => ({
			name,
			capturedAt: baseline.capturedAt,
			total: baseline.total,
			failure: baseline.failure,
			errorRate: baseline.errorRate,
		})),
	};
}

function importGovernanceState(snapshot: GovernanceStateSnapshot): void {
	sloRules.clear();
	for (const rule of snapshot.sloRules ?? []) {
		sloRules.set(rule.id, rule);
	}
	quotaPolicies.clear();
	for (const policy of snapshot.quotaPolicies ?? []) {
		quotaPolicies.set(policy.id, policy);
	}
	auditSigningKeys.clear();
	for (const key of snapshot.auditKeys ?? []) {
		auditSigningKeys.set(key.keyId, {
			keyId: key.keyId,
			secret: key.secret,
			createdAt: key.createdAt,
		});
	}
	if (!auditSigningKeys.has("default")) {
		auditSigningKeys.set("default", {
			keyId: "default",
			secret: "audit-export-secret",
			createdAt: new Date().toISOString(),
		});
	}
	activeAuditSigningKeyId = snapshot.activeAuditKeyId && auditSigningKeys.has(snapshot.activeAuditKeyId)
		? snapshot.activeAuditKeyId
		: "default";
	chaosBaselines.clear();
	for (const baseline of snapshot.chaosBaselines ?? []) {
		chaosBaselines.set(baseline.name, {
			capturedAt: baseline.capturedAt,
			total: baseline.total,
			failure: baseline.failure,
			errorRate: baseline.errorRate,
		});
	}
}

export function createSystemGovernanceStateExportService(): OSService<
	Record<string, never>,
	{ state: GovernanceStateSnapshot }
> {
	return {
		name: "system.governance.state.export" as const,
		requiredPermissions: ["system:read"],
		execute: async () => ({
			state: exportGovernanceState(),
		}),
	};
}

export function createSystemGovernanceStateImportService(): OSService<
	{ state: GovernanceStateSnapshot },
	{ imported: true }
> {
	return {
		name: "system.governance.state.import" as const,
		requiredPermissions: ["system:write"],
		execute: async (req) => {
			importGovernanceState(req.state);
			return { imported: true };
		},
	};
}

export function createSystemGovernanceStatePersistService(
	store: {
		set(key: string, value: unknown): void;
	},
	key = "system.governance.state",
): OSService<Record<string, never>, { persisted: true }> {
	return {
		name: "system.governance.state.persist" as const,
		requiredPermissions: ["system:write"],
		execute: async () => {
			store.set(key, exportGovernanceState() as unknown as Record<string, unknown>);
			return { persisted: true };
		},
	};
}

export function createSystemGovernanceStateRecoverService(
	store: {
		get(key: string): unknown;
	},
	key = "system.governance.state",
): OSService<Record<string, never>, { recovered: boolean }> {
	return {
		name: "system.governance.state.recover" as const,
		requiredPermissions: ["system:write"],
		execute: async () => {
			const raw = store.get(key);
			if (!raw || typeof raw !== "object") {
				return { recovered: false };
			}
			importGovernanceState(raw as GovernanceStateSnapshot);
			return { recovered: true };
		},
	};
}

export { chaosBaselines, sloRules, quotaPolicies, auditSigningKeys, activeAuditSigningKeyId };
