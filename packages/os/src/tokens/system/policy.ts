import * as SystemService from "../../system-service/index.js";
import { token, type RequestOf, type ResponseOf } from "../shared.js";

// Policy Core Tokens
export const SYSTEM_POLICY = token<RequestOf<typeof SystemService.createSystemPolicyService>, ResponseOf<typeof SystemService.createSystemPolicyService>, "system.policy">("system.policy");
export const SYSTEM_POLICY_EVALUATE = token<RequestOf<typeof SystemService.createSystemPolicyEvaluateService>, ResponseOf<typeof SystemService.createSystemPolicyEvaluateService>, "system.policy.evaluate">("system.policy.evaluate");
export const SYSTEM_POLICY_UPDATE = token<RequestOf<typeof SystemService.createSystemPolicyUpdateService>, ResponseOf<typeof SystemService.createSystemPolicyUpdateService>, "system.policy.update">("system.policy.update");

// Policy Versioning Tokens
export const SYSTEM_POLICY_VERSION_CREATE = token<RequestOf<typeof SystemService.createSystemPolicyVersionCreateService>, ResponseOf<typeof SystemService.createSystemPolicyVersionCreateService>, "system.policy.version.create">("system.policy.version.create");
export const SYSTEM_POLICY_VERSION_LIST = token<RequestOf<typeof SystemService.createSystemPolicyVersionListService>, ResponseOf<typeof SystemService.createSystemPolicyVersionListService>, "system.policy.version.list">("system.policy.version.list");
export const SYSTEM_POLICY_VERSION_ROLLBACK = token<RequestOf<typeof SystemService.createSystemPolicyVersionRollbackService>, ResponseOf<typeof SystemService.createSystemPolicyVersionRollbackService>, "system.policy.version.rollback">("system.policy.version.rollback");

// Policy Advanced Tokens
export const SYSTEM_POLICY_SIMULATE_BATCH = token<RequestOf<typeof SystemService.createSystemPolicySimulateBatchService>, ResponseOf<typeof SystemService.createSystemPolicySimulateBatchService>, "system.policy.simulate.batch">("system.policy.simulate.batch");
export const SYSTEM_POLICY_GUARD_APPLY = token<RequestOf<typeof SystemService.createSystemPolicyGuardApplyService>, ResponseOf<typeof SystemService.createSystemPolicyGuardApplyService>, "system.policy.guard.apply">("system.policy.guard.apply");

// SLO Tokens
export const SYSTEM_SLO = token<RequestOf<typeof SystemService.createSystemSLOService>, ResponseOf<typeof SystemService.createSystemSLOService>, "system.slo">("system.slo");
export const SYSTEM_SLO_RULES_UPSERT = token<RequestOf<typeof SystemService.createSystemSLORulesUpsertService>, ResponseOf<typeof SystemService.createSystemSLORulesUpsertService>, "system.slo.rules.upsert">("system.slo.rules.upsert");
export const SYSTEM_SLO_RULES_LIST = token<RequestOf<typeof SystemService.createSystemSLORulesListService>, ResponseOf<typeof SystemService.createSystemSLORulesListService>, "system.slo.rules.list">("system.slo.rules.list");
export const SYSTEM_SLO_RULES_EVALUATE = token<RequestOf<typeof SystemService.createSystemSLORulesEvaluateService>, ResponseOf<typeof SystemService.createSystemSLORulesEvaluateService>, "system.slo.rules.evaluate">("system.slo.rules.evaluate");
