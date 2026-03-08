import {
	createSystemPolicyEvaluateService,
	createSystemPolicyGuardApplyService,
	createSystemPolicyService,
	createSystemPolicySimulateBatchService,
	createSystemPolicyUpdateService,
	createSystemPolicyVersionCreateService,
	createSystemPolicyVersionListService,
	createSystemPolicyVersionRollbackService,
} from "../../system-service/index.js";
import * as TOKENS from "../../tokens.js";
import { OS_KERNEL } from "../tokens.js";
import { createDelegatingOSServiceClass } from "./delegating-service.js";
import { defineInjectableOSService } from "./definition.js";

export const SystemPolicyOSService = createDelegatingOSServiceClass(
	TOKENS.SYSTEM_POLICY,
	["system:read"],
	createSystemPolicyService,
);
export const SystemPolicyEvaluateOSService = createDelegatingOSServiceClass(
	TOKENS.SYSTEM_POLICY_EVALUATE,
	["system:read"],
	createSystemPolicyEvaluateService,
);
export const SystemPolicyUpdateOSService = createDelegatingOSServiceClass(
	TOKENS.SYSTEM_POLICY_UPDATE,
	["system:write"],
	createSystemPolicyUpdateService,
);
export const SystemPolicyVersionCreateOSService = createDelegatingOSServiceClass(
	TOKENS.SYSTEM_POLICY_VERSION_CREATE,
	["system:write"],
	createSystemPolicyVersionCreateService,
);
export const SystemPolicyVersionListOSService = createDelegatingOSServiceClass(
	TOKENS.SYSTEM_POLICY_VERSION_LIST,
	["system:read"],
	createSystemPolicyVersionListService,
);
export const SystemPolicyVersionRollbackOSService = createDelegatingOSServiceClass(
	TOKENS.SYSTEM_POLICY_VERSION_ROLLBACK,
	["system:write"],
	createSystemPolicyVersionRollbackService,
);
export const SystemPolicySimulateBatchOSService = createDelegatingOSServiceClass(
	TOKENS.SYSTEM_POLICY_SIMULATE_BATCH,
	["system:read"],
	createSystemPolicySimulateBatchService,
);
export const SystemPolicyGuardApplyOSService = createDelegatingOSServiceClass(
	TOKENS.SYSTEM_POLICY_GUARD_APPLY,
	["system:write"],
	createSystemPolicyGuardApplyService,
);

export const SYSTEM_POLICY_SERVICE_DEFINITIONS = [
	defineInjectableOSService(TOKENS.SYSTEM_POLICY, SystemPolicyOSService, [OS_KERNEL] as const),
	defineInjectableOSService(TOKENS.SYSTEM_POLICY_EVALUATE, SystemPolicyEvaluateOSService, [OS_KERNEL] as const),
	defineInjectableOSService(TOKENS.SYSTEM_POLICY_UPDATE, SystemPolicyUpdateOSService, [OS_KERNEL] as const),
	defineInjectableOSService(TOKENS.SYSTEM_POLICY_VERSION_CREATE, SystemPolicyVersionCreateOSService, [OS_KERNEL] as const),
	defineInjectableOSService(TOKENS.SYSTEM_POLICY_VERSION_LIST, SystemPolicyVersionListOSService, [OS_KERNEL] as const),
	defineInjectableOSService(TOKENS.SYSTEM_POLICY_VERSION_ROLLBACK, SystemPolicyVersionRollbackOSService, [OS_KERNEL] as const),
	defineInjectableOSService(TOKENS.SYSTEM_POLICY_SIMULATE_BATCH, SystemPolicySimulateBatchOSService, [OS_KERNEL] as const),
	defineInjectableOSService(TOKENS.SYSTEM_POLICY_GUARD_APPLY, SystemPolicyGuardApplyOSService, [OS_KERNEL] as const),
] as const;
