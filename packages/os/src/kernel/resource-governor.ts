import { OSError } from "./errors.js";
import type { OSContext } from "../types/os.js";

export interface ExecuteBudgetInput {
	serviceName: string;
	context: OSContext;
	request: unknown;
}

export interface ResourceGovernor {
	beforeExecute(input: ExecuteBudgetInput): Promise<void> | void;
}

export class CompositeResourceGovernor implements ResourceGovernor {
	constructor(private readonly governors: ResourceGovernor[]) {}

	async beforeExecute(input: ExecuteBudgetInput): Promise<void> {
		for (const governor of this.governors) {
			await governor.beforeExecute(input);
		}
	}
}

export class AppQuotaGovernor implements ResourceGovernor {
	constructor(
		private readonly consume: (appId: string, delta: { toolCalls: number; tokens: number }) => void,
	) {}

	beforeExecute(input: ExecuteBudgetInput): void {
		const approxTokens = Math.max(1, Math.ceil(JSON.stringify(input.request).length / 4));
		try {
			this.consume(input.context.appId, { toolCalls: 1, tokens: approxTokens });
		} catch (error) {
			throw new OSError("E_QUOTA_EXCEEDED", error instanceof Error ? error.message : String(error));
		}
	}
}

export class AppAuthorizationGovernor implements ResourceGovernor {
	constructor(
		private readonly hasApp: (appId: string) => boolean,
		private readonly hasPermission: (appId: string, permission: string) => boolean,
		private readonly isAppEnabled: (appId: string) => boolean = () => true,
		private readonly bypassServices: Set<string> = new Set([
			"app.install",
			"app.list",
			"app.state.set",
			"app.uninstall",
			"app.upgrade",
			"app.disable",
			"app.enable",
			"system.health",
		]),
	) {}

	beforeExecute(input: ExecuteBudgetInput): void {
		if (this.bypassServices.has(input.serviceName)) {
			return;
		}
		const appId = input.context.appId;
		if (!this.hasApp(appId)) {
			throw new OSError("E_APP_NOT_REGISTERED", `App not registered: ${appId}`);
		}
		if (!this.isAppEnabled(appId)) {
			throw new OSError("E_APP_NOT_REGISTERED", `App is disabled: ${appId}`);
		}
		for (const permission of input.context.permissions) {
			if (!this.hasPermission(appId, permission)) {
				throw new OSError(
					"E_APP_PERMISSION_MISMATCH",
					`App permission mismatch: ${appId} does not grant ${permission}`,
				);
			}
		}
	}
}

interface TenantQuota {
	maxToolCalls: number;
	maxTokens: number;
}

interface TenantUsage {
	toolCalls: number;
	tokens: number;
}

export class TenantQuotaGovernor implements ResourceGovernor {
	private readonly quotas = new Map<string, TenantQuota>();
	private readonly usage = new Map<string, TenantUsage>();

	setQuota(tenantId: string, quota: TenantQuota): void {
		this.quotas.set(tenantId, quota);
		if (!this.usage.has(tenantId)) {
			this.usage.set(tenantId, { toolCalls: 0, tokens: 0 });
		}
	}

	beforeExecute(input: ExecuteBudgetInput): void {
		const tenantId = input.context.tenantId;
		if (!tenantId) return;
		const quota = this.quotas.get(tenantId);
		if (!quota) return;
		const usage = this.usage.get(tenantId) ?? { toolCalls: 0, tokens: 0 };
		const approxTokens = Math.max(1, Math.ceil(JSON.stringify(input.request).length / 4));
		const next = {
			toolCalls: usage.toolCalls + 1,
			tokens: usage.tokens + approxTokens,
		};
		if (next.toolCalls > quota.maxToolCalls || next.tokens > quota.maxTokens) {
			throw new OSError("E_QUOTA_EXCEEDED", `Tenant quota exceeded: ${tenantId}`);
		}
		this.usage.set(tenantId, next);
	}

	getUsage(tenantId: string): TenantUsage {
		return this.usage.get(tenantId) ?? { toolCalls: 0, tokens: 0 };
	}

	getQuota(tenantId: string): TenantQuota | undefined {
		const quota = this.quotas.get(tenantId);
		if (!quota) return undefined;
		return { ...quota };
	}

	adjustQuota(
		tenantId: string,
		input: {
			loadFactor: number;
			priority: "low" | "normal" | "high";
		},
	): TenantQuota | undefined {
		const current = this.quotas.get(tenantId);
		if (!current) return undefined;
		const normalizedLoad = Math.max(0, input.loadFactor);
		const priorityMultiplier = input.priority === "high" ? 1.2 : input.priority === "low" ? 0.8 : 1;
		const pressureMultiplier = normalizedLoad >= 0.8 ? 0.75 : normalizedLoad <= 0.4 ? 1.1 : 1;
		const next: TenantQuota = {
			maxToolCalls: Math.max(1, Math.floor(current.maxToolCalls * priorityMultiplier * pressureMultiplier)),
			maxTokens: Math.max(100, Math.floor(current.maxTokens * priorityMultiplier * pressureMultiplier)),
		};
		this.quotas.set(tenantId, next);
		return { ...next };
	}
}
