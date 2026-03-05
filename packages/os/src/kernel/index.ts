import { randomUUID } from "node:crypto";
import { AuditLog } from "./audit-log.js";
import { CapabilityRegistry } from "./capability-registry.js";
import { EventBus } from "./event-bus.js";
import { OSError } from "./errors.js";
import { KernelLogger } from "./logger.js";
import { KernelMetrics } from "./metrics.js";
import { PolicyEngine } from "./policy-engine.js";
import type { ResourceGovernor } from "./resource-governor.js";
import { ServiceRegistry } from "./service-registry.js";
import type { OSContext, OSExecutionMeta, OSService } from "../types/os.js";

export interface LLMOSKernelOptions {
	policyEngine?: PolicyEngine;
	logger?: KernelLogger;
	resourceGovernor?: ResourceGovernor;
}

export class LLMOSKernel {
	readonly services: ServiceRegistry;
	readonly capabilities: CapabilityRegistry;
	readonly events: EventBus;
	readonly audit: AuditLog;
	readonly policy: PolicyEngine;
	readonly logger: KernelLogger;
	readonly metrics: KernelMetrics;
	readonly resourceGovernor?: ResourceGovernor;

	constructor(options: LLMOSKernelOptions = {}) {
		this.services = new ServiceRegistry();
		this.capabilities = new CapabilityRegistry();
		this.events = new EventBus();
		this.audit = new AuditLog();
		this.policy = options.policyEngine ?? new PolicyEngine();
		this.logger = options.logger ?? new KernelLogger();
		this.metrics = new KernelMetrics();
		this.resourceGovernor = options.resourceGovernor;
	}

	registerService<Request, Response>(service: OSService<Request, Response>): void {
		this.services.register(service);
	}

	private ensureTraceId(context: OSContext): string {
		return context.traceId ?? randomUUID();
	}

	async execute<Request, Response>(serviceName: string, request: Request, context: OSContext): Promise<Response> {
		const result = await this.executeWithMeta<Request, Response>(serviceName, request, context);
		return result.result;
	}

	async executeWithMeta<Request, Response>(
		serviceName: string,
		request: Request,
		context: OSContext,
	): Promise<{ result: Response; meta: OSExecutionMeta }> {
		const started = Date.now();
		const traceId = this.ensureTraceId(context);
		let service: OSService<Request, Response>;
		try {
			service = this.services.get<Request, Response>(serviceName);
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			this.audit.record({
				appId: context.appId,
				sessionId: context.sessionId,
				traceId,
				service: serviceName,
				success: false,
				durationMs: Date.now() - started,
				error: message,
				errorCode: "E_SERVICE_NOT_FOUND",
			});
			this.metrics.record(serviceName, Date.now() - started, false);
			throw new OSError("E_SERVICE_NOT_FOUND", message);
		}
		this.logger.info("kernel.execute.start", traceId, {
			service: serviceName,
			appId: context.appId,
		});
		const permissionResult = this.policy.checkPermissions(service.requiredPermissions ?? [], context.permissions);
		if (!permissionResult.allowed) {
			this.audit.record({
				appId: context.appId,
				sessionId: context.sessionId,
				traceId,
				service: serviceName,
				success: false,
				durationMs: Date.now() - started,
				error: permissionResult.reason,
				errorCode: "E_PERMISSION_DENIED",
			});
			this.metrics.record(serviceName, Date.now() - started, false);
			this.events.publish("kernel.service.failed", {
				service: serviceName,
				traceId,
				error: permissionResult.reason ?? "Permission denied",
				errorCode: "E_PERMISSION_DENIED",
			});
			this.logger.error("kernel.execute.denied", traceId, {
				service: serviceName,
				reason: permissionResult.reason,
			});
			throw new OSError("E_PERMISSION_DENIED", permissionResult.reason ?? "Permission denied");
		}
		if (this.resourceGovernor) {
			try {
				await this.resourceGovernor.beforeExecute({
					serviceName,
					context: { ...context, traceId },
					request,
				});
			} catch (error) {
				const message = error instanceof Error ? error.message : String(error);
				const code = error instanceof OSError ? error.code : "E_QUOTA_EXCEEDED";
				this.audit.record({
					appId: context.appId,
					sessionId: context.sessionId,
					traceId,
					service: serviceName,
					success: false,
					durationMs: Date.now() - started,
					error: message,
					errorCode: code,
				});
				this.metrics.record(serviceName, Date.now() - started, false);
				this.events.publish("kernel.service.failed", {
					service: serviceName,
					traceId,
					error: message,
					errorCode: code,
				});
				this.logger.error("kernel.execute.quota_denied", traceId, {
					service: serviceName,
					error: message,
					errorCode: code,
				});
				throw error;
			}
		}

		try {
			const result = await service.execute(request, { ...context, traceId });
			const durationMs = Date.now() - started;
			const audit = this.audit.record({
				appId: context.appId,
				sessionId: context.sessionId,
				traceId,
				service: serviceName,
				success: true,
				durationMs,
			});
			this.events.publish("kernel.service.executed", {
				service: serviceName,
				appId: context.appId,
				traceId,
			});
			this.logger.info("kernel.execute.success", traceId, {
				service: serviceName,
				auditId: audit.id,
				durationMs,
			});
			this.metrics.record(serviceName, durationMs, true);
			return {
				result,
				meta: {
					service: serviceName,
					traceId,
					durationMs,
				},
			};
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			const code = error instanceof OSError ? error.code : "E_SERVICE_EXECUTION";
			this.audit.record({
				appId: context.appId,
				sessionId: context.sessionId,
				traceId,
				service: serviceName,
				success: false,
				durationMs: Date.now() - started,
				error: message,
				errorCode: code,
			});
			this.metrics.record(serviceName, Date.now() - started, false);
			this.events.publish("kernel.service.failed", {
				service: serviceName,
				traceId,
				error: message,
				errorCode: code,
			});
			this.logger.error("kernel.execute.failed", traceId, {
				service: serviceName,
				error: message,
				errorCode: code,
			});
			throw error;
		}
	}
}

export function createLLMOSKernel(options: LLMOSKernelOptions = {}): LLMOSKernel {
	return new LLMOSKernel(options);
}
