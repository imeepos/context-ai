import type { LLMOSKernel, SecurityService } from "../types.js";
import type { OSService } from "../../types/os.js";
import * as TOKENS from "../../tokens.js";
import { gzipSync } from "node:zlib";
import { OSError } from "../../kernel/errors.js";

export interface SystemAuditRequest {
	sessionId?: string;
	traceId?: string;
	service?: string;
	limit?: number;
}

export interface SystemAuditResponse {
	records: Array<{
		id: string;
		timestamp: string;
		appId: string;
		sessionId: string;
		traceId?: string;
		service: string;
		success: boolean;
		durationMs: number;
		error?: string;
		errorCode?: string;
	}>;
}

export function createSystemAuditService(kernel: LLMOSKernel): OSService<SystemAuditRequest, SystemAuditResponse> {
	return {
		name: TOKENS.SYSTEM_AUDIT,
		requiredPermissions: ["system:read"],
		execute: async (req) => {
			let records = kernel.audit.list();
			if (req.sessionId) {
				records = records.filter((record) => record.sessionId === req.sessionId);
			}
			if (req.traceId) {
				records = records.filter((record) => record.traceId === req.traceId);
			}
			if (req.service) {
				records = records.filter((record) => record.service === req.service);
			}
			if (req.limit && req.limit > 0) {
				records = records.slice(-req.limit);
			}
			return { records };
		},
	};
}

export interface SystemAuditExportRequest {
	since?: string;
	until?: string;
	cursor?: number;
	limit?: number;
	format?: "jsonl";
	compress?: boolean;
	signingSecret?: string;
	keyId?: string;
}

export interface SystemAuditExportResponse {
	content: string;
	contentType: string;
	compressed: boolean;
	signature: string;
	keyId: string;
	nextCursor: number;
	exported: number;
}

interface AuditSigningKeyRecord {
	keyId: string;
	secret: string;
	createdAt: string;
}

const auditSigningKeys = new Map<string, AuditSigningKeyRecord>();
let activeAuditSigningKeyId = "default";
if (!auditSigningKeys.has(activeAuditSigningKeyId)) {
	auditSigningKeys.set(activeAuditSigningKeyId, {
		keyId: activeAuditSigningKeyId,
		secret: "audit-export-secret",
		createdAt: new Date().toISOString(),
	});
}

export function createSystemAuditExportService(
	kernel: LLMOSKernel,
	securityService: SecurityService,
): OSService<SystemAuditExportRequest, SystemAuditExportResponse> {
	return {
		name: TOKENS.SYSTEM_AUDIT_EXPORT,
		requiredPermissions: ["system:read"],
		execute: async (req) => {
			if (req.format && req.format !== "jsonl") {
				throw new OSError("E_VALIDATION_FAILED", `Unsupported audit export format: ${req.format}`);
			}
			let records = kernel.audit.list();
			if (req.since) {
				const since = Date.parse(req.since);
				if (!Number.isNaN(since)) {
					records = records.filter((item) => Date.parse(item.timestamp) >= since);
				}
			}
			if (req.until) {
				const until = Date.parse(req.until);
				if (!Number.isNaN(until)) {
					records = records.filter((item) => Date.parse(item.timestamp) <= until);
				}
			}
			const cursor = req.cursor && req.cursor > 0 ? req.cursor : 0;
			const limit = req.limit && req.limit > 0 ? req.limit : 100;
			const sliced = records.slice(cursor, cursor + limit);
			const jsonl = sliced.map((item) => JSON.stringify(item)).join("\n");
			const selectedKeyId = req.signingSecret
				? "adhoc"
				: req.keyId && auditSigningKeys.has(req.keyId)
					? req.keyId
					: activeAuditSigningKeyId;
			const signingSecret =
				req.signingSecret ?? auditSigningKeys.get(selectedKeyId)?.secret ?? "audit-export-secret";
			if (req.compress) {
				const compressedBuffer = gzipSync(Buffer.from(jsonl, "utf8"));
				const content = compressedBuffer.toString("base64");
				return {
					content,
					contentType: "application/gzip+base64",
					compressed: true,
					signature: securityService.sign(content, signingSecret),
					keyId: selectedKeyId,
					nextCursor: cursor + sliced.length,
					exported: sliced.length,
				};
			}
			return {
				content: jsonl,
				contentType: "application/x-ndjson",
				compressed: false,
				signature: securityService.sign(jsonl, signingSecret),
				keyId: selectedKeyId,
				nextCursor: cursor + sliced.length,
				exported: sliced.length,
			};
		},
	};
}

export function createSystemAuditKeysRotateService(): OSService<
	{
		keyId: string;
		secret: string;
		setActive?: boolean;
	},
	{
		activeKeyId: string;
		keyIds: string[];
	}
> {
	return {
		name: TOKENS.SYSTEM_AUDIT_KEYS_ROTATE,
		requiredPermissions: ["system:write"],
		execute: async (req) => {
			auditSigningKeys.set(req.keyId, {
				keyId: req.keyId,
				secret: req.secret,
				createdAt: new Date().toISOString(),
			});
			if (req.setActive !== false) {
				activeAuditSigningKeyId = req.keyId;
			}
			return {
				activeKeyId: activeAuditSigningKeyId,
				keyIds: [...auditSigningKeys.keys()],
			};
		},
	};
}

export function createSystemAuditKeysListService(): OSService<
	Record<string, never>,
	{
		activeKeyId: string;
		keys: Array<{ keyId: string; createdAt: string; isActive: boolean }>;
	}
> {
	return {
		name: TOKENS.SYSTEM_AUDIT_KEYS_LIST,
		requiredPermissions: ["system:read"],
		execute: async () => ({
			activeKeyId: activeAuditSigningKeyId,
			keys: [...auditSigningKeys.values()].map((item) => ({
				keyId: item.keyId,
				createdAt: item.createdAt,
				isActive: item.keyId === activeAuditSigningKeyId,
			})),
		}),
	};
}

export function createSystemAuditKeysActivateService(): OSService<
	{ keyId: string },
	{ activated: boolean; activeKeyId: string }
> {
	return {
		name: TOKENS.SYSTEM_AUDIT_KEYS_ACTIVATE,
		requiredPermissions: ["system:write"],
		execute: async (req) => {
			if (auditSigningKeys.has(req.keyId)) {
				activeAuditSigningKeyId = req.keyId;
				return { activated: true, activeKeyId: activeAuditSigningKeyId };
			}
			return { activated: false, activeKeyId: activeAuditSigningKeyId };
		},
	};
}

// Export for governance module
export { auditSigningKeys, activeAuditSigningKeyId };
