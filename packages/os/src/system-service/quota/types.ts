import type { TenantQuotaPolicyRule } from "../types.js";

export interface SystemQuotaRequest {
    tenantId: string;
}

export interface SystemQuotaResponse {
    tenantId: string;
    quota?: { maxToolCalls: number; maxTokens: number };
    usage: { toolCalls: number; tokens: number };
}

export interface SystemQuotaAdjustRequest {
    tenantId: string;
    loadFactor: number;
    priority: "low" | "normal" | "high";
}

export interface SystemQuotaAdjustResponse {
    tenantId: string;
    quota?: { maxToolCalls: number; maxTokens: number };
}

// Quota policy types
export interface SystemQuotaPolicyUpsertRequest {
    policy: TenantQuotaPolicyRule;
}

export interface SystemQuotaPolicyUpsertResponse {
    policy: TenantQuotaPolicyRule;
}

export interface SystemQuotaPolicyListRequest {}
export type SystemQuotaPolicyListResponse = { policies: TenantQuotaPolicyRule[] };

export interface SystemQuotaPolicyApplyRequest {
    tenantId: string;
    tier: "free" | "pro" | "enterprise";
    priority: "low" | "normal" | "high";
    loadFactor: number;
    hour?: number;
}

export interface SystemQuotaPolicyApplyResponse {
    matchedPolicyId?: string;
    quota?: { maxToolCalls: number; maxTokens: number };
}

// Hotspots types
export interface SystemQuotaHotspotsRequest {
    thresholdToolCalls: number;
    limit?: number;
}

export interface SystemQuotaHotspotsResponse {
    hotspots: Array<{ tenantId: string; toolCalls: number; tokens: number }>;
}

export interface SystemQuotaHotspotsIsolateRequest {
    thresholdToolCalls: number;
    reductionFactor?: number;
}

export interface SystemQuotaHotspotsIsolateResponse {
    isolated: Array<{
        tenantId: string;
        before?: { maxToolCalls: number; maxTokens: number };
        after?: { maxToolCalls: number; maxTokens: number };
    }>;
}

export type { TenantQuotaPolicyRule };
