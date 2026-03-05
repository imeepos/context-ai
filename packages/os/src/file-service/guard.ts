import { resolve } from "node:path";
import { OSError } from "../kernel/errors.js";
import type { PolicyEngine } from "../kernel/policy-engine.js";
import type { OSContext } from "../types/os.js";

export class FileGuard {
	constructor(private readonly policy: PolicyEngine) {}

	assertPathAllowed(path: string, context: OSContext): void {
		const decision = this.policy.evaluate({ path: resolve(path) }, context);
		if (!decision.allowed) {
			throw new OSError("E_POLICY_DENIED", decision.reason ?? `Path denied: ${path}`);
		}
	}
}
