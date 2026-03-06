import { describe, expect, it } from "vitest";
import { LLMOSKernel } from "./index.js";
import { OSError } from "./errors.js";
import { PolicyEngine } from "./policy-engine.js";
import { AppQuotaGovernor } from "./resource-governor.js";
import type { OSContext, OSService } from "../types/os.js";

const ctx: OSContext = {
	appId: "app.test",
	sessionId: "session-1",
	permissions: ["demo:run"],
	workingDirectory: process.cwd(),
};

describe("LLMOSKernel", () => {
	it("executes registered service and records audit", async () => {
		const kernel = new LLMOSKernel();
		const service: OSService<{ x: number }, { y: number }> = {
			name: "demo.service",
			requiredPermissions: ["demo:run"],
			execute: async (req) => ({ y: req.x + 1 }),
		};
		kernel.registerService(service);

		const result = await kernel.execute("demo.service", { x: 1 }, ctx);
		expect(result.y).toBe(2);
		expect(kernel.audit.list()).toHaveLength(1);
		expect(kernel.audit.list()[0]?.success).toBe(true);
		expect(kernel.logger.list()).toHaveLength(2);
	});

	it("rejects execution when missing permission", async () => {
		const kernel = new LLMOSKernel();
		kernel.registerService({
			name: "demo.secure",
			requiredPermissions: ["admin:run"],
			execute: async () => ({ ok: true }),
		});

		await expect(kernel.execute("demo.secure", {}, ctx)).rejects.toThrow("Missing permissions");
		expect(kernel.audit.list()).toHaveLength(1);
		expect(kernel.audit.list()[0]?.success).toBe(false);
	});

	it("enforces policy engine path restriction", () => {
		const policy = new PolicyEngine({
			pathRule: { allow: [process.cwd()], deny: ["/root"] },
		});
		const decision = policy.evaluate({ path: "/root/secret.txt" }, ctx);
		expect(decision.allowed).toBe(false);
	});

	it("supports network method/rate policy evaluation", () => {
		const policy = new PolicyEngine({
			networkRule: {
				allowDomains: ["example.com"],
				allowMethods: ["GET"],
				rateLimit: { limit: 1, windowMs: 1000 },
			},
		});
		const allowed = policy.evaluateNetworkRequest({ url: "https://example.com", method: "GET" }, ctx);
		expect(allowed.allowed).toBe(true);
		const deniedMethod = policy.evaluateNetworkRequest({ url: "https://example.com", method: "POST" }, ctx);
		expect(deniedMethod.allowed).toBe(false);
		const deniedRate = policy.evaluateNetworkRequest({ url: "https://example.com", method: "GET" }, ctx);
		expect(deniedRate.allowed).toBe(false);
	});

	it("returns execution meta with trace id", async () => {
		const kernel = new LLMOSKernel();
		kernel.registerService({
			name: "meta.demo",
			requiredPermissions: [],
			execute: async () => ({ ok: true }),
		});

		const result = await kernel.executeWithMeta("meta.demo", {}, ctx);
		expect(result.result.ok).toBe(true);
		expect(result.meta.traceId.length).toBeGreaterThan(5);
	});

	it("publishes failure events", async () => {
		const kernel = new LLMOSKernel();
		kernel.registerService({
			name: "boom",
			requiredPermissions: [],
			execute: async () => {
				throw new Error("boom");
			},
		});
		const failed: string[] = [];
		kernel.events.subscribe<{ service: string }>("kernel.service.failed", (event) => {
			failed.push(event.payload.service);
		});

		await expect(kernel.execute("boom", {}, ctx)).rejects.toThrow("boom");
		expect(failed).toEqual(["boom"]);
	});

	it("enforces resource governor quota", async () => {
		let calls = 0;
		const governor = new AppQuotaGovernor((_appId, delta) => {
			calls += delta.toolCalls;
			if (calls > 1) throw new Error("quota");
		});
		const kernel = new LLMOSKernel({ resourceGovernor: governor });
		kernel.registerService({
			name: "quota.demo",
			requiredPermissions: [],
			execute: async () => ({ ok: true }),
		});
		await kernel.execute("quota.demo", {}, ctx);
		await expect(kernel.execute("quota.demo", {}, ctx)).rejects.toMatchObject({
			code: "E_QUOTA_EXCEEDED",
		} satisfies Partial<OSError>);
	});

	it("throws E_SERVICE_NOT_FOUND for unknown service", async () => {
		const kernel = new LLMOSKernel();
		await expect(kernel.execute("missing.service", {}, ctx)).rejects.toMatchObject({
			code: "E_SERVICE_NOT_FOUND",
		} satisfies Partial<OSError>);
	});

	it("records metrics snapshot", async () => {
		const kernel = new LLMOSKernel();
		kernel.registerService({
			name: "metric.demo",
			requiredPermissions: [],
			execute: async (req: { fail?: boolean }) => {
				if (req.fail) throw new Error("fail");
				return { ok: true };
			},
		});

		await kernel.execute("metric.demo", { fail: false }, ctx);
		await expect(kernel.execute("metric.demo", { fail: true }, ctx)).rejects.toMatchObject({
			code: "E_SERVICE_EXECUTION",
		} satisfies Partial<OSError>);
		const snapshot = kernel.metrics.snapshot("metric.demo");
		expect(snapshot.total).toBe(2);
		expect(snapshot.success).toBe(1);
		expect(snapshot.failure).toBe(1);
		expect(snapshot.successRate).toBe(0.5);
		expect(snapshot.errorRate).toBe(0.5);
	});

	it("records E_POLICY_DENIED from service layer", async () => {
		const kernel = new LLMOSKernel();
		kernel.registerService({
			name: "policy.demo",
			requiredPermissions: [],
			execute: async () => {
				throw new OSError("E_POLICY_DENIED", "denied");
			},
		});
		await expect(kernel.execute("policy.demo", {}, ctx)).rejects.toThrow("denied");
		const last = kernel.audit.list().at(-1);
		expect(last?.errorCode).toBe("E_POLICY_DENIED");
	});

	it("capability registry supports remove and listAll", () => {
		const kernel = new LLMOSKernel();
		kernel.capabilities.set("app.a", ["x"]);
		kernel.capabilities.set("app.b", ["y"]);
		expect(kernel.capabilities.listAll()).toEqual({
			"app.a": ["x"],
			"app.b": ["y"],
		});
		kernel.capabilities.remove("app.a");
		expect(kernel.capabilities.list("app.a")).toEqual([]);
	});
});
