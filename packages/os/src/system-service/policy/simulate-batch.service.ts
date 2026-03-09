import type { LLMOSKernel } from "../types.js";
import type { OSService, PolicyInput } from "../../types/os.js";
import * as TOKENS from "../../tokens.js";

export interface SystemPolicySimulateBatchRequest {
	inputs: PolicyInput[];
}

export interface SystemPolicySimulateBatchResponse {
	total: number;
	denied: number;
	decisions: Array<{
		allowed: boolean;
		reason?: string;
	}>;
	reasons: Record<string, number>;
}

export function createSystemPolicySimulateBatchService(
	kernel: LLMOSKernel,
): OSService<SystemPolicySimulateBatchRequest, SystemPolicySimulateBatchResponse> {
	return {
		name: TOKENS.SYSTEM_POLICY_SIMULATE_BATCH,
		requiredPermissions: ["system:read"],
		execute: async (req, ctx) => {
			const decisions = req.inputs.map((input) => kernel.policy.evaluate(input, ctx));
			const reasons: Record<string, number> = {};
			for (const decision of decisions) {
				if (!decision.allowed) {
					const key = decision.reason ?? "denied";
					reasons[key] = (reasons[key] ?? 0) + 1;
				}
			}
			const denied = decisions.filter((item) => !item.allowed).length;
			return {
				total: decisions.length,
				denied,
				decisions,
				reasons,
			};
		},
	};
}
