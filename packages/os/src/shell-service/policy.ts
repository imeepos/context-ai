import { OSError } from "../kernel/errors.js";
import type { PolicyEngine } from "../kernel/policy-engine.js";
import type { OSContext } from "../types/os.js";

export type ExecutionProfile = "standard" | "restricted" | "read-only";

const readOnlyDenyPatterns = [/\brm\b/i, /\bmv\b/i, /\bcp\b/i, /\bdel\b/i, />/];
const restrictedAllowPatterns = [/^echo\b/i, /^pwd\b/i, /^ls\b/i, /^dir\b/i, /^cat\b/i, /^type\b/i];

export class ShellPolicyGuard {
	constructor(private readonly policy: PolicyEngine) {}

	assertCommandAllowed(command: string, context: OSContext, profile: ExecutionProfile = "standard"): void {
		if (profile === "read-only" && readOnlyDenyPatterns.some((pattern) => pattern.test(command))) {
			throw new OSError("E_POLICY_DENIED", "Command denied by read-only profile");
		}
		if (profile === "restricted" && !restrictedAllowPatterns.some((pattern) => pattern.test(command.trim()))) {
			throw new OSError("E_POLICY_DENIED", "Command denied by restricted profile");
		}
		const decision = this.policy.evaluate({ command }, context);
		if (!decision.allowed) {
			throw new OSError("E_POLICY_DENIED", decision.reason ?? "Command denied by policy");
		}
	}
}
