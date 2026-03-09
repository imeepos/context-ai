import type { LLMOSKernel } from "../kernel/index.js";
import type { NetService } from "../net-service/index.js";
import type { NotificationService, NotificationSeverity } from "../notification-service/index.js";
import type { SchedulerService } from "../scheduler-service/index.js";
import type { AppManager } from "../app-manager/index.js";
import type { AppManifestV1 } from "../app-manager/manifest.js";
import type { TenantQuotaGovernor } from "../kernel/resource-governor.js";
import type { SecurityService } from "../security-service/index.js";

// Re-export dependencies for convenience
export type {
	LLMOSKernel,
	NetService,
	NotificationService,
	NotificationSeverity,
	SchedulerService,
	AppManager,
	AppManifestV1,
	TenantQuotaGovernor,
	SecurityService,
};

// Shared types used across multiple domains
// NOTE: SystemAppRollbackState is defined in rollback/rollback.service.ts

// SLOThresholdRule is used by health/slo.service.ts and quota services

export interface SLOThresholdRule {
	id: string;
	metric: "global_success_rate" | "global_error_rate" | "alert_ack_p95_ms";
	operator: "gt" | "lt";
	threshold: number;
	severity: "warning" | "critical";
}

export interface TenantQuotaPolicyRule {
	id: string;
	tier: "free" | "pro" | "enterprise";
	priority: "low" | "normal" | "high";
	loadMin?: number;
	loadMax?: number;
	hourStart?: number;
	hourEnd?: number;
	quota: {
		maxToolCalls: number;
		maxTokens: number;
	};
}

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

export interface SystemAlertsAutoRemediateAction {
	id: string;
	type: "reset_net_circuit" | "replay_scheduler_failure" | "mute_topic";
	params: Record<string, unknown>;
	reason: string;
	rollback?: {
		type: "notification.unmute";
		params: Record<string, unknown>;
	};
}

export interface SystemAlertsAutoRemediateAuditRecord {
	id: string;
	timestamp: string;
	appId: string;
	sessionId: string;
	traceId?: string;
	approved: boolean;
	approver?: string;
	approvalExpiresAt?: string;
	dryRun: boolean;
	ticketId?: string;
	executed: number;
	results: Array<{
		id: string;
		ok: boolean;
		message: string;
		rollback?: SystemAlertsAutoRemediateAction["rollback"];
	}>;
}

// Key management types shared between errors and audit
export interface SigningKeyRecord {
	keyId: string;
	secret: string;
	createdAt: string;
}

// Utility function types
export interface FingerprintResult {
	stateHash: string;
	stateSizeBytes: number;
}
