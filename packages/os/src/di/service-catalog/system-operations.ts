import {
	createSystemAuditExportService,
	createSystemChaosBaselineCaptureService,
	createSystemChaosBaselineVerifyService,
	createSystemChaosRunService,
	createSystemErrorsService,
	createSystemErrorsExportService,
	createSystemNetCircuitService,
	createSystemNetCircuitResetService,
	createSystemQuotaService,
	createSystemQuotaAdjustService,
	createSystemQuotaPolicyUpsertService,
	createSystemQuotaPolicyListService,
	createSystemQuotaPolicyApplyService,
	createSystemQuotaHotspotsService,
	createSystemQuotaHotspotsIsolateService,
	createSystemSchedulerFailuresService,
	createSystemSnapshotService,
} from "../../system-service/index.js";
import * as TOKENS from "../../tokens.js";
import type { LLMOSKernel } from "../../kernel/index.js";
import type { NetService } from "../../net-service/index.js";
import type { SchedulerService } from "../../scheduler-service/index.js";
import {
	 OS_KERNEL,
    OS_NET,
    OS_NOTIFICATION,
    OS_SCHEDULER,
    OS_SECURITY,
    OS_TENANT_QUOTA_GOVERNOR
} from "../tokens.js";
import { createDelegatingOSServiceClass } from "./delegating-service.js";
import { defineInjectableOSService } from "./definition.js";

export const SystemNetCircuitOSService = createDelegatingOSServiceClass(
    TOKENS.SYSTEM_NET_CIRCUIT,
    ["system:read"],
    createSystemNetCircuitService,
);
export const SystemNetCircuitResetOSService = createDelegatingOSServiceClass(
    TOKENS.SYSTEM_NET_CIRCUIT_RESET,
    ["system:read"],
    createSystemNetCircuitResetService,
);
export const SystemAuditExportOSService = createDelegatingOSServiceClass(
    TOKENS.SYSTEM_AUDIT_EXPORT,
    ["system:read"],
    createSystemAuditExportService,
);
export const SystemQuotaOSService = createDelegatingOSServiceClass(
    TOKENS.SYSTEM_QUOTA,
    ["system:read"],
    createSystemQuotaService,
);
export const SystemQuotaAdjustOSService = createDelegatingOSServiceClass(
    TOKENS.SYSTEM_QUOTA_ADJUST,
    ["system:write"],
    createSystemQuotaAdjustService,
);
export const SystemQuotaPolicyUpsertOSService = createDelegatingOSServiceClass(
    TOKENS.SYSTEM_QUOTA_POLICY_UPSERT,
    ["system:write"],
    createSystemQuotaPolicyUpsertService,
);
export const SystemQuotaPolicyListOSService = createDelegatingOSServiceClass(
    TOKENS.SYSTEM_QUOTA_POLICY_LIST,
    ["system:read"],
    createSystemQuotaPolicyListService,
);
export const SystemQuotaPolicyApplyOSService = createDelegatingOSServiceClass(
    TOKENS.SYSTEM_QUOTA_POLICY_APPLY,
    ["system:write"],
    createSystemQuotaPolicyApplyService,
);
export const SystemQuotaHotspotsOSService = createDelegatingOSServiceClass(
    TOKENS.SYSTEM_QUOTA_HOTSPOTS,
    ["system:read"],
    createSystemQuotaHotspotsService,
);
export const SystemQuotaHotspotsIsolateOSService = createDelegatingOSServiceClass(
    TOKENS.SYSTEM_QUOTA_HOTSPOTS_ISOLATE,
    ["system:write"],
    createSystemQuotaHotspotsIsolateService,
);
export const SystemChaosRunOSService = createDelegatingOSServiceClass(
    TOKENS.SYSTEM_CHAOS_RUN,
    ["system:write"],
    createSystemChaosRunService,
);
export const SystemChaosBaselineCaptureOSService = createDelegatingOSServiceClass(
    TOKENS.SYSTEM_CHAOS_BASELINE_CAPTURE,
    ["system:write"],
    createSystemChaosBaselineCaptureService,
);
export const SystemChaosBaselineVerifyOSService = createDelegatingOSServiceClass(
    TOKENS.SYSTEM_CHAOS_BASELINE_VERIFY,
    ["system:read"],
    createSystemChaosBaselineVerifyService,
);
export const SystemSnapshotOSService = createDelegatingOSServiceClass(
    TOKENS.SYSTEM_SNAPSHOT,
    ["system:read"],
    (kernel: LLMOSKernel, netService: NetService, schedulerService: SchedulerService) =>
        createSystemSnapshotService(kernel, { netService, schedulerService }),
);
export const SystemErrorsOSService = createDelegatingOSServiceClass(
    TOKENS.SYSTEM_ERRORS,
    ["system:read"],
    createSystemErrorsService,
);
export const SystemErrorsExportOSService = createDelegatingOSServiceClass(
    TOKENS.SYSTEM_ERRORS_EXPORT,
    ["system:read"],
    createSystemErrorsExportService,
);
export const SystemSchedulerFailuresOSService = createDelegatingOSServiceClass(
    TOKENS.SYSTEM_SCHEDULER_FAILURES,
    ["system:read"],
    createSystemSchedulerFailuresService,
);

export const SYSTEM_OPERATIONS_SERVICE_DEFINITIONS = [
    defineInjectableOSService(TOKENS.SYSTEM_NET_CIRCUIT, SystemNetCircuitOSService, [OS_NET] as const),
    defineInjectableOSService(TOKENS.SYSTEM_NET_CIRCUIT_RESET, SystemNetCircuitResetOSService, [OS_NET] as const),
    defineInjectableOSService(TOKENS.SYSTEM_SCHEDULER_FAILURES, SystemSchedulerFailuresOSService, [OS_SCHEDULER] as const),
    defineInjectableOSService(TOKENS.SYSTEM_AUDIT_EXPORT, SystemAuditExportOSService, [OS_KERNEL, OS_SECURITY] as const),
    defineInjectableOSService(TOKENS.SYSTEM_QUOTA, SystemQuotaOSService, [OS_TENANT_QUOTA_GOVERNOR] as const),
    defineInjectableOSService(TOKENS.SYSTEM_QUOTA_ADJUST, SystemQuotaAdjustOSService, [OS_TENANT_QUOTA_GOVERNOR] as const),
    defineInjectableOSService(TOKENS.SYSTEM_QUOTA_POLICY_UPSERT, SystemQuotaPolicyUpsertOSService, [] as const),
    defineInjectableOSService(TOKENS.SYSTEM_QUOTA_POLICY_LIST, SystemQuotaPolicyListOSService, [] as const),
    defineInjectableOSService(TOKENS.SYSTEM_QUOTA_POLICY_APPLY, SystemQuotaPolicyApplyOSService, [OS_TENANT_QUOTA_GOVERNOR] as const),
    defineInjectableOSService(TOKENS.SYSTEM_QUOTA_HOTSPOTS, SystemQuotaHotspotsOSService, [OS_TENANT_QUOTA_GOVERNOR] as const),
    defineInjectableOSService(TOKENS.SYSTEM_QUOTA_HOTSPOTS_ISOLATE, SystemQuotaHotspotsIsolateOSService, [OS_TENANT_QUOTA_GOVERNOR] as const),
    defineInjectableOSService(TOKENS.SYSTEM_CHAOS_RUN, SystemChaosRunOSService, [OS_KERNEL, OS_NOTIFICATION, OS_SCHEDULER] as const),
    defineInjectableOSService(TOKENS.SYSTEM_CHAOS_BASELINE_CAPTURE, SystemChaosBaselineCaptureOSService, [OS_KERNEL] as const),
    defineInjectableOSService(TOKENS.SYSTEM_CHAOS_BASELINE_VERIFY, SystemChaosBaselineVerifyOSService, [OS_KERNEL] as const),
    defineInjectableOSService(TOKENS.SYSTEM_SNAPSHOT, SystemSnapshotOSService, [OS_KERNEL, OS_NET, OS_SCHEDULER] as const),
    defineInjectableOSService(TOKENS.SYSTEM_ERRORS, SystemErrorsOSService, [OS_KERNEL] as const),
    defineInjectableOSService(TOKENS.SYSTEM_ERRORS_EXPORT, SystemErrorsExportOSService, [OS_KERNEL, OS_SECURITY] as const),
] as const;