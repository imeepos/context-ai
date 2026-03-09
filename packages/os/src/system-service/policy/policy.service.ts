import type { LLMOSKernel } from "../types.js";
import type { OSService } from "../../types/os.js";
import * as TOKENS from "../../tokens.js";

export interface SystemPolicyResponse {
	policy: ReturnType<LLMOSKernel["policy"]["getSnapshot"]>;
}

export function createSystemPolicyService(
	kernel: LLMOSKernel,
): OSService<Record<string, never>, SystemPolicyResponse> {
	return {
		name: TOKENS.SYSTEM_POLICY,
		requiredPermissions: ["system:read"],
		execute: async () => ({
			policy: kernel.policy.getSnapshot(),
		}),
	};
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

export function createSystemPolicyEvaluateService(
	kernel: LLMOSKernel,
): OSService<SystemPolicyEvaluateRequest, SystemPolicyEvaluateResponse> {
	return {
		name: TOKENS.SYSTEM_POLICY_EVALUATE,
		requiredPermissions: ["system:read"],
		execute: async (req, ctx) => {
			if (req.url) {
				const decision = kernel.policy.evaluateNetworkRequest(
					{
						url: req.url,
						method: req.method ?? "GET",
					},
					{
						...ctx,
						permissions: req.requiredPermissions ?? ctx.permissions,
					},
				);
				return decision;
			}
			return kernel.policy.evaluate(
				{
					path: req.path,
					command: req.command,
					requiredPermissions: req.requiredPermissions,
				},
				ctx,
			);
		},
	};
}

export interface SystemPolicyUpdateRequest {
	patch: Partial<ReturnType<LLMOSKernel["policy"]["getSnapshot"]>>;
	createVersionLabel?: string;
}

export function createSystemPolicyUpdateService(
	kernel: LLMOSKernel,
): OSService<SystemPolicyUpdateRequest, { policy: ReturnType<LLMOSKernel["policy"]["getSnapshot"]> }> {
	return {
		name: TOKENS.SYSTEM_POLICY_UPDATE,
		requiredPermissions: ["system:write"],
		execute: async (req) => {
			const policy = kernel.policy.updateRules(req.patch);
			if (req.createVersionLabel !== undefined) {
				kernel.policy.createVersion(req.createVersionLabel);
			}
			return { policy };
		},
	};
}

export function createSystemPolicyVersionCreateService(
	kernel: LLMOSKernel,
): OSService<{ label?: string }, { versionId: string; createdAt: string; label?: string }> {
	return {
		name: TOKENS.SYSTEM_POLICY_VERSION_CREATE,
		requiredPermissions: ["system:write"],
		execute: async (req) => {
			const version = kernel.policy.createVersion(req.label);
			return {
				versionId: version.versionId,
				createdAt: version.createdAt,
				label: version.label,
			};
		},
	};
}

export function createSystemPolicyVersionListService(
	kernel: LLMOSKernel,
): OSService<Record<string, never>, { versions: ReturnType<LLMOSKernel["policy"]["listVersions"]> }> {
	return {
		name: TOKENS.SYSTEM_POLICY_VERSION_LIST,
		requiredPermissions: ["system:read"],
		execute: async () => ({
			versions: kernel.policy.listVersions(),
		}),
	};
}

export function createSystemPolicyVersionRollbackService(
	kernel: LLMOSKernel,
): OSService<{ versionId: string }, { rolledBack: boolean; policy: ReturnType<LLMOSKernel["policy"]["getSnapshot"]> }> {
	return {
		name: TOKENS.SYSTEM_POLICY_VERSION_ROLLBACK,
		requiredPermissions: ["system:write"],
		execute: async (req) => ({
			rolledBack: kernel.policy.rollbackVersion(req.versionId),
			policy: kernel.policy.getSnapshot(),
		}),
	};
}
