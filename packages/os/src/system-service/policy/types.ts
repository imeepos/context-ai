import type { LLMOSKernel } from "../types.js";
import type { PolicyInput } from "../../types/os.js";

export interface SystemPolicyResponse {
	policy: ReturnType<LLMOSKernel["policy"]["getSnapshot"]>;
}

export interface SystemPolicyEvaluateRequest {
	path?: string;
	command?: string;
	url?: string;
	method?: string;
	requiredPermissions?: string[];
}

export interface SystemPolicyEvaluateResponse {
	allowed: boolean;
	reason?: string;
}

export interface SystemPolicyUpdateRequest {
	patch: Partial<ReturnType<LLMOSKernel["policy"]["getSnapshot"]>>;
	createVersionLabel?: string;
}

export interface SystemPolicyVersionCreateResponse {
	versionId: string;
	createdAt: string;
	label?: string;
}

export interface SystemPolicyVersionListResponse {
	versions: ReturnType<LLMOSKernel["policy"]["listVersions"]>;
}

export interface SystemPolicyVersionRollbackResponse {
	rolledBack: boolean;
	policy: ReturnType<LLMOSKernel["policy"]["getSnapshot"]>;
}

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
