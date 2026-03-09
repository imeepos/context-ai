import type { OSService } from "../../types/os.js";
import { createOSServiceClass } from "../../os-service-class.js";
import { RUNTIME_TOOLS_VALIDATE, RUNTIME_RISK_CONFIRM } from "../../tokens.js";
import type { RuntimeToolsValidateRequest, RuntimeToolsValidateResponse, RuntimeRiskConfirmRequest, RuntimeRiskConfirmResponse } from "../types.js";
import type { AppManager } from "../manager.js";

export function validateRuntimeTools(
	manager: AppManager,
	req: RuntimeToolsValidateRequest,
): RuntimeToolsValidateResponse {
	const resolved = manager.routes.resolve(req.route);
	const manifest = manager.registry.get(resolved.appId);
	const grantedPermissions = new Set(manifest.permissions);
	const issues: string[] = [];
	const seen = new Set<string>();
	for (const tool of req.tools) {
		if (!tool.name?.trim()) {
			issues.push("tool.name is required");
		} else if (seen.has(tool.name)) {
			issues.push(`duplicate tool name: ${tool.name}`);
		} else {
			seen.add(tool.name);
		}
		if (tool.parameters !== undefined) {
			const isObjectSchema =
				typeof tool.parameters === "object" && tool.parameters !== null && !Array.isArray(tool.parameters);
			if (!isObjectSchema) {
				issues.push(`invalid parameters schema: ${tool.name || "unknown"}`);
			}
		}
		for (const permission of tool.requiredPermissions ?? []) {
			if (!grantedPermissions.has(permission)) {
				issues.push(`permission mismatch: ${tool.name || "unknown"} requires ${permission}`);
			}
		}
	}
	return {
		valid: issues.length === 0,
		issues,
	};
}

export const RuntimeToolsValidateOSService = createOSServiceClass(RUNTIME_TOOLS_VALIDATE, {
	requiredPermissions: ["app:read"],
	execute: ([manager]: [AppManager], req) => validateRuntimeTools(manager, req),
});

export function createRuntimeToolsValidateService(
	manager: AppManager,
): OSService<RuntimeToolsValidateRequest, RuntimeToolsValidateResponse> {
	return new RuntimeToolsValidateOSService(manager);
}

export function confirmRuntimeRisk(req: RuntimeRiskConfirmRequest): RuntimeRiskConfirmResponse {
	if (req.riskLevel === "low") {
		return { allowed: true };
	}
	if (!req.approved) {
		return { allowed: false, reason: "approval_required" };
	}
	if (!req.approver?.trim()) {
		return { allowed: false, reason: "approver_required" };
	}
	if (req.riskLevel === "high") {
		if (!req.approvalExpiresAt) {
			return { allowed: false, reason: "approval_expires_at_required" };
		}
		const expires = Date.parse(req.approvalExpiresAt);
		if (Number.isNaN(expires) || expires <= Date.now()) {
			return { allowed: false, reason: "approval_expired" };
		}
	}
	return { allowed: true };
}

export const RuntimeRiskConfirmOSService = createOSServiceClass(RUNTIME_RISK_CONFIRM, {
	requiredPermissions: ["app:read"],
	execute: (_dependencies: [], req) => confirmRuntimeRisk(req),
});

export function createRuntimeRiskConfirmService(): OSService<RuntimeRiskConfirmRequest, RuntimeRiskConfirmResponse> {
	return new RuntimeRiskConfirmOSService();
}
