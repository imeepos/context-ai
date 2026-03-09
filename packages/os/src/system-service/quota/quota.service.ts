import type { TenantQuotaGovernor } from "../types.js";
import type { OSService } from "../../types/os.js";
import * as TOKENS from "../../tokens.js";

export function createSystemQuotaService(
    tenantGovernor: TenantQuotaGovernor,
): OSService<{ tenantId: string }, { tenantId: string; quota?: { maxToolCalls: number; maxTokens: number }; usage: { toolCalls: number; tokens: number } }> {
    return {
        name: TOKENS.SYSTEM_QUOTA,
        requiredPermissions: ["system:read"],
        execute: async (req) => ({
            tenantId: req.tenantId,
            quota: tenantGovernor.getQuota(req.tenantId),
            usage: tenantGovernor.getUsage(req.tenantId),
        }),
    }
}

export function createSystemQuotaAdjustService(
    tenantGovernor: TenantQuotaGovernor
): OSService<
    {
        tenantId: string;
        loadFactor: number;
        priority: "low" | "normal" | "high";
    },
    {
        tenantId: string;
        quota?: { maxToolCalls: number; maxTokens: number }
    }
> {
    return {
        name: TOKENS.SYSTEM_QUOTA_ADJUST,
        requiredPermissions: ["system:write"],
        execute: async (req) => ({
            tenantId: req.tenantId,
            quota: tenantGovernor.adjustQuota(req.tenantId, {
                loadFactor: req.loadFactor,
                priority: req.priority,
            }),
        }),
    }
}

import type { TenantQuotaPolicyRule } from "../types.js";

const quotaPolicies = new Map<string, TenantQuotaPolicyRule>();

export function createSystemQuotaPolicyUpsertService(): OSService<
    { policy: TenantQuotaPolicyRule },
    { policy: TenantQuotaPolicyRule }
> {
    return {
        name: TOKENS.SYSTEM_QUOTA_POLICY_UPSERT,
        requiredPermissions: ["system:write"],
        execute: async (req) => {
            quotaPolicies.set(req.policy.id, req.policy)
            return { policy: req.policy }
        }
    }
}

export function createSystemQuotaPolicyListService(): OSService<Record<string, never>, { policies: TenantQuotaPolicyRule[] }> {
    return {
        name: TOKENS.SYSTEM_QUOTA_POLICY_LIST,
        requiredPermissions: ["system:read"],
        execute: async () => ({
            policies: [...quotaPolicies.values()],
        }),
    }
}

export function createSystemQuotaPolicyApplyService(
    tenantGovernor: TenantQuotaGovernor
): OSService<
    {
        tenantId: string;
        tier: "free" | "pro" | "enterprise";
        priority: "low" | "normal" | "high"
        loadFactor: number
        hour?: number
    },
    {
        matchedPolicyId?: string;
        quota?: {
            maxToolCalls: number;
            maxTokens: number
        }
    }
> {
    return {
        name: TOKENS.SYSTEM_QUOTA_POLICY_APPLY,
        requiredPermissions: ["system:write"],
        execute: async (req) => {
            const hour = req.hour ?? new Date().getHours()
            const matched = [...quotaPolicies.values()].find((policy) => {
                if (policy.tier !== req.tier) return false
                if (policy.priority !== req.priority) return false
                if (policy.loadMin !== undefined && req.loadFactor < policy.loadMin) return false
                if (policy.loadMax !== undefined && req.loadFactor > policy.loadMax) return false
                if (policy.hourStart !== undefined && hour < policy.hourStart) return false
                if (policy.hourEnd !== undefined && hour > policy.hourEnd) return false
                return true
            })
            if (!matched) {
                return {}
            }
            tenantGovernor.setQuota(req.tenantId, {
                maxToolCalls: matched.quota.maxToolCalls,
                maxTokens: matched.quota.maxTokens,
            })
            return {
                matchedPolicyId: matched.id,
                quota: tenantGovernor.getQuota(req.tenantId),
            }
        }
    }
}

export function createSystemQuotaHotspotsService(
    tenantGovernor: TenantQuotaGovernor
): OSService<
    {
        thresholdToolCalls: number
        limit?: number
    },
    {
        hotspots: Array<{ tenantId: string; toolCalls: number; tokens: number }>
    }
> {
    return {
        name: TOKENS.SYSTEM_QUOTA_HOTSPOTS,
        requiredPermissions: ["system:read"],
        execute: async (req) => {
            const thresholdToolCalls = req.thresholdToolCalls > 0 ? req.thresholdToolCalls : 10
            const limit = req.limit && req.limit > 0 ? req.limit : 10
            const hotspots = Object.entries(tenantGovernor.listUsage())
                .filter(([, usage]) => usage.toolCalls >= thresholdToolCalls)
                .map(([tenantId, usage]) => ({
                    tenantId,
                    toolCalls: usage.toolCalls,
                    tokens: usage.tokens,
                }))
                .sort((a, b) => b.toolCalls - a.toolCalls)
                .slice(0, limit)
            return { hotspots }
        },
    }
}

export function createSystemQuotaHotspotsIsolateService(
    tenantGovernor: TenantQuotaGovernor
): OSService<
    {
        thresholdToolCalls: number
        reductionFactor?: number
    },
    {
        isolated: Array<{
            tenantId: string
            before?: { maxToolCalls: number; maxTokens: number }
            after?: { maxToolCalls: number; maxTokens: number }
        }>
    }
> {
    return {
        name: TOKENS.SYSTEM_QUOTA_HOTSPOTS_ISOLATE,
        requiredPermissions: ["system:write"],
        execute: async (req) => {
            const reductionFactor = req.reductionFactor && req.reductionFactor > 0 ? req.reductionFactor : 0.5
            const thresholdToolCalls = req.thresholdToolCalls > 0 ? req.thresholdToolCalls : 10
            const usage = tenantGovernor.listUsage()
            const isolated: Array<{
                tenantId: string
                before?: { maxToolCalls: number; maxTokens: number }
                after?: { maxToolCalls: number; maxTokens: number }
            }> = []
            for (const [tenantId, currentUsage] of Object.entries(usage)) {
                if (currentUsage.toolCalls < thresholdToolCalls) continue
                const before = tenantGovernor.getQuota(tenantId)
                if (!before) continue
                tenantGovernor.setQuota(tenantId, {
                    maxToolCalls: Math.max(1, Math.floor(before.maxToolCalls * reductionFactor)),
                    maxTokens: Math.max(100, Math.floor(before.maxTokens * reductionFactor)),
                })
                isolated.push({
                    tenantId,
                    before,
                    after: tenantGovernor.getQuota(tenantId),
                })
            }
            return { isolated }
        },
    }
}
