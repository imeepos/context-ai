import type { NotificationPolicy, NotificationPolicyPatch } from "./types.js";

export class PolicyManager {
	private policy: NotificationPolicy;

	constructor(options: {
		dedupeWindowMs?: number;
		rateLimit?: { limit: number; windowMs: number };
		retentionLimit?: number;
	}) {
		this.policy = {
			dedupeWindowMs: options.dedupeWindowMs ?? 0,
			rateLimit: options.rateLimit,
			retentionLimit: options.retentionLimit,
		};
	}

	getPolicy(): NotificationPolicy {
		return {
			dedupeWindowMs: this.policy.dedupeWindowMs,
			rateLimit: this.policy.rateLimit,
			retentionLimit: this.policy.retentionLimit,
		};
	}

	updatePolicy(patch: NotificationPolicyPatch): NotificationPolicy {
		if (patch.dedupeWindowMs !== undefined && patch.dedupeWindowMs >= 0) {
			this.policy.dedupeWindowMs = patch.dedupeWindowMs;
		}
		if (patch.rateLimit !== undefined) {
			if (patch.rateLimit.limit > 0 && patch.rateLimit.windowMs > 0) {
				this.policy.rateLimit = patch.rateLimit;
			} else {
				this.policy.rateLimit = undefined;
			}
		}
		if (patch.retentionLimit !== undefined) {
			if (patch.retentionLimit > 0) {
				this.policy.retentionLimit = patch.retentionLimit;
			} else {
				this.policy.retentionLimit = undefined;
			}
		}
		return this.getPolicy();
	}

	get dedupeWindowMs(): number {
		return this.policy.dedupeWindowMs;
	}

	get rateLimit(): { limit: number; windowMs: number } | undefined {
		return this.policy.rateLimit;
	}

	get retentionLimit(): number | undefined {
		return this.policy.retentionLimit;
	}
}
