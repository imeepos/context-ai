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

export interface NetCircuitBreakerOptions {
	failureThreshold: number;
	cooldownMs: number;
}

interface NetCircuitState {
	state: "closed" | "open";
	consecutiveFailures: number;
	openedAtMs?: number;
}

export interface NetServiceOptions {
	circuitBreaker?: NetCircuitBreakerOptions;
}

export class NetService {
	private readonly circuits = new Map<string, NetCircuitState>();

	constructor(
		private readonly policy: PolicyEngine,
		private readonly security: SecurityService,
		private readonly journal?: (entry: NetJournalEntry) => Promise<void> | void,
		private readonly options: NetServiceOptions = {},
	) {}

	async request(req: NetRequest, ctx: OSContext): Promise<NetResponse> {
		const host = this.normalizeHost(req.url);
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
		this.assertCircuitAvailable(host);

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
				this.markSuccess(host);
				return { status: response.status, body, headers };
			} catch (error) {
				lastError = error;
				this.markFailure(host);
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

	getCircuitSnapshot(): Record<
		string,
		{
			state: "closed" | "open";
			consecutiveFailures: number;
			openedAt?: string;
			nextRetryAt?: string;
		}
	> {
		const result: Record<
			string,
			{
				state: "closed" | "open";
				consecutiveFailures: number;
				openedAt?: string;
				nextRetryAt?: string;
			}
		> = {};
		const cooldownMs = this.options.circuitBreaker?.cooldownMs;
		for (const [host, state] of this.circuits.entries()) {
			result[host] = {
				state: state.state,
				consecutiveFailures: state.consecutiveFailures,
				openedAt: state.openedAtMs ? new Date(state.openedAtMs).toISOString() : undefined,
				nextRetryAt:
					state.openedAtMs !== undefined && cooldownMs !== undefined
						? new Date(state.openedAtMs + cooldownMs).toISOString()
						: undefined,
			};
		}
		return result;
	}

	private normalizeHost(url: string): string {
		try {
			return new URL(url).host;
		} catch {
			return url;
		}
	}

	private assertCircuitAvailable(host: string): void {
		const breaker = this.options.circuitBreaker;
		if (!breaker) return;
		const state = this.circuits.get(host);
		if (!state || state.state !== "open" || state.openedAtMs === undefined) return;

		if (Date.now() >= state.openedAtMs + breaker.cooldownMs) {
			this.circuits.set(host, {
				state: "closed",
				consecutiveFailures: 0,
			});
			return;
		}
		throw new OSError("E_NET_CIRCUIT_OPEN", `Network circuit open for host: ${host}`);
	}

	private markSuccess(host: string): void {
		if (!this.options.circuitBreaker) return;
		this.circuits.set(host, {
			state: "closed",
			consecutiveFailures: 0,
		});
	}

	private markFailure(host: string): void {
		const breaker = this.options.circuitBreaker;
		if (!breaker) return;
		const current = this.circuits.get(host) ?? {
			state: "closed" as const,
			consecutiveFailures: 0,
		};
		const consecutiveFailures = current.consecutiveFailures + 1;
		if (consecutiveFailures >= breaker.failureThreshold) {
			this.circuits.set(host, {
				state: "open",
				consecutiveFailures,
				openedAtMs: Date.now(),
			});
			return;
		}
		this.circuits.set(host, {
			state: "closed",
			consecutiveFailures,
		});
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
