import { OSError } from "../kernel/errors.js";

export interface AppQuota {
	maxToolCalls: number;
	maxTokens: number;
}

interface AppUsage {
	toolCalls: number;
	tokens: number;
}

export class AppQuotaManager {
	private readonly quotas = new Map<string, AppQuota>();
	private readonly usage = new Map<string, AppUsage>();

	setQuota(appId: string, quota: AppQuota): void {
		this.quotas.set(appId, quota);
		if (!this.usage.has(appId)) {
			this.usage.set(appId, { toolCalls: 0, tokens: 0 });
		}
	}

	consume(appId: string, delta: Partial<AppUsage>): void {
		const quota = this.quotas.get(appId);
		if (!quota) return;
		const current = this.usage.get(appId) ?? { toolCalls: 0, tokens: 0 };
		const next: AppUsage = {
			toolCalls: current.toolCalls + (delta.toolCalls ?? 0),
			tokens: current.tokens + (delta.tokens ?? 0),
		};
		if (next.toolCalls > quota.maxToolCalls) {
			throw new OSError("E_QUOTA_EXCEEDED", `Quota exceeded: toolCalls for ${appId}`);
		}
		if (next.tokens > quota.maxTokens) {
			throw new OSError("E_QUOTA_EXCEEDED", `Quota exceeded: tokens for ${appId}`);
		}
		this.usage.set(appId, next);
	}

	getUsage(appId: string): AppUsage {
		return this.usage.get(appId) ?? { toolCalls: 0, tokens: 0 };
	}

	reset(appId: string): void {
		this.usage.delete(appId);
		this.quotas.delete(appId);
	}
}
