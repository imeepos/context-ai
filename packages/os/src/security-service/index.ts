import { createHmac, timingSafeEqual } from "node:crypto";
import { SECURITY_REDACT } from "../tokens.js";
import type { OSService } from "../types/os.js";

export class SecurityService {
	redactSecrets(input: string): string {
		return input
			.replace(/(api[_-]?key\s*[:=]\s*)([^\s]+)/gi, "$1***")
			.replace(/(token\s*[:=]\s*)([^\s]+)/gi, "$1***")
			.replace(/(password\s*[:=]\s*)([^\s]+)/gi, "$1***");
	}

	sign(payload: string, secret: string): string {
		return createHmac("sha256", secret).update(payload, "utf8").digest("hex");
	}

	verify(payload: string, secret: string, signature: string): boolean {
		const expected = this.sign(payload, secret);
		const expectedBuffer = Buffer.from(expected, "hex");
		const signatureBuffer = Buffer.from(signature, "hex");
		if (expectedBuffer.length !== signatureBuffer.length) {
			return false;
		}
		return timingSafeEqual(expectedBuffer, signatureBuffer);
	}
}

export interface RedactRequest {
	input: string;
}

export function createSecurityRedactService(securityService: SecurityService): OSService<RedactRequest, { output: string }> {
	return {
		name: SECURITY_REDACT,
		requiredPermissions: ["security:read"],
		execute: async (req) => ({ output: securityService.redactSecrets(req.input) }),
	};
}
