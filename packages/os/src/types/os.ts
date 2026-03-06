export interface OSContext {
	appId: string;
	sessionId: string;
	permissions: string[];
	workingDirectory: string;
	traceId?: string;
	tenantId?: string;
}

export type Token<Request, Response, Name extends string = string> = Name & {
	readonly __request?: Request;
	readonly __response?: Response;
};

export type RequestOfToken<T extends Token<unknown, unknown>> = T extends Token<infer Request, unknown, string>
	? Request
	: never;
export type ResponseOfToken<T extends Token<unknown, unknown>> = T extends Token<unknown, infer Response, string>
	? Response
	: never;

export type ServiceRequest<T extends OSService<unknown, unknown, string>> = T extends OSService<infer Request, unknown, string>
	? Request
	: never;
export type ServiceResponse<T extends OSService<unknown, unknown, string>> = T extends OSService<unknown, infer Response, string>
	? Response
	: never;

export interface OSService<Request, Response, Name extends string = string> {
	name: Token<Request, Response, Name>;
	requiredPermissions?: string[];
	dependencies?: Array<Token<unknown, unknown>>;
	execute(req: Request, ctx: OSContext): Promise<Response>;
}

export interface OSRequestEnvelope<Request> {
	service: string;
	request: Request;
}

export interface OSAuditRecord {
	id: string;
	timestamp: string;
	appId: string;
	sessionId: string;
	traceId?: string;
	service: string;
	success: boolean;
	durationMs: number;
	error?: string;
	errorCode?: OSErrorCode;
}

export interface PathPolicyRule {
	allow: string[];
	deny: string[];
}

export interface CommandPolicyRule {
	allowPatterns?: RegExp[];
	denyPatterns: RegExp[];
}

export interface NetworkPolicyRule {
	allowDomains?: string[];
	denyDomains?: string[];
	allowMethods?: string[];
	denyMethods?: string[];
	rateLimit?: {
		limit: number;
		windowMs: number;
	};
}

export interface PolicyInput {
	path?: string;
	command?: string;
	url?: string;
	requiredPermissions?: string[];
}

export interface PolicyDecision {
	allowed: boolean;
	reason?: string;
}

export interface EventMessage<T = unknown> {
	topic: string;
	payload: T;
	timestamp: string;
}

export type OSErrorCode =
	| "E_PERMISSION_DENIED"
	| "E_POLICY_DENIED"
	| "E_SERVICE_NOT_FOUND"
	| "E_SERVICE_EXECUTION"
	| "E_VALIDATION_FAILED"
	| "E_DEPENDENCY_ERROR"
	| "E_EXTERNAL_FAILURE"
	| "E_QUOTA_EXCEEDED"
	| "E_APP_NOT_REGISTERED"
	| "E_APP_PERMISSION_MISMATCH"
	| "E_NET_CIRCUIT_OPEN";

export interface OSExecutionMeta {
	service: string;
	traceId: string;
	durationMs: number;
}
