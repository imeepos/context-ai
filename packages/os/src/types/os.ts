export interface OSContext {
	appId: string;
	sessionId: string;
	permissions: string[];
	workingDirectory: string;
	traceId?: string;
	tenantId?: string;
}

export interface OSService<Request, Response> {
	name: string;
	requiredPermissions?: string[];
	dependencies?: string[];
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
	| "E_QUOTA_EXCEEDED"
	| "E_APP_NOT_REGISTERED"
	| "E_APP_PERMISSION_MISMATCH"
	| "E_NET_CIRCUIT_OPEN";

export interface OSExecutionMeta {
	service: string;
	traceId: string;
	durationMs: number;
}
