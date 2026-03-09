import * as SystemService from "../../system-service/index.js";
import { token, type RequestOf, type ResponseOf } from "../shared.js";

// Quota Core Tokens
export const SYSTEM_QUOTA = token<RequestOf<typeof SystemService.createSystemQuotaService>, ResponseOf<typeof SystemService.createSystemQuotaService>, "system.quota">("system.quota");
export const SYSTEM_QUOTA_ADJUST = token<RequestOf<typeof SystemService.createSystemQuotaAdjustService>, ResponseOf<typeof SystemService.createSystemQuotaAdjustService>, "system.quota.adjust">("system.quota.adjust");

// Quota Policy Tokens
export const SYSTEM_QUOTA_POLICY_UPSERT = token<RequestOf<typeof SystemService.createSystemQuotaPolicyUpsertService>, ResponseOf<typeof SystemService.createSystemQuotaPolicyUpsertService>, "system.quota.policy.upsert">("system.quota.policy.upsert");
export const SYSTEM_QUOTA_POLICY_LIST = token<RequestOf<typeof SystemService.createSystemQuotaPolicyListService>, ResponseOf<typeof SystemService.createSystemQuotaPolicyListService>, "system.quota.policy.list">("system.quota.policy.list");
export const SYSTEM_QUOTA_POLICY_APPLY = token<RequestOf<typeof SystemService.createSystemQuotaPolicyApplyService>, ResponseOf<typeof SystemService.createSystemQuotaPolicyApplyService>, "system.quota.policy.apply">("system.quota.policy.apply");

// Quota Hotspots Tokens
export const SYSTEM_QUOTA_HOTSPOTS = token<RequestOf<typeof SystemService.createSystemQuotaHotspotsService>, ResponseOf<typeof SystemService.createSystemQuotaHotspotsService>, "system.quota.hotspots">("system.quota.hotspots");
export const SYSTEM_QUOTA_HOTSPOTS_ISOLATE = token<RequestOf<typeof SystemService.createSystemQuotaHotspotsIsolateService>, ResponseOf<typeof SystemService.createSystemQuotaHotspotsIsolateService>, "system.quota.hotspots.isolate">("system.quota.hotspots.isolate");
