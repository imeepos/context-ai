import { AppManager } from "../../app-manager/index.js";
import { createLLMOSKernel, type LLMOSKernel } from "../../kernel/index.js";
import { PolicyEngine } from "../../kernel/policy-engine.js";
import {
	AppAuthorizationGovernor,
	AppQuotaGovernor,
	CompositeResourceGovernor,
	TenantQuotaGovernor,
} from "../../kernel/resource-governor.js";
import type { PathPolicyRule } from "../../types/os.js";
import type { CreateDefaultLLMOSOptions } from "../../llm-os.types.js";

export interface OSRootServiceFoundation {
	pathPolicy: PathPolicyRule;
	appManager: AppManager;
	policy: PolicyEngine;
	tenantQuotaGovernor: TenantQuotaGovernor;
	resourceGovernor: CompositeResourceGovernor;
	kernel: LLMOSKernel;
}

export function createOSRootServiceFoundation(
	options: CreateDefaultLLMOSOptions = {},
): OSRootServiceFoundation {
	const pathPolicy = options.pathPolicy ?? { allow: [], deny: [] };
	const policy = new PolicyEngine({
		pathRule: pathPolicy,
	});
	const appManager = new AppManager();
	const tenantQuotaGovernor = new TenantQuotaGovernor();
	const resourceGovernor = new CompositeResourceGovernor([
		new AppAuthorizationGovernor(
			(appId) => appManager.registry.has(appId),
			(appId, permission) => appManager.permissions.has(appId, permission),
			(appId) => appManager.isEnabled(appId),
		),
		new AppQuotaGovernor((appId, delta) => appManager.quota.consume(appId, delta)),
		tenantQuotaGovernor,
	]);
	const kernel = createLLMOSKernel({ policyEngine: policy, resourceGovernor });

	return {
		pathPolicy,
		appManager,
		policy,
		tenantQuotaGovernor,
		resourceGovernor,
		kernel,
	};
}
