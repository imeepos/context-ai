import type { LLMOSKernel } from "../types.js";
import type { OSService, PolicyInput } from "../../types/os.js";
import * as TOKENS from "../../tokens.js";
import { createSystemPolicySimulateBatchService } from "./simulate-batch.service.js";
import type { SystemPolicySimulateBatchResponse } from "./types.js";

export interface SystemPolicyGuardApplyRequest {
	patch: Partial<ReturnType<LLMOSKernel["policy"]["getSnapshot"]>>;
	simulationInputs?: PolicyInput[];
	requireAllSimulationsAllowed?: boolean;
	healthCheck?: {
		service?: string;
		maxErrorRate?: number;
		minSuccessRate?: number;
	};
}

export interface SystemPolicyGuardApplyResponse {
	applied: boolean;
	rolledBack: boolean;
	reason?: "simulation_denied" | "health_check_failed";
	simulation?: SystemPolicySimulateBatchResponse;
	policy: ReturnType<LLMOSKernel["policy"]["getSnapshot"]>;
}

export function createSystemPolicyGuardApplyService(
	kernel: LLMOSKernel,
): OSService<SystemPolicyGuardApplyRequest, SystemPolicyGuardApplyResponse> {
	return {
		name: TOKENS.SYSTEM_POLICY_GUARD_APPLY,
		requiredPermissions: ["system:write"],
		execute: async (req, ctx) => {
			let simulation: SystemPolicySimulateBatchResponse | undefined;
			if (req.simulationInputs && req.simulationInputs.length > 0) {
				simulation = await createSystemPolicySimulateBatchService(kernel).execute(
					{
						inputs: req.simulationInputs,
					},
					ctx,
				);
				if (req.requireAllSimulationsAllowed && simulation.denied > 0) {
					return {
						applied: false,
						rolledBack: false,
						reason: "simulation_denied",
						simulation,
						policy: kernel.policy.getSnapshot(),
					};
				}
			}

			const preVersion = kernel.policy.createVersion("guard:pre-apply");
			kernel.policy.updateRules(req.patch);

			if (req.healthCheck !== undefined) {
				const snapshots = kernel.metrics.allSnapshots();
				const healthCheck = req.healthCheck;
				const target = healthCheck.service
					? snapshots.filter((item) => item.service === healthCheck.service)
					: snapshots;
				const total = target.reduce((sum, item) => sum + item.total, 0);
				const success = target.reduce((sum, item) => sum + item.success, 0);
				const failure = target.reduce((sum, item) => sum + item.failure, 0);
				const successRate = total === 0 ? 1 : success / total;
				const errorRate = total === 0 ? 0 : failure / total;
				const failedBySuccess =
					req.healthCheck.minSuccessRate !== undefined && successRate < req.healthCheck.minSuccessRate;
				const failedByError =
					req.healthCheck.maxErrorRate !== undefined && errorRate > req.healthCheck.maxErrorRate;
				if (failedBySuccess || failedByError) {
					kernel.policy.rollbackVersion(preVersion.versionId);
					return {
						applied: false,
						rolledBack: true,
						reason: "health_check_failed",
						simulation,
						policy: kernel.policy.getSnapshot(),
					};
				}
			}

			kernel.policy.createVersion("guard:applied");
			return {
				applied: true,
				rolledBack: false,
				simulation,
				policy: kernel.policy.getSnapshot(),
			}
		},
	};
}
