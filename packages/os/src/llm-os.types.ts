import type { Injector } from "@context-ai/core";
import type { PublicOSRuntime } from "./di/public-runtime.js";
import type { Token } from "./types/os.js";

export interface DefaultLLMOS<
	TTokens extends Record<string, Token<unknown, unknown>> = Record<string, Token<unknown, unknown>>,
> extends PublicOSRuntime {
	injector: Injector;
	serviceTokens: TTokens;
}

export interface CreateDefaultLLMOSOptions {
	pathPolicy?: import("./types/os.js").PathPolicyRule;
	packageSigningSecret?: string;
	netJournalLimit?: number;
	notificationDedupeWindowMs?: number;
	notificationRateLimit?: {
		limit: number;
		windowMs: number;
	};
	notificationRetentionLimit?: number;
	enabledServices?: Partial<Record<string, boolean>>;
}
