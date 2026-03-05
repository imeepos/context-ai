import { OSError } from "../kernel/errors.js";
import type { PolicyEngine } from "../kernel/policy-engine.js";
import type { OSContext, OSService } from "../types/os.js";
import type { SecurityService } from "../security-service/index.js";

export interface NetRequest {
	url: string;
	method?: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
	headers?: Record<string, string>;
	body?: string;
	timeoutMs?: number;
	retries?: number;
}

export interface NetResponse {
	status: number;
	body: string;
	headers: Record<string, string>;
}

export interface NetJournalEntry {
	url: string;
	method: string;
	status?: number;
	success: boolean;
	appId: string;
	sessionId: string;
	error?: string;
	timestamp: string;
}

export class NetService {
	constructor(
		private readonly policy: PolicyEngine,
		private readonly security: SecurityService,
		private readonly journal?: (entry: NetJournalEntry) => Promise<void> | void,
	) {}

	async request(req: NetRequest, ctx: OSContext): Promise<NetResponse> {
		const decision = this.policy.evaluateNetworkRequest(
			{
				url: req.url,
				method: req.method ?? "GET",
			},
			ctx,
		);
		if (!decision.allowed) {
			throw new OSError("E_POLICY_DENIED", decision.reason ?? "Network denied");
		}

		const retries = req.retries ?? 0;
		let lastError: unknown;
		for (let attempt = 0; attempt <= retries; attempt += 1) {
			try {
				const controller = new AbortController();
				const timeout = req.timeoutMs
					? setTimeout(() => {
							controller.abort();
						}, req.timeoutMs)
					: undefined;

				const response = await fetch(req.url, {
					method: req.method ?? "GET",
					headers: req.headers,
					body: req.body,
					signal: controller.signal,
				});
				if (timeout) clearTimeout(timeout);

				const body = this.security.redactSecrets(await response.text());
				const headers: Record<string, string> = {};
				response.headers.forEach((value, key) => {
					headers[key] = value;
				});
				if (this.journal) {
					await this.journal({
						url: req.url,
						method: req.method ?? "GET",
						status: response.status,
						success: true,
						appId: ctx.appId,
						sessionId: ctx.sessionId,
						timestamp: new Date().toISOString(),
					});
				}
				return { status: response.status, body, headers };
			} catch (error) {
				lastError = error;
			}
		}
		if (this.journal) {
			await this.journal({
				url: req.url,
				method: req.method ?? "GET",
				success: false,
				appId: ctx.appId,
				sessionId: ctx.sessionId,
				error: lastError instanceof Error ? lastError.message : String(lastError),
				timestamp: new Date().toISOString(),
			});
		}
		throw lastError instanceof Error ? lastError : new Error(String(lastError));
	}
}

export function createNetRequestService(netService: NetService): OSService<NetRequest, NetResponse> {
	return {
		name: "net.request",
		requiredPermissions: ["net:request"],
		dependencies: ["security.redact", "store.set"],
		execute: async (req, ctx) => netService.request(req, ctx),
	};
}
