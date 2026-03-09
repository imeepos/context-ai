import type { LLMOSKernel, SecurityService } from "../types.js";
import type { OSService } from "../../types/os.js";
import * as TOKENS from "../../tokens.js";
import { gzipSync } from "node:zlib";
import { createHash } from "node:crypto";
import { OSError } from "../../kernel/errors.js";

export interface SystemErrorsRequest {
	service?: string;
	servicePrefix?: string;
	errorCode?: string;
	windowMinutes?: number;
	limit?: number;
	bucketMinutes?: number;
	order?: "asc" | "desc";
	offset?: number;
	recentLimit?: number;
}

export interface SystemErrorsResponse {
	totalFailures: number;
	byErrorCode: Record<string, number>;
	byReason: Record<string, number>;
	topReasons: Array<{ reason: string; count: number }>;
	byService: Record<
		string,
		{
			total: number;
			byErrorCode: Record<string, number>;
		}
	>;
	recent: Array<{
		timestamp: string;
		service: string;
		traceId?: string;
		errorCode?: string;
		error?: string;
		appId: string;
		sessionId: string;
	}>;
	trend: Array<{
		bucketStart: string;
		count: number;
	}>;
}

export interface SystemErrorsExportRequest extends SystemErrorsRequest {
	format?: "json" | "csv";
	compress?: boolean;
	signingSecret?: string;
	keyId?: string;
}

export interface SystemErrorsExportResponse {
	format: "json" | "csv";
	contentType: "application/json" | "text/csv" | "application/gzip+base64";
	content: string;
	contentSha256: string;
	compressed: boolean;
	signature: string;
	keyId: string;
}

interface ErrorsSigningKeyRecord {
	keyId: string;
	secret: string;
	createdAt: string;
}

const errorsSigningKeys = new Map<string, ErrorsSigningKeyRecord>();
let activeErrorsSigningKeyId = "default";
if (!errorsSigningKeys.has(activeErrorsSigningKeyId)) {
	errorsSigningKeys.set(activeErrorsSigningKeyId, {
		keyId: activeErrorsSigningKeyId,
		secret: "errors-export-secret",
		createdAt: new Date().toISOString(),
	});
}

function thisEscapeCsv(value: string): string {
	const escaped = value.replaceAll('"', '""');
	return `"${escaped}"`;
}

export function createSystemErrorsService(
	kernel: LLMOSKernel,
): OSService<SystemErrorsRequest, SystemErrorsResponse> {
	return {
		name: TOKENS.SYSTEM_ERRORS,
		requiredPermissions: ["system:read"],
		execute: async (req) => {
			let records = kernel.audit.list().filter((record) => !record.success);
			if (req.windowMinutes && req.windowMinutes > 0) {
				const since = Date.now() - req.windowMinutes * 60 * 1000;
				records = records.filter((record) => Date.parse(record.timestamp) >= since);
			}
			if (req.service) {
				records = records.filter((record) => record.service === req.service);
			}
			if (req.servicePrefix) {
				records = records.filter((record) => record.service.startsWith(req.servicePrefix!));
			}
			if (req.errorCode) {
				records = records.filter((record) => (record.errorCode ?? "UNKNOWN") === req.errorCode);
			}
			if (req.limit && req.limit > 0 && records.length > req.limit) {
				records = records.slice(-req.limit);
			}
			const byErrorCode: Record<string, number> = {};
			const byReason: Record<string, number> = {};
			const byService: Record<
				string,
				{
					total: number;
					byErrorCode: Record<string, number>;
				}
			> = {};
			for (const record of records) {
				const code = record.errorCode ?? "UNKNOWN";
				byErrorCode[code] = (byErrorCode[code] ?? 0) + 1;
				const reason = record.error?.trim() || "UNKNOWN";
				byReason[reason] = (byReason[reason] ?? 0) + 1;
				const serviceBucket = byService[record.service] ?? { total: 0, byErrorCode: {} };
				serviceBucket.total += 1;
				serviceBucket.byErrorCode[code] = (serviceBucket.byErrorCode[code] ?? 0) + 1;
				byService[record.service] = serviceBucket;
			}
			const topReasons = Object.entries(byReason)
				.map(([reason, count]) => ({ reason, count }))
				.sort((a, b) => b.count - a.count || a.reason.localeCompare(b.reason))
				.slice(0, 10);
			const recentOrder = req.order === "asc" ? "asc" : "desc";
			const recentOffset = req.offset && req.offset > 0 ? req.offset : 0;
			const recentLimit = req.recentLimit && req.recentLimit > 0 ? req.recentLimit : 20;
			const recent = [...records]
				.sort((a, b) =>
					recentOrder === "asc"
						? Date.parse(a.timestamp) - Date.parse(b.timestamp)
						: Date.parse(b.timestamp) - Date.parse(a.timestamp),
				)
				.slice(recentOffset, recentOffset + recentLimit)
				.map((record) => ({
					timestamp: record.timestamp,
					service: record.service,
					traceId: record.traceId,
					errorCode: record.errorCode,
					error: record.error,
					appId: record.appId,
					sessionId: record.sessionId,
				}));
			const trend: Array<{ bucketStart: string; count: number }> = [];
			if (req.bucketMinutes && req.bucketMinutes > 0) {
				const bucketMs = req.bucketMinutes * 60 * 1000;
				const buckets = new Map<number, number>();
				for (const record of records) {
					const ts = Date.parse(record.timestamp);
					const bucketStartMs = Math.floor(ts / bucketMs) * bucketMs;
					buckets.set(bucketStartMs, (buckets.get(bucketStartMs) ?? 0) + 1);
				}
				for (const [bucketStartMs, count] of [...buckets.entries()].sort((a, b) => a[0] - b[0])) {
					trend.push({
						bucketStart: new Date(bucketStartMs).toISOString(),
						count,
					});
				}
			}
			return {
				totalFailures: records.length,
				byErrorCode,
				byReason,
				topReasons,
				byService,
				recent,
				trend,
			};
		},
	};
}

export function createSystemErrorsExportService(
	kernel: LLMOSKernel,
	securityService: SecurityService,
): OSService<SystemErrorsExportRequest, SystemErrorsExportResponse> {
	const base = createSystemErrorsService(kernel);
	return {
		name: TOKENS.SYSTEM_ERRORS_EXPORT,
		requiredPermissions: ["system:read"],
		execute: async (req, ctx) => {
			const { format = "json", ...filters } = req;
			if (format !== "json" && format !== "csv") {
				throw new OSError("E_VALIDATION_FAILED", `Unsupported errors export format: ${format}`);
			}
			const response = await base.execute(filters, ctx);
			const selectedKeyId = req.signingSecret
				? "adhoc"
				: req.keyId && errorsSigningKeys.has(req.keyId)
					? req.keyId
					: activeErrorsSigningKeyId;
			const signingSecret =
				req.signingSecret ?? errorsSigningKeys.get(selectedKeyId)?.secret ?? "errors-export-secret";
			const payload =
				format === "csv"
					? [
							"timestamp,service,errorCode,error,traceId,appId,sessionId",
							...response.recent.map((item) =>
								[
									thisEscapeCsv(item.timestamp),
									thisEscapeCsv(item.service),
									thisEscapeCsv(item.errorCode ?? ""),
									thisEscapeCsv(item.error ?? ""),
									thisEscapeCsv(item.traceId ?? ""),
									thisEscapeCsv(item.appId),
									thisEscapeCsv(item.sessionId),
								].join(","),
							),
						].join("\n")
					: JSON.stringify(response);
			if (req.compress) {
				const content = gzipSync(Buffer.from(payload, "utf8")).toString("base64");
				return {
					format,
					contentType: "application/gzip+base64",
					content,
					contentSha256: createHash("sha256").update(content, "utf8").digest("hex"),
					compressed: true,
					signature: securityService.sign(content, signingSecret),
					keyId: selectedKeyId,
				};
			}
			if (format === "csv") {
				return {
					format: "csv",
					contentType: "text/csv",
					content: payload,
					contentSha256: createHash("sha256").update(payload, "utf8").digest("hex"),
					compressed: false,
					signature: securityService.sign(payload, signingSecret),
					keyId: selectedKeyId,
				};
			}
			return {
				format: "json",
				contentType: "application/json",
				content: payload,
				contentSha256: createHash("sha256").update(payload, "utf8").digest("hex"),
				compressed: false,
				signature: securityService.sign(payload, signingSecret),
				keyId: selectedKeyId,
			};
		},
	};
}

export function createSystemErrorsKeysRotateService(): OSService<
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
		name: TOKENS.SYSTEM_ERRORS_KEYS_ROTATE,
		requiredPermissions: ["system:write"],
		execute: async (req) => {
			errorsSigningKeys.set(req.keyId, {
				keyId: req.keyId,
				secret: req.secret,
				createdAt: new Date().toISOString(),
			});
			if (req.setActive !== false) {
				activeErrorsSigningKeyId = req.keyId;
			}
			return {
				activeKeyId: activeErrorsSigningKeyId,
				keyIds: [...errorsSigningKeys.keys()],
			};
		},
	};
}

export function createSystemErrorsKeysListService(): OSService<
	Record<string, never>,
	{
		activeKeyId: string;
		keys: Array<{ keyId: string; createdAt: string; isActive: boolean }>;
	}
> {
	return {
		name: TOKENS.SYSTEM_ERRORS_KEYS_LIST,
		requiredPermissions: ["system:read"],
		execute: async () => ({
			activeKeyId: activeErrorsSigningKeyId,
			keys: [...errorsSigningKeys.values()].map((item) => ({
				keyId: item.keyId,
				createdAt: item.createdAt,
				isActive: item.keyId === activeErrorsSigningKeyId,
			})),
		}),
	};
}

export function createSystemErrorsKeysActivateService(): OSService<
	{ keyId: string },
	{ activated: boolean; activeKeyId: string }
> {
	return {
		name: TOKENS.SYSTEM_ERRORS_KEYS_ACTIVATE,
		requiredPermissions: ["system:write"],
		execute: async (req) => {
			if (errorsSigningKeys.has(req.keyId)) {
				activeErrorsSigningKeyId = req.keyId;
				return { activated: true, activeKeyId: activeErrorsSigningKeyId };
			}
			return { activated: false, activeKeyId: activeErrorsSigningKeyId };
		},
	};
}
