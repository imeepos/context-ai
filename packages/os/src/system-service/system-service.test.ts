import { describe, expect, it } from "vitest";
import { LLMOSKernel } from "../kernel/index.js";
import { NetService } from "../net-service/index.js";
import { PolicyEngine } from "../kernel/policy-engine.js";
import { SecurityService } from "../security-service/index.js";
import { vi } from "vitest";
import {
	createSystemAuditService,
	createSystemCapabilitiesService,
	createSystemCapabilitiesListService,
	createSystemErrorsService,
	createSystemEventsService,
	createSystemMetricsService,
	createSystemNetCircuitService,
	createSystemPolicyEvaluateService,
	createSystemPolicyService,
	createSystemSnapshotService,
	createSystemTopologyService,
} from "./index.js";

describe("SystemService", () => {
	it("returns metrics snapshots", async () => {
		const kernel = new LLMOSKernel();
		kernel.registerService({
			name: "demo.ok",
			requiredPermissions: [],
			execute: async () => ({ ok: true }),
		});
		await kernel.execute("demo.ok", {}, {
			appId: "app.demo",
			sessionId: "s1",
			permissions: [],
			workingDirectory: process.cwd(),
		});

		const service = createSystemMetricsService(kernel);
		const response = await service.execute({ service: "demo.ok" }, {
			appId: "app.demo",
			sessionId: "s1",
			permissions: ["system:read"],
			workingDirectory: process.cwd(),
		});
		expect(response.metrics).toHaveLength(1);
		expect(response.metrics[0]?.service).toBe("demo.ok");
	});

	it("returns filtered audit records", async () => {
		const kernel = new LLMOSKernel();
		kernel.registerService({
			name: "demo.audit",
			requiredPermissions: [],
			execute: async () => ({ ok: true }),
		});
		await kernel.execute("demo.audit", {}, {
			appId: "app.demo",
			sessionId: "s2",
			permissions: [],
			workingDirectory: process.cwd(),
		});
		const service = createSystemAuditService(kernel);
		const response = await service.execute(
			{ service: "demo.audit", sessionId: "s2" },
			{
				appId: "app.demo",
				sessionId: "s2",
				permissions: ["system:read"],
				workingDirectory: process.cwd(),
			},
		);
		expect(response.records.length).toBeGreaterThan(0);
		expect(response.records.every((record) => record.service === "demo.audit")).toBe(true);
	});

	it("returns system topology", async () => {
		const kernel = new LLMOSKernel();
		kernel.registerService({
			name: "topo.base",
			requiredPermissions: [],
			execute: async () => ({ ok: true }),
		});
		kernel.registerService({
			name: "topo.child",
			requiredPermissions: [],
			dependencies: ["topo.base"],
			execute: async () => ({ ok: true }),
		});
		const service = createSystemTopologyService(kernel);
		const response = await service.execute(
			{},
			{
				appId: "app.demo",
				sessionId: "s3",
				permissions: ["system:read"],
				workingDirectory: process.cwd(),
			},
		);
		expect(response.services).toContain("topo.child");
		expect(response.dependencies["topo.child"]).toEqual(["topo.base"]);
		expect(response.bootOrder).toEqual(["topo.base", "topo.child"]);
	});

	it("returns system events history", async () => {
		const kernel = new LLMOSKernel();
		kernel.events.publish("demo.event", { x: 1 });
		kernel.events.publish("demo.event", { x: 2 });
		const service = createSystemEventsService(kernel);
		const response = await service.execute(
			{ topic: "demo.event", limit: 1 },
			{
				appId: "app.demo",
				sessionId: "s4",
				permissions: ["system:read"],
				workingDirectory: process.cwd(),
			},
		);
		expect(response.events).toHaveLength(1);
		expect(response.events[0]?.topic).toBe("demo.event");
	});

	it("returns app capabilities", async () => {
		const kernel = new LLMOSKernel();
		kernel.capabilities.set("app.c1", ["file:read", "store:write"]);
		const service = createSystemCapabilitiesService(kernel);
		const response = await service.execute(
			{ appId: "app.c1" },
			{
				appId: "app.demo",
				sessionId: "s5",
				permissions: ["system:read"],
				workingDirectory: process.cwd(),
			},
		);
		expect(response.capabilities).toEqual(["file:read", "store:write"]);
	});

	it("returns all capabilities map", async () => {
		const kernel = new LLMOSKernel();
		kernel.capabilities.set("a1", ["p1"]);
		kernel.capabilities.set("a2", ["p2", "p3"]);
		const service = createSystemCapabilitiesListService(kernel);
		const response = await service.execute(
			{},
			{
				appId: "app.demo",
				sessionId: "s6",
				permissions: ["system:read"],
				workingDirectory: process.cwd(),
			},
		);
		expect(response.capabilitiesByApp.a1).toEqual(["p1"]);
		expect(response.capabilitiesByApp.a2).toEqual(["p2", "p3"]);
	});

	it("returns policy snapshot", async () => {
		const kernel = new LLMOSKernel();
		const service = createSystemPolicyService(kernel);
		const response = await service.execute(
			{},
			{
				appId: "app.demo",
				sessionId: "s6",
				permissions: ["system:read"],
				workingDirectory: process.cwd(),
			},
		);
		expect(response.policy.pathRule).toBeDefined();
		expect(Array.isArray(response.policy.commandRule.denyPatterns)).toBe(true);
	});

	it("returns system snapshot", async () => {
		const kernel = new LLMOSKernel();
		kernel.registerService({
			name: "snap.demo",
			requiredPermissions: [],
			execute: async () => ({ ok: true }),
		});
		await kernel.execute("snap.demo", {}, {
			appId: "app.demo",
			sessionId: "s7",
			permissions: [],
			workingDirectory: process.cwd(),
		});
		const service = createSystemSnapshotService(kernel);
		const response = await service.execute(
			{},
			{
				appId: "app.demo",
				sessionId: "s7",
				permissions: ["system:read"],
				workingDirectory: process.cwd(),
			},
		);
		expect(response.health.services).toContain("snap.demo");
		expect(response.topology.bootOrder).toContain("snap.demo");
		expect(response.policy.pathRule).toBeDefined();
		expect(response.latestAudit?.service).toBe("snap.demo");
	});

	it("returns aggregated errors", async () => {
		const kernel = new LLMOSKernel();
		kernel.registerService({
			name: "err.demo",
			requiredPermissions: [],
			execute: async () => {
				throw new Error("boom");
			},
		});
		await expect(
			kernel.execute("err.demo", {}, {
				appId: "app.demo",
				sessionId: "s8",
				permissions: [],
				workingDirectory: process.cwd(),
			}),
		).rejects.toThrow();
		const service = createSystemErrorsService(kernel);
		const response = await service.execute(
			{ service: "err.demo" },
			{
				appId: "app.demo",
				sessionId: "s8",
				permissions: ["system:read"],
				workingDirectory: process.cwd(),
			},
		);
		expect(response.totalFailures).toBe(1);
		expect(response.byErrorCode.E_SERVICE_EXECUTION).toBe(1);
	});

	it("evaluates policy decisions", async () => {
		const kernel = new LLMOSKernel();
		const service = createSystemPolicyEvaluateService(kernel);
		const commandDenied = await service.execute(
			{ command: "rm -rf /" },
			{
				appId: "app.demo",
				sessionId: "s9",
				permissions: ["system:read"],
				workingDirectory: process.cwd(),
			},
		);
		expect(commandDenied.allowed).toBe(false);
	});

	it("returns network circuit breaker state", async () => {
		vi.useFakeTimers();
		const fetchMock = vi
			.spyOn(globalThis, "fetch")
			.mockRejectedValueOnce(new Error("e1"))
			.mockRejectedValueOnce(new Error("e2"));
		const net = new NetService(new PolicyEngine(), new SecurityService(), undefined, {
			circuitBreaker: {
				failureThreshold: 2,
				cooldownMs: 3000,
			},
		});
		const ctx = {
			appId: "app.demo",
			sessionId: "s10",
			permissions: ["system:read", "net:request"],
			workingDirectory: process.cwd(),
		};
		await expect(net.request({ url: "https://example.com" }, ctx)).rejects.toThrow("e1");
		await expect(net.request({ url: "https://example.com" }, ctx)).rejects.toThrow("e2");

		const service = createSystemNetCircuitService(net);
		const response = await service.execute({}, ctx);
		expect(response.circuits["example.com"]?.state).toBe("open");
		expect(fetchMock).toHaveBeenCalledTimes(2);
		vi.useRealTimers();
	});
});
