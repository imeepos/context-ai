import { resolve } from "node:path";
import type { CommandPolicyRule, NetworkPolicyRule, OSContext, PathPolicyRule, PolicyDecision, PolicyInput } from "../types/os.js";

interface PolicyEngineOptions {
	pathRule?: PathPolicyRule;
	commandRule?: CommandPolicyRule;
	networkRule?: NetworkPolicyRule;
}

export interface PolicyVersionRecord {
	versionId: string;
	createdAt: string;
	label?: string;
	snapshot: PolicySnapshot;
}

export interface PolicySnapshot {
	pathRule: PathPolicyRule;
	commandRule: {
		allowPatterns?: string[];
		denyPatterns: string[];
	};
	networkRule: NetworkPolicyRule;
}

function matchDomain(url: string): string {
	try {
		return new URL(url).hostname.toLowerCase();
	} catch {
		return "";
	}
}

function isPathAllowed(path: string, rule: PathPolicyRule): boolean {
	const absolute = resolve(path);
	if (rule.deny.some((prefix) => absolute.startsWith(resolve(prefix)))) {
		return false;
	}
	if (rule.allow.length === 0) {
		return true;
	}
	return rule.allow.some((prefix) => absolute.startsWith(resolve(prefix)));
}

function isCommandAllowed(command: string, rule: CommandPolicyRule): boolean {
	if (rule.denyPatterns.some((pattern) => pattern.test(command))) {
		return false;
	}
	if (!rule.allowPatterns || rule.allowPatterns.length === 0) {
		return true;
	}
	return rule.allowPatterns.some((pattern) => pattern.test(command));
}

function isNetworkAllowed(url: string, rule: NetworkPolicyRule): boolean {
	const hostname = matchDomain(url);
	if (!hostname) return false;
	if (rule.denyDomains?.some((domain) => hostname === domain || hostname.endsWith(`.${domain}`))) {
		return false;
	}
	if (!rule.allowDomains || rule.allowDomains.length === 0) {
		return true;
	}
	return rule.allowDomains.some((domain) => hostname === domain || hostname.endsWith(`.${domain}`));
}

export class PolicyEngine {
	private pathRule: PathPolicyRule;
	private commandRule: CommandPolicyRule;
	private networkRule: NetworkPolicyRule;
	private readonly networkRateUsage = new Map<string, number[]>();
	private readonly versions: PolicyVersionRecord[] = [];
	private versionSeq = 0;

	constructor(options: PolicyEngineOptions = {}) {
		this.pathRule = options.pathRule ?? { allow: [], deny: [] };
		this.commandRule = options.commandRule ?? {
			denyPatterns: [/rm\s+-rf\s+\/?/i, /shutdown/i, /reboot/i, /mkfs/i],
		};
		this.networkRule = options.networkRule ?? { denyDomains: [] };
		this.createVersion("bootstrap");
	}

	getSnapshot(): PolicySnapshot {
		return {
			pathRule: {
				allow: [...this.pathRule.allow],
				deny: [...this.pathRule.deny],
			},
			commandRule: {
				allowPatterns: this.commandRule.allowPatterns?.map((pattern) => pattern.source),
				denyPatterns: this.commandRule.denyPatterns.map((pattern) => pattern.source),
			},
			networkRule: {
				allowDomains: this.networkRule.allowDomains ? [...this.networkRule.allowDomains] : undefined,
				denyDomains: this.networkRule.denyDomains ? [...this.networkRule.denyDomains] : undefined,
				allowMethods: this.networkRule.allowMethods ? [...this.networkRule.allowMethods] : undefined,
				denyMethods: this.networkRule.denyMethods ? [...this.networkRule.denyMethods] : undefined,
				rateLimit: this.networkRule.rateLimit
					? {
							limit: this.networkRule.rateLimit.limit,
							windowMs: this.networkRule.rateLimit.windowMs,
						}
					: undefined,
			},
		};
	}

	updateRules(patch: Partial<PolicySnapshot>): PolicySnapshot {
		if (patch.pathRule) {
			this.pathRule = {
				allow: [...(patch.pathRule.allow ?? this.pathRule.allow)],
				deny: [...(patch.pathRule.deny ?? this.pathRule.deny)],
			};
		}
		if (patch.commandRule) {
			const allowPatterns =
				patch.commandRule.allowPatterns !== undefined
					? patch.commandRule.allowPatterns.map((pattern) => new RegExp(pattern))
					: this.commandRule.allowPatterns;
			const denyPatterns =
				patch.commandRule.denyPatterns !== undefined
					? patch.commandRule.denyPatterns.map((pattern) => new RegExp(pattern))
					: this.commandRule.denyPatterns;
			this.commandRule = {
				allowPatterns,
				denyPatterns,
			};
		}
		if (patch.networkRule) {
			this.networkRule = {
				allowDomains: patch.networkRule.allowDomains ?? this.networkRule.allowDomains,
				denyDomains: patch.networkRule.denyDomains ?? this.networkRule.denyDomains,
				allowMethods: patch.networkRule.allowMethods ?? this.networkRule.allowMethods,
				denyMethods: patch.networkRule.denyMethods ?? this.networkRule.denyMethods,
				rateLimit: patch.networkRule.rateLimit ?? this.networkRule.rateLimit,
			};
		}
		return this.getSnapshot();
	}

	createVersion(label?: string): PolicyVersionRecord {
		this.versionSeq += 1;
		const version: PolicyVersionRecord = {
			versionId: `pv-${this.versionSeq}`,
			createdAt: new Date().toISOString(),
			label,
			snapshot: this.getSnapshot(),
		};
		this.versions.push(version);
		return version;
	}

	listVersions(): PolicyVersionRecord[] {
		return this.versions.map((version) => ({
			...version,
			snapshot: {
				pathRule: {
					allow: [...version.snapshot.pathRule.allow],
					deny: [...version.snapshot.pathRule.deny],
				},
				commandRule: {
					allowPatterns: version.snapshot.commandRule.allowPatterns
						? [...version.snapshot.commandRule.allowPatterns]
						: undefined,
					denyPatterns: [...version.snapshot.commandRule.denyPatterns],
				},
				networkRule: {
					allowDomains: version.snapshot.networkRule.allowDomains
						? [...version.snapshot.networkRule.allowDomains]
						: undefined,
					denyDomains: version.snapshot.networkRule.denyDomains
						? [...version.snapshot.networkRule.denyDomains]
						: undefined,
					allowMethods: version.snapshot.networkRule.allowMethods
						? [...version.snapshot.networkRule.allowMethods]
						: undefined,
					denyMethods: version.snapshot.networkRule.denyMethods
						? [...version.snapshot.networkRule.denyMethods]
						: undefined,
					rateLimit: version.snapshot.networkRule.rateLimit
						? {
								limit: version.snapshot.networkRule.rateLimit.limit,
								windowMs: version.snapshot.networkRule.rateLimit.windowMs,
							}
						: undefined,
				},
			},
		}));
	}

	rollbackVersion(versionId: string): boolean {
		const version = this.versions.find((item) => item.versionId === versionId);
		if (!version) return false;
		this.updateRules(version.snapshot);
		this.createVersion(`rollback:${versionId}`);
		return true;
	}

	evaluate(input: PolicyInput, ctx: OSContext): PolicyDecision {
		const permissionCheck = this.checkPermissions(input.requiredPermissions ?? [], ctx.permissions);
		if (!permissionCheck.allowed) return permissionCheck;

		if (input.path && !isPathAllowed(input.path, this.pathRule)) {
			return { allowed: false, reason: `Path denied: ${input.path}` };
		}
		if (input.command && !isCommandAllowed(input.command, this.commandRule)) {
			return { allowed: false, reason: "Command denied by policy" };
		}
		if (input.url && !isNetworkAllowed(input.url, this.networkRule)) {
			return { allowed: false, reason: `Network target denied: ${input.url}` };
		}
		return { allowed: true };
	}

	evaluateNetworkRequest(input: { url: string; method: string }, ctx: OSContext): PolicyDecision {
		if (!isNetworkAllowed(input.url, this.networkRule)) {
			return { allowed: false, reason: `Network target denied: ${input.url}` };
		}
		const method = input.method.toUpperCase();
		if (this.networkRule.denyMethods?.some((m) => m.toUpperCase() === method)) {
			return { allowed: false, reason: `Network method denied: ${method}` };
		}
		if (this.networkRule.allowMethods && this.networkRule.allowMethods.length > 0) {
			const allowed = this.networkRule.allowMethods.some((m) => m.toUpperCase() === method);
			if (!allowed) {
				return { allowed: false, reason: `Network method denied: ${method}` };
			}
		}

		if (this.networkRule.rateLimit) {
			const now = Date.now();
			const key = `${ctx.appId}:${ctx.sessionId}`;
			const existing = this.networkRateUsage.get(key) ?? [];
			const inWindow = existing.filter((ts) => now - ts < this.networkRule.rateLimit!.windowMs);
			if (inWindow.length >= this.networkRule.rateLimit.limit) {
				return { allowed: false, reason: "Network rate limit exceeded" };
			}
			inWindow.push(now);
			this.networkRateUsage.set(key, inWindow);
		}

		return { allowed: true };
	}

	checkPermissions(required: string[], granted: string[]): PolicyDecision {
		const missing = required.filter((permission) => !granted.includes(permission));
		if (missing.length > 0) {
			return { allowed: false, reason: `Missing permissions: ${missing.join(",")}` };
		}
		return { allowed: true };
	}
}
