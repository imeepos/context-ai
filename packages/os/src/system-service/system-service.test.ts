import { describe, expect, it } from "vitest";
import { LLMOSKernel } from "../kernel/index.js";
import { EventBus } from "../kernel/event-bus.js";
import { NetService } from "../net-service/index.js";
import { NotificationService } from "../notification-service/index.js";
import { PolicyEngine } from "../kernel/policy-engine.js";
import { SchedulerService } from "../scheduler-service/index.js";
import { SecurityService } from "../security-service/index.js";
import { vi } from "vitest";
import {
	createSystemAuditService,
	createSystemCapabilitiesService,
	createSystemCapabilitiesListService,
	createSystemErrorsService,
	createSystemEventsService,
	createSystemMetricsService,
	createSystemAlertsService,
	createSystemAlertsClearService,
	createSystemAlertsExportService,
	createSystemAlertsStatsService,
	createSystemAlertsTopicsService,
	createSystemAlertsUnackedService,
	createSystemAlertsPolicyService,
	createSystemAlertsTrendsService,
	createSystemAlertsSLOService,
	createSystemAlertsIncidentsService,
	createSystemAlertsDigestService,
	createSystemNetCircuitService,
	createSystemNetCircuitResetService,
	createSystemPolicyEvaluateService,
	createSystemPolicyService,
	createSystemSchedulerFailuresService,
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
		expect(response.resilience.openNetCircuits).toBe(0);
		expect(response.resilience.schedulerFailures).toBe(0);
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

	it("resets network circuit breaker state", async () => {
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
			sessionId: "s10b",
			permissions: ["system:read", "net:request"],
			workingDirectory: process.cwd(),
		};
		await expect(net.request({ url: "https://example.com" }, ctx)).rejects.toThrow("e1");
		await expect(net.request({ url: "https://example.com" }, ctx)).rejects.toThrow("e2");
		const resetService = createSystemNetCircuitResetService(net);
		const reset = await resetService.execute({ host: "example.com" }, ctx);
		expect(reset.cleared).toBe(1);
		const snapshotService = createSystemNetCircuitService(net);
		const snapshot = await snapshotService.execute({}, ctx);
		expect(snapshot.circuits["example.com"]).toBeUndefined();
		expect(fetchMock).toHaveBeenCalledTimes(2);
		vi.useRealTimers();
	});

	it("returns scheduler dead letter failures", async () => {
		vi.useFakeTimers();
		const scheduler = new SchedulerService();
		scheduler.scheduleRetryable(
			"dlq-1",
			async () => {
				throw new Error("dlq-error");
			},
			{ maxRetries: 0, backoffMs: 10 },
		);
		await vi.advanceTimersByTimeAsync(20);
		const service = createSystemSchedulerFailuresService(scheduler);
		const response = await service.execute(
			{ id: "dlq-1", limit: 10 },
			{
				appId: "app.demo",
				sessionId: "s11",
				permissions: ["system:read"],
				workingDirectory: process.cwd(),
			},
		);
		expect(response.failures).toHaveLength(1);
		expect(response.failures[0]?.id).toBe("dlq-1");
		const none = await service.execute(
			{ id: "unknown", limit: 10 },
			{
				appId: "app.demo",
				sessionId: "s11",
				permissions: ["system:read"],
				workingDirectory: process.cwd(),
			},
		);
		expect(none.failures).toHaveLength(0);
		vi.useRealTimers();
	});

	it("returns system alerts aggregation", async () => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date("2026-01-01T00:00:00.000Z"));
		const bus = new EventBus();
		const notification = new NotificationService(bus);
		notification.send({ topic: "system.alert", message: "a1", severity: "error" });
		vi.setSystemTime(new Date("2026-01-01T00:00:10.000Z"));
		notification.send({ topic: "system.alert", message: "a2", severity: "critical" });
		notification.send({ topic: "business.info", message: "x", severity: "info" });

		const service = createSystemAlertsService(notification);
		const response = await service.execute(
			{ topic: "system.alert", limit: 10 },
			{
				appId: "app.demo",
				sessionId: "s12",
				permissions: ["system:read"],
				workingDirectory: process.cwd(),
			},
		);
		expect(response.total).toBe(2);
		expect(response.bySeverity.error).toBe(1);
		expect(response.bySeverity.critical).toBe(1);
		const windowed = await service.execute(
			{
				topic: "system.alert",
				since: "2026-01-01T00:00:05.000Z",
				until: "2026-01-01T00:00:20.000Z",
			},
			{
				appId: "app.demo",
				sessionId: "s12",
				permissions: ["system:read"],
				workingDirectory: process.cwd(),
			},
		);
		expect(windowed.total).toBe(1);
		expect(windowed.alerts[0]?.message).toBe("a2");
		vi.useRealTimers();
	});

	it("clears system alerts by filters", async () => {
		const bus = new EventBus();
		const notification = new NotificationService(bus);
		notification.send({ topic: "system.alert", message: "a1", severity: "error" });
		notification.send({ topic: "system.alert", message: "a2", severity: "critical" });
		notification.send({ topic: "business.info", message: "x", severity: "info" });

		const service = createSystemAlertsClearService(notification);
		const response = await service.execute(
			{ topic: "system.alert", severity: "error" },
			{
				appId: "app.demo",
				sessionId: "s13",
				permissions: ["system:read"],
				workingDirectory: process.cwd(),
			},
		);
		expect(response.cleared).toBe(1);
		expect(notification.query({ topic: "system.alert" })).toHaveLength(1);
	});

	it("exports alerts as json and csv", async () => {
		const bus = new EventBus();
		const notification = new NotificationService(bus);
		notification.send({ topic: "system.alert", message: "a1", severity: "error" });
		notification.send({ topic: "system.alert", message: "a2", severity: "critical" });

		const service = createSystemAlertsExportService(notification);
		const json = await service.execute(
			{ topic: "system.alert", format: "json" },
			{
				appId: "app.demo",
				sessionId: "s14",
				permissions: ["system:read"],
				workingDirectory: process.cwd(),
			},
		);
		expect(json.contentType).toBe("application/json");
		expect(json.content).toContain("\"topic\":\"system.alert\"");

		const csv = await service.execute(
			{ topic: "system.alert", format: "csv" },
			{
				appId: "app.demo",
				sessionId: "s14",
				permissions: ["system:read"],
				workingDirectory: process.cwd(),
			},
		);
		expect(csv.contentType).toBe("text/csv");
		expect(csv.content.split("\n")[0]).toBe("timestamp,topic,severity,message");
		expect(csv.content).toContain("system.alert");
	});

	it("returns system alert stats", async () => {
		vi.useFakeTimers();
		const bus = new EventBus();
		const notification = new NotificationService(bus, {
			rateLimit: { limit: 1, windowMs: 1000 },
		});
		notification.send({ topic: "system.alert", message: "a1", severity: "error" });
		notification.send({ topic: "system.alert", message: "a2", severity: "error" });

		const service = createSystemAlertsStatsService(notification);
		const response = await service.execute(
			{},
			{
				appId: "app.demo",
				sessionId: "s15",
				permissions: ["system:read"],
				workingDirectory: process.cwd(),
			},
		);
		expect(response.stats.sent).toBe(1);
		expect(response.stats.dropped.rateLimited).toBe(1);
		vi.useRealTimers();
	});

	it("returns alert topic aggregates", async () => {
		vi.useFakeTimers();
		const bus = new EventBus();
		const notification = new NotificationService(bus, {
			rateLimit: { limit: 1, windowMs: 1000 },
		});
		notification.send({ topic: "system.alert", message: "a1", severity: "error" });
		notification.send({ topic: "system.alert", message: "a2", severity: "error" });
		notification.send({ topic: "ops.alert", message: "b1", severity: "warning" });

		const service = createSystemAlertsTopicsService(notification);
		const response = await service.execute(
			{},
			{
				appId: "app.demo",
				sessionId: "s16",
				permissions: ["system:read"],
				workingDirectory: process.cwd(),
			},
		);
		expect(response.topics["system.alert"]?.sent).toBe(1);
		expect(response.topics["system.alert"]?.dropped).toBe(1);
		expect(response.topics["ops.alert"]?.sent).toBe(1);
		vi.useRealTimers();
	});

	it("returns unacked alerts", async () => {
		const bus = new EventBus();
		const notification = new NotificationService(bus);
		notification.send({ topic: "system.alert", message: "u1", severity: "error" });
		notification.send({ topic: "system.alert", message: "u2", severity: "error" });
		const first = notification.query({ topic: "system.alert", limit: 1 })[0];
		if (first) {
			notification.ack({ id: first.id });
		}
		const service = createSystemAlertsUnackedService(notification);
		const response = await service.execute(
			{ topic: "system.alert" },
			{
				appId: "app.demo",
				sessionId: "s17",
				permissions: ["system:read"],
				workingDirectory: process.cwd(),
			},
		);
		expect(response.total).toBe(1);
	});

	it("returns alert policy snapshot", async () => {
		const bus = new EventBus();
		const notification = new NotificationService(bus, {
			dedupeWindowMs: 1000,
			rateLimit: { limit: 2, windowMs: 5000 },
			retentionLimit: 100,
		});
		const service = createSystemAlertsPolicyService(notification);
		const response = await service.execute(
			{},
			{
				appId: "app.demo",
				sessionId: "s18",
				permissions: ["system:read"],
				workingDirectory: process.cwd(),
			},
		);
		expect(response.policy.dedupeWindowMs).toBe(1000);
		expect(response.policy.rateLimit?.limit).toBe(2);
		expect(response.policy.retentionLimit).toBe(100);
	});

	it("returns alert trends in time window", async () => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date("2026-01-01T00:00:00.000Z"));
		const bus = new EventBus();
		const notification = new NotificationService(bus);
		notification.send({ topic: "system.alert", message: "t1", severity: "error" });
		vi.setSystemTime(new Date("2026-01-01T00:01:00.000Z"));
		notification.send({ topic: "system.alert", message: "t2", severity: "critical" });
		vi.setSystemTime(new Date("2026-01-01T00:02:00.000Z"));
		notification.send({ topic: "system.alert", message: "t3", severity: "warning" });
		vi.setSystemTime(new Date("2026-01-01T00:03:00.000Z"));

		const service = createSystemAlertsTrendsService(notification);
		const response = await service.execute(
			{ windowMinutes: 2 },
			{
				appId: "app.demo",
				sessionId: "s19",
				permissions: ["system:read"],
				workingDirectory: process.cwd(),
			},
		);
		expect(response.total).toBe(2);
		expect(response.bySeverity.critical).toBe(1);
		expect(response.bySeverity.warning).toBe(1);
		vi.useRealTimers();
	});

	it("returns alert ack slo metrics", async () => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date("2026-01-01T00:00:00.000Z"));
		const bus = new EventBus();
		const notification = new NotificationService(bus);
		notification.send({ topic: "system.alert", message: "s1", severity: "error" });
		const firstId = notification.query({ limit: 1 })[0]?.id;
		vi.setSystemTime(new Date("2026-01-01T00:00:10.000Z"));
		if (firstId) notification.ack({ id: firstId });

		const service = createSystemAlertsSLOService(notification);
		const response = await service.execute(
			{},
			{
				appId: "app.demo",
				sessionId: "s20",
				permissions: ["system:read"],
				workingDirectory: process.cwd(),
			},
		);
		expect(response.ackedCount).toBe(1);
		expect(response.avgAckLatencyMs).toBe(10000);
		vi.useRealTimers();
	});

	it("returns grouped unacked alert incidents", async () => {
		const bus = new EventBus();
		const notification = new NotificationService(bus);
		notification.send({ topic: "system.alert", message: "db down", severity: "critical" });
		notification.send({ topic: "system.alert", message: "db down", severity: "critical" });
		notification.send({ topic: "system.alert", message: "disk high", severity: "warning" });
		const first = notification.query({ topic: "system.alert", severity: "critical", limit: 1 })[0];
		if (first) {
			notification.ack({ id: first.id });
		}

		const service = createSystemAlertsIncidentsService(notification);
		const response = await service.execute(
			{ topic: "system.alert" },
			{
				appId: "app.demo",
				sessionId: "s21",
				permissions: ["system:read"],
				workingDirectory: process.cwd(),
			},
		);
		expect(response.totalIncidents).toBe(2);
		const dbIncident = response.incidents.find((item) => item.message === "db down");
		expect(dbIncident?.count).toBe(1);
	});

	it("returns alert digest text", async () => {
		const bus = new EventBus();
		const notification = new NotificationService(bus);
		notification.send({ topic: "system.alert", message: "db down", severity: "critical" });
		notification.send({ topic: "system.alert", message: "disk high", severity: "warning" });
		const service = createSystemAlertsDigestService(notification);
		const response = await service.execute(
			{ topic: "system.alert", limit: 10 },
			{
				appId: "app.demo",
				sessionId: "s22",
				permissions: ["system:read"],
				workingDirectory: process.cwd(),
			},
		);
		expect(response.total).toBe(2);
		expect(response.digest).toContain("critical");
		expect(response.digest).toContain("db down");
	});
});
