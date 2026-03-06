import { describe, expect, it } from "vitest";
import { LLMOSKernel } from "../kernel/index.js";
import { EventBus } from "../kernel/event-bus.js";
import { NetService } from "../net-service/index.js";
import { NotificationService } from "../notification-service/index.js";
import { PolicyEngine } from "../kernel/policy-engine.js";
import { SchedulerService } from "../scheduler-service/index.js";
import { SecurityService } from "../security-service/index.js";
import { TenantQuotaGovernor } from "../kernel/resource-governor.js";
import { OSError } from "../kernel/errors.js";
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
	createSystemAlertsReportService,
	createSystemAlertsReportCompactService,
	createSystemAlertsFlappingService,
	createSystemAlertsTimelineService,
	createSystemAlertsHotspotsService,
	createSystemAlertsRecommendationsService,
	createSystemAlertsFeedService,
	createSystemAlertsBacklogService,
	createSystemAlertsBreachesService,
	createSystemAlertsHealthService,
	createSystemAlertsAutoRemediatePlanService,
	createSystemAlertsAutoRemediateExecuteService,
	createSystemAlertsAutoRemediateAuditService,
	createSystemPolicyUpdateService,
	createSystemPolicyVersionCreateService,
	createSystemPolicyVersionListService,
	createSystemPolicyVersionRollbackService,
	createSystemPolicySimulateBatchService,
	createSystemPolicyGuardApplyService,
	createSystemSLOService,
	createSystemSLORulesUpsertService,
	createSystemSLORulesListService,
	createSystemSLORulesEvaluateService,
	createSystemAuditExportService,
	createSystemAuditKeysRotateService,
	createSystemAuditKeysListService,
	createSystemAuditKeysActivateService,
	createSystemQuotaService,
	createSystemQuotaAdjustService,
	createSystemQuotaPolicyUpsertService,
	createSystemQuotaPolicyListService,
	createSystemQuotaPolicyApplyService,
	createSystemQuotaHotspotsService,
	createSystemQuotaHotspotsIsolateService,
	createSystemChaosRunService,
	createSystemChaosBaselineCaptureService,
	createSystemChaosBaselineVerifyService,
	createSystemGovernanceStateExportService,
	createSystemGovernanceStateImportService,
	createSystemGovernanceStatePersistService,
	createSystemGovernanceStateRecoverService,
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
		expect(response.byReason.boom).toBe(1);
		expect(response.topReasons[0]?.reason).toBe("boom");
		expect(response.topReasons[0]?.count).toBe(1);
		expect(response.byService["err.demo"]?.total).toBe(1);
		expect(response.byService["err.demo"]?.byErrorCode.E_SERVICE_EXECUTION).toBe(1);
		expect(response.recent[0]?.service).toBe("err.demo");
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

	it("returns unified alert report", async () => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date("2026-01-01T00:00:00.000Z"));
		const bus = new EventBus();
		const notification = new NotificationService(bus, {
			dedupeWindowMs: 1000,
			rateLimit: { limit: 10, windowMs: 60000 },
		});
		notification.send({ topic: "system.alert", message: "db down", severity: "critical" });
		notification.send({ topic: "system.alert", message: "disk high", severity: "warning" });
		const first = notification.query({ topic: "system.alert", limit: 1 })[0];
		if (first) {
			vi.setSystemTime(new Date("2026-01-01T00:00:05.000Z"));
			notification.ack({ id: first.id });
		}

		const service = createSystemAlertsReportService(notification);
		const response = await service.execute(
			{ topic: "system.alert", windowMinutes: 60 },
			{
				appId: "app.demo",
				sessionId: "s23",
				permissions: ["system:read"],
				workingDirectory: process.cwd(),
			},
		);
		expect(response.policy.dedupeWindowMs).toBe(1000);
		expect(typeof response.stats.sent).toBe("number");
		expect(typeof response.trends.total).toBe("number");
		expect(typeof response.slo.avgAckLatencyMs).toBe("number");
		expect(typeof response.digest).toBe("string");
		vi.useRealTimers();
	});

	it("returns compact alert report", async () => {
		const bus = new EventBus();
		const notification = new NotificationService(bus);
		notification.send({ topic: "system.alert", message: "db down", severity: "critical" });
		const service = createSystemAlertsReportCompactService(notification);
		const response = await service.execute(
			{ topic: "system.alert", windowMinutes: 60 },
			{
				appId: "app.demo",
				sessionId: "s24",
				permissions: ["system:read"],
				workingDirectory: process.cwd(),
			},
		);
		expect(typeof response.summary).toBe("string");
		expect(response.summary).toContain("total=");
	});

	it("detects flapping alerts", async () => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date("2026-01-01T00:00:00.000Z"));
		const bus = new EventBus();
		const notification = new NotificationService(bus);
		notification.send({ topic: "system.alert", message: "db down", severity: "critical" });
		vi.setSystemTime(new Date("2026-01-01T00:00:10.000Z"));
		notification.send({ topic: "system.alert", message: "db down", severity: "critical" });
		vi.setSystemTime(new Date("2026-01-01T00:00:20.000Z"));
		notification.send({ topic: "system.alert", message: "db down", severity: "critical" });
		vi.setSystemTime(new Date("2026-01-01T00:01:00.000Z"));

		const service = createSystemAlertsFlappingService(notification);
		const response = await service.execute(
			{ windowMinutes: 2, threshold: 3 },
			{
				appId: "app.demo",
				sessionId: "s25",
				permissions: ["system:read"],
				workingDirectory: process.cwd(),
			},
		);
		expect(response.total).toBe(1);
		expect(response.items[0]?.message).toBe("db down");
		vi.useRealTimers();
	});

	it("returns alerts timeline buckets", async () => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date("2026-01-01T00:00:00.000Z"));
		const bus = new EventBus();
		const notification = new NotificationService(bus);
		notification.send({ topic: "system.alert", message: "t1", severity: "critical" });
		vi.setSystemTime(new Date("2026-01-01T00:00:30.000Z"));
		notification.send({ topic: "system.alert", message: "t2", severity: "error" });
		vi.setSystemTime(new Date("2026-01-01T00:01:10.000Z"));
		notification.send({ topic: "system.alert", message: "t3", severity: "warning" });
		vi.setSystemTime(new Date("2026-01-01T00:02:00.000Z"));

		const service = createSystemAlertsTimelineService(notification);
		const response = await service.execute(
			{ windowMinutes: 2, bucketMinutes: 1, topic: "system.alert" },
			{
				appId: "app.demo",
				sessionId: "s26",
				permissions: ["system:read"],
				workingDirectory: process.cwd(),
			},
		);
		expect(response.buckets.length).toBe(2);
		expect(response.buckets[0]?.total).toBe(2);
		expect(response.buckets[1]?.total).toBe(1);
		vi.useRealTimers();
	});

	it("returns alert hotspots with growth delta", async () => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date("2026-01-01T00:00:00.000Z"));
		const bus = new EventBus();
		const notification = new NotificationService(bus);

		vi.setSystemTime(new Date("2026-01-01T00:05:00.000Z"));
		notification.send({ topic: "system.alert", message: "db down", severity: "critical" }); // previous window

		vi.setSystemTime(new Date("2026-01-01T00:12:00.000Z"));
		notification.send({ topic: "system.alert", message: "db down", severity: "critical" });
		notification.send({ topic: "system.alert", message: "db down", severity: "critical" });
		notification.send({ topic: "system.alert", message: "cache miss", severity: "warning" });

		vi.setSystemTime(new Date("2026-01-01T00:15:00.000Z"));
		const service = createSystemAlertsHotspotsService(notification);
		const response = await service.execute(
			{ windowMinutes: 5, topic: "system.alert", limit: 5 },
			{
				appId: "app.demo",
				sessionId: "s27",
				permissions: ["system:read"],
				workingDirectory: process.cwd(),
			},
		);
		expect(response.items[0]?.message).toBe("db down");
		expect(response.items[0]?.currentCount).toBe(2);
		expect(response.items[0]?.previousCount).toBe(1);
		expect(response.items[0]?.delta).toBe(1);
		vi.useRealTimers();
	});

	it("returns actionable alert recommendations", async () => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date("2026-01-01T00:00:00.000Z"));
		const bus = new EventBus();
		const notification = new NotificationService(bus);
		notification.send({ topic: "system.alert", message: "db down", severity: "critical" });
		notification.send({ topic: "system.alert", message: "db down", severity: "critical" });
		notification.send({ topic: "system.alert", message: "disk high", severity: "warning" });
		vi.setSystemTime(new Date("2026-01-01T00:02:00.000Z"));

		const service = createSystemAlertsRecommendationsService(notification);
		const response = await service.execute(
			{ topic: "system.alert", windowMinutes: 5 },
			{
				appId: "app.demo",
				sessionId: "s28",
				permissions: ["system:read"],
				workingDirectory: process.cwd(),
			},
		);
		expect(response.recommendations.length).toBeGreaterThan(0);
		expect(response.recommendations[0]?.title.length).toBeGreaterThan(0);
		vi.useRealTimers();
	});

	it("returns paginated alert feed", async () => {
		const bus = new EventBus();
		const notification = new NotificationService(bus);
		notification.send({ topic: "system.alert", message: "f1", severity: "error" });
		notification.send({ topic: "system.alert", message: "f2", severity: "warning" });
		notification.send({ topic: "system.alert", message: "f3", severity: "critical" });

		const service = createSystemAlertsFeedService(notification);
		const response = await service.execute(
			{ topic: "system.alert", offset: 0, limit: 2 },
			{
				appId: "app.demo",
				sessionId: "s29",
				permissions: ["system:read"],
				workingDirectory: process.cwd(),
			},
		);
		expect(response.total).toBe(3);
		expect(response.items).toHaveLength(2);
		expect(response.items[0]?.message).toBe("f3");
		expect(response.hasMore).toBe(true);
	});

	it("returns alert governance breaches by thresholds", async () => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date("2026-01-01T00:00:00.000Z"));
		const bus = new EventBus();
		const notification = new NotificationService(bus);
		notification.send({ topic: "system.alert", message: "db down", severity: "critical" });
		notification.send({ topic: "system.alert", message: "cache fail", severity: "critical" });
		const first = notification.query({ topic: "system.alert", limit: 1 })[0];
		vi.setSystemTime(new Date("2026-01-01T00:00:10.000Z"));
		if (first) {
			notification.ack({ id: first.id });
		}

		const service = createSystemAlertsBreachesService(notification);
		const response = await service.execute(
			{
				windowMinutes: 10,
				criticalThreshold: 1,
				unackedThreshold: 0,
				ackP95ThresholdMs: 5000,
				topic: "system.alert",
			},
			{
				appId: "app.demo",
				sessionId: "s30",
				permissions: ["system:read"],
				workingDirectory: process.cwd(),
			},
		);
		expect(response.breaches.length).toBeGreaterThan(0);
		expect(response.breaches.some((b) => b.metric === "critical_count")).toBe(true);
		expect(response.breaches.some((b) => b.metric === "ack_p95_ms")).toBe(true);
		vi.useRealTimers();
	});

	it("returns alert backlog age and overdue stats", async () => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date("2026-01-01T00:00:00.000Z"));
		const bus = new EventBus();
		const notification = new NotificationService(bus);
		notification.send({ topic: "system.alert", message: "b1", severity: "error" });
		vi.setSystemTime(new Date("2026-01-01T00:00:10.000Z"));
		notification.send({ topic: "system.alert", message: "b2", severity: "critical" });
		const ackCandidate = notification.query({ topic: "system.alert", severity: "critical", limit: 1 })[0];
		if (ackCandidate) {
			notification.ack({ id: ackCandidate.id });
		}
		vi.setSystemTime(new Date("2026-01-01T00:02:00.000Z"));

		const service = createSystemAlertsBacklogService(notification);
		const response = await service.execute(
			{ topic: "system.alert", overdueThresholdMs: 60_000 },
			{
				appId: "app.demo",
				sessionId: "s31",
				permissions: ["system:read"],
				workingDirectory: process.cwd(),
			},
		);
		expect(response.totalUnacked).toBe(1);
		expect(response.oldestUnackedAgeMs).toBe(120000);
		expect(response.newestUnackedAgeMs).toBe(120000);
		expect(response.overdueCount).toBe(1);
		expect(response.bySeverity.error).toBe(1);
		vi.useRealTimers();
	});

	it("returns alert health score and level", async () => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date("2026-01-01T00:00:00.000Z"));
		const bus = new EventBus();
		const notification = new NotificationService(bus, {
			rateLimit: { limit: 1, windowMs: 60000 },
		});
		notification.send({ topic: "system.alert", message: "h1", severity: "critical" });
		notification.send({ topic: "system.alert", message: "h2", severity: "critical" }); // dropped by rate limit
		vi.setSystemTime(new Date("2026-01-01T00:01:00.000Z"));

		const service = createSystemAlertsHealthService(notification);
		const response = await service.execute(
			{
				topic: "system.alert",
				windowMinutes: 5,
				criticalThreshold: 0,
				unackedThreshold: 0,
				dropRateThreshold: 0,
			},
			{
				appId: "app.demo",
				sessionId: "s32",
				permissions: ["system:read"],
				workingDirectory: process.cwd(),
			},
		);
		expect(response.score).toBeLessThan(100);
		expect(["healthy", "degraded", "critical"]).toContain(response.level);
		expect(response.indicators.criticalCount).toBe(1);
		expect(response.indicators.unackedCount).toBe(1);
		expect(response.indicators.dropRate).toBeGreaterThan(0);
		vi.useRealTimers();
	});

	it("creates auto-remediation plan and executes in dry-run/approved mode", async () => {
		vi.useFakeTimers();
		const bus = new EventBus();
		const notification = new NotificationService(bus);
		notification.send({ topic: "system.alert", message: "p1", severity: "critical" });
		const net = new NetService(new PolicyEngine(), new SecurityService(), undefined, {
			circuitBreaker: { failureThreshold: 1, cooldownMs: 1000 },
		});
		vi.spyOn(globalThis, "fetch").mockRejectedValueOnce(new Error("net-fail"));
		await expect(
			net.request(
				{ url: "https://example.com" },
				{
					appId: "app.demo",
					sessionId: "s33",
					permissions: ["net:request", "system:read", "system:write"],
					workingDirectory: process.cwd(),
				},
			),
		).rejects.toThrow();
		const scheduler = new SchedulerService();
		scheduler.scheduleRetryable(
			"remediate-fail",
			async () => {
				throw new Error("x");
			},
			{ maxRetries: 0, backoffMs: 1 },
		);
		await vi.advanceTimersByTimeAsync(5);

		const planService = createSystemAlertsAutoRemediatePlanService(notification, scheduler, net);
		const plan = await planService.execute(
			{ topic: "system.alert" },
			{
				appId: "app.demo",
				sessionId: "s33",
				permissions: ["system:read", "system:write"],
				workingDirectory: process.cwd(),
			},
		);
		expect(plan.actions.length).toBeGreaterThan(0);
		const executeService = createSystemAlertsAutoRemediateExecuteService(notification, scheduler, net);
		const denied = await executeService.execute(
			{ approved: false, actions: plan.actions },
			{
				appId: "app.demo",
				sessionId: "s33",
				permissions: ["system:write"],
				workingDirectory: process.cwd(),
			},
		);
		expect(denied.approved).toBe(false);
		const executed = await executeService.execute(
			{
				approved: true,
				dryRun: true,
				approver: "ops.lead",
				approvalExpiresAt: new Date(Date.now() + 60000).toISOString(),
				actions: plan.actions,
			},
			{
				appId: "app.demo",
				sessionId: "s33",
				permissions: ["system:write"],
				workingDirectory: process.cwd(),
			},
		);
		expect(executed.executed).toBe(plan.actions.length);
		const auditService = createSystemAlertsAutoRemediateAuditService();
		const audit = await auditService.execute(
			{ limit: 10 },
			{
				appId: "app.demo",
				sessionId: "s33",
				permissions: ["system:read"],
				workingDirectory: process.cwd(),
			},
		);
		expect(audit.records.length).toBeGreaterThan(0);
		vi.useRealTimers();
	});

	it("rejects remediation execute when approval metadata is missing or expired", async () => {
		const bus = new EventBus();
		const notification = new NotificationService(bus);
		const scheduler = new SchedulerService();
		const net = new NetService(new PolicyEngine(), new SecurityService());
		const executeService = createSystemAlertsAutoRemediateExecuteService(notification, scheduler, net);
		const noApprover = await executeService.execute(
			{
				approved: true,
				approvalExpiresAt: new Date(Date.now() + 60000).toISOString(),
				actions: [],
			},
			{
				appId: "app.demo",
				sessionId: "s33b",
				permissions: ["system:write"],
				workingDirectory: process.cwd(),
			},
		);
		expect(noApprover.approved).toBe(false);
		const expired = await executeService.execute(
			{
				approved: true,
				approver: "ops.lead",
				approvalExpiresAt: new Date(Date.now() - 1000).toISOString(),
				actions: [],
			},
			{
				appId: "app.demo",
				sessionId: "s33b",
				permissions: ["system:write"],
				workingDirectory: process.cwd(),
			},
		);
		expect(expired.approved).toBe(false);
	});

	it("supports policy versioning and rollback", async () => {
		const kernel = new LLMOSKernel();
		const createVersion = createSystemPolicyVersionCreateService(kernel);
		const listVersion = createSystemPolicyVersionListService(kernel);
		const updatePolicy = createSystemPolicyUpdateService(kernel);
		const rollback = createSystemPolicyVersionRollbackService(kernel);
		const base = await createVersion.execute(
			{ label: "base" },
			{ appId: "app.demo", sessionId: "s34", permissions: ["system:write", "system:read"], workingDirectory: process.cwd() },
		);
		await updatePolicy.execute(
			{ patch: { networkRule: { denyDomains: ["deny.example"] } }, createVersionLabel: "deny" },
			{ appId: "app.demo", sessionId: "s34", permissions: ["system:write"], workingDirectory: process.cwd() },
		);
		const listed = await listVersion.execute(
			{},
			{ appId: "app.demo", sessionId: "s34", permissions: ["system:read"], workingDirectory: process.cwd() },
		);
		expect(listed.versions.length).toBeGreaterThan(1);
		const rolled = await rollback.execute(
			{ versionId: base.versionId },
			{ appId: "app.demo", sessionId: "s34", permissions: ["system:write"], workingDirectory: process.cwd() },
		);
		expect(rolled.rolledBack).toBe(true);
	});

	it("simulates policy in batch mode", async () => {
		const kernel = new LLMOSKernel();
		const service = createSystemPolicySimulateBatchService(kernel);
		const response = await service.execute(
			{ inputs: [{ command: "echo ok" }, { command: "rm -rf /" }] },
			{ appId: "app.demo", sessionId: "s35", permissions: ["system:read"], workingDirectory: process.cwd() },
		);
		expect(response.total).toBe(2);
		expect(response.denied).toBe(1);
	});

	it("guards policy change by pre-simulation and post-health rollback", async () => {
		const kernel = new LLMOSKernel();
		const guard = createSystemPolicyGuardApplyService(kernel);
		const denied = await guard.execute(
			{
				patch: { networkRule: { denyDomains: ["a.local"] } },
				simulationInputs: [{ command: "rm -rf /" }],
				requireAllSimulationsAllowed: true,
			},
			{ appId: "app.demo", sessionId: "s35b", permissions: ["system:write"], workingDirectory: process.cwd() },
		);
		expect(denied.applied).toBe(false);
		expect(denied.reason).toBe("simulation_denied");

		kernel.registerService({
			name: "guard.fail",
			requiredPermissions: [],
			execute: async () => {
				throw new Error("boom");
			},
		});
		await expect(
			kernel.execute("guard.fail", {}, { appId: "app.demo", sessionId: "s35b", permissions: [], workingDirectory: process.cwd() }),
		).rejects.toThrow();
		const rolled = await guard.execute(
			{
				patch: { networkRule: { denyDomains: ["b.local"] } },
				healthCheck: { maxErrorRate: 0 },
			},
			{ appId: "app.demo", sessionId: "s35b", permissions: ["system:write"], workingDirectory: process.cwd() },
		);
		expect(rolled.applied).toBe(false);
		expect(rolled.rolledBack).toBe(true);
	});

	it("returns global slo and alerting metrics", async () => {
		const kernel = new LLMOSKernel();
		kernel.registerService({
			name: "slo.demo",
			requiredPermissions: [],
			execute: async () => ({ ok: true }),
		});
		await kernel.execute("slo.demo", {}, { appId: "app.demo", sessionId: "s36", permissions: [], workingDirectory: process.cwd() });
		const bus = new EventBus();
		const notification = new NotificationService(bus);
		notification.send({ topic: "system.alert", message: "slo1", severity: "error" });
		const service = createSystemSLOService(kernel, notification);
		const response = await service.execute(
			{},
			{ appId: "app.demo", sessionId: "s36", permissions: ["system:read"], workingDirectory: process.cwd() },
		);
		expect(response.global.total).toBeGreaterThan(0);
		expect(typeof response.alerting.p95AckLatencyMs).toBe("number");
	});

	it("manages and evaluates slo threshold rules", async () => {
		const kernel = new LLMOSKernel();
		kernel.registerService({
			name: "slo.rules.fail",
			requiredPermissions: [],
			execute: async () => {
				throw new Error("boom");
			},
		});
		await expect(
			kernel.execute("slo.rules.fail", {}, { appId: "app.demo", sessionId: "s36b", permissions: [], workingDirectory: process.cwd() }),
		).rejects.toThrow();
		const notification = new NotificationService(new EventBus());
		const upsert = createSystemSLORulesUpsertService();
		const list = createSystemSLORulesListService();
		const evaluate = createSystemSLORulesEvaluateService(kernel, notification);
		await upsert.execute(
			{
				rule: {
					id: "r-error",
					metric: "global_error_rate",
					operator: "gt",
					threshold: 0,
					severity: "warning",
				},
			},
			{ appId: "app.demo", sessionId: "s36b", permissions: ["system:write"], workingDirectory: process.cwd() },
		);
		const rules = await list.execute(
			{},
			{ appId: "app.demo", sessionId: "s36b", permissions: ["system:read"], workingDirectory: process.cwd() },
		);
		expect(rules.rules.some((item) => item.id === "r-error")).toBe(true);
		const result = await evaluate.execute(
			{},
			{ appId: "app.demo", sessionId: "s36b", permissions: ["system:read"], workingDirectory: process.cwd() },
		);
		expect(result.breaches.some((item) => item.ruleId === "r-error")).toBe(true);
	});

	it("exports audit incrementally with signature", async () => {
		const kernel = new LLMOSKernel();
		kernel.registerService({ name: "audit.demo", requiredPermissions: [], execute: async () => ({ ok: true }) });
		await kernel.execute("audit.demo", {}, { appId: "app.demo", sessionId: "s37", permissions: [], workingDirectory: process.cwd() });
		const security = new SecurityService();
		const service = createSystemAuditExportService(kernel, security);
		const response = await service.execute(
			{ limit: 10, compress: true, signingSecret: "k1" },
			{ appId: "app.demo", sessionId: "s37", permissions: ["system:read"], workingDirectory: process.cwd() },
		);
		expect(response.exported).toBeGreaterThan(0);
		expect(response.compressed).toBe(true);
		expect(security.verify(response.content, "k1", response.signature)).toBe(true);
		await expect(
			service.execute(
				{ format: "xml" as "jsonl" },
				{ appId: "app.demo", sessionId: "s37", permissions: ["system:read"], workingDirectory: process.cwd() },
			),
		).rejects.toMatchObject({ code: "E_VALIDATION_FAILED" } satisfies Partial<OSError>);
	});

	it("rotates and activates audit signing keys", async () => {
		const rotate = createSystemAuditKeysRotateService();
		const list = createSystemAuditKeysListService();
		const activate = createSystemAuditKeysActivateService();
		await rotate.execute(
			{ keyId: "k-2026-01", secret: "secret-1", setActive: true },
			{ appId: "app.demo", sessionId: "s37b", permissions: ["system:write"], workingDirectory: process.cwd() },
		);
		const listed = await list.execute(
			{},
			{ appId: "app.demo", sessionId: "s37b", permissions: ["system:read"], workingDirectory: process.cwd() },
		);
		expect(listed.activeKeyId).toBe("k-2026-01");
		const switched = await activate.execute(
			{ keyId: "default" },
			{ appId: "app.demo", sessionId: "s37b", permissions: ["system:write"], workingDirectory: process.cwd() },
		);
		expect(switched.activated).toBe(true);
	});

	it("adjusts dynamic tenant quota", async () => {
		const governor = new TenantQuotaGovernor();
		governor.setQuota("tenant-1", { maxToolCalls: 100, maxTokens: 1000 });
		const quotaService = createSystemQuotaService(governor);
		const adjustService = createSystemQuotaAdjustService(governor);
		const before = await quotaService.execute(
			{ tenantId: "tenant-1" },
			{ appId: "app.demo", sessionId: "s38", permissions: ["system:read"], workingDirectory: process.cwd() },
		);
		expect(before.quota?.maxToolCalls).toBe(100);
		await adjustService.execute(
			{ tenantId: "tenant-1", loadFactor: 0.9, priority: "high" },
			{ appId: "app.demo", sessionId: "s38", permissions: ["system:write"], workingDirectory: process.cwd() },
		);
		const after = await quotaService.execute(
			{ tenantId: "tenant-1" },
			{ appId: "app.demo", sessionId: "s38", permissions: ["system:read"], workingDirectory: process.cwd() },
		);
		expect(after.quota?.maxToolCalls).toBeLessThan(100);
	});

	it("applies quota policy center and isolates hotspots", async () => {
		const governor = new TenantQuotaGovernor();
		governor.setQuota("tenant-pro", { maxToolCalls: 200, maxTokens: 20000 });
		const policyUpsert = createSystemQuotaPolicyUpsertService();
		const policyList = createSystemQuotaPolicyListService();
		const policyApply = createSystemQuotaPolicyApplyService(governor);
		await policyUpsert.execute(
			{
				policy: {
					id: "pro-peak",
					tier: "pro",
					priority: "high",
					loadMin: 0.8,
					quota: { maxToolCalls: 80, maxTokens: 8000 },
				},
			},
			{ appId: "app.demo", sessionId: "s38b", permissions: ["system:write"], workingDirectory: process.cwd() },
		);
		const policies = await policyList.execute(
			{},
			{ appId: "app.demo", sessionId: "s38b", permissions: ["system:read"], workingDirectory: process.cwd() },
		);
		expect(policies.policies.some((item) => item.id === "pro-peak")).toBe(true);
		const applied = await policyApply.execute(
			{ tenantId: "tenant-pro", tier: "pro", priority: "high", loadFactor: 0.9 },
			{ appId: "app.demo", sessionId: "s38b", permissions: ["system:write"], workingDirectory: process.cwd() },
		);
		expect(applied.matchedPolicyId).toBe("pro-peak");

		for (let i = 0; i < 25; i += 1) {
			try {
				governor.beforeExecute({
					serviceName: "store.set",
					context: {
						appId: "app.demo",
						sessionId: "s38b",
						tenantId: "tenant-pro",
						permissions: [],
						workingDirectory: process.cwd(),
					},
					request: { i },
				});
			} catch {
				break;
			}
		}
		const hotspotsService = createSystemQuotaHotspotsService(governor);
		const hotspots = await hotspotsService.execute(
			{ thresholdToolCalls: 10, limit: 5 },
			{ appId: "app.demo", sessionId: "s38b", permissions: ["system:read"], workingDirectory: process.cwd() },
		);
		expect(hotspots.hotspots.some((item) => item.tenantId === "tenant-pro")).toBe(true);
		const hotspotsDefault = await hotspotsService.execute(
			{ thresholdToolCalls: 0, limit: 5 },
			{ appId: "app.demo", sessionId: "s38b", permissions: ["system:read"], workingDirectory: process.cwd() },
		);
		expect(Array.isArray(hotspotsDefault.hotspots)).toBe(true);
		const isolateService = createSystemQuotaHotspotsIsolateService(governor);
		const isolated = await isolateService.execute(
			{ thresholdToolCalls: 10, reductionFactor: 0.5 },
			{ appId: "app.demo", sessionId: "s38b", permissions: ["system:write"], workingDirectory: process.cwd() },
		);
		expect(isolated.isolated.some((item) => item.tenantId === "tenant-pro")).toBe(true);
	});

	it("runs chaos drills", async () => {
		vi.useFakeTimers();
		const kernel = new LLMOSKernel();
		const bus = new EventBus();
		const notification = new NotificationService(bus);
		const scheduler = new SchedulerService();
		const service = createSystemChaosRunService(kernel, notification, scheduler);
		const policyDrill = await service.execute(
			{ scenario: "policy_denied" },
			{ appId: "app.demo", sessionId: "s39", permissions: ["system:write"], workingDirectory: process.cwd() },
		);
		expect(policyDrill.passed).toBe(true);
		const schedulerDrillPromise = service.execute(
			{ scenario: "scheduler_failure" },
			{ appId: "app.demo", sessionId: "s39", permissions: ["system:write"], workingDirectory: process.cwd() },
		);
		await vi.advanceTimersByTimeAsync(20);
		const schedulerDrill = await schedulerDrillPromise;
		expect(schedulerDrill.passed).toBe(true);
		const replayDrillPromise = service.execute(
			{ scenario: "scheduler_replay" },
			{ appId: "app.demo", sessionId: "s39", permissions: ["system:write"], workingDirectory: process.cwd() },
		);
		await vi.advanceTimersByTimeAsync(20);
		const replayDrill = await replayDrillPromise;
		expect(replayDrill.passed).toBe(true);
		const baselineCapture = createSystemChaosBaselineCaptureService(kernel);
		const baselineVerify = createSystemChaosBaselineVerifyService(kernel);
		await baselineCapture.execute(
			{ name: "default" },
			{ appId: "app.demo", sessionId: "s39", permissions: ["system:write"], workingDirectory: process.cwd() },
		);
		const baselineResult = await baselineVerify.execute(
			{ name: "default", maxErrorRateDelta: 1, maxFailureDelta: 100 },
			{ appId: "app.demo", sessionId: "s39", permissions: ["system:read"], workingDirectory: process.cwd() },
		);
		expect(baselineResult.passed).toBe(true);
		vi.useRealTimers();
	});

	it("exports/imports and persists governance state", async () => {
		const exportService = createSystemGovernanceStateExportService();
		const importService = createSystemGovernanceStateImportService();
		const rotate = createSystemAuditKeysRotateService();
		await rotate.execute(
			{ keyId: "gk-1", secret: "gs-1", setActive: true },
			{ appId: "app.demo", sessionId: "s40", permissions: ["system:write"], workingDirectory: process.cwd() },
		);
		const exported = await exportService.execute(
			{},
			{ appId: "app.demo", sessionId: "s40", permissions: ["system:read"], workingDirectory: process.cwd() },
		);
		expect(exported.state.activeAuditKeyId).toBe("gk-1");

		const fakeStore = new Map<string, unknown>();
		const persist = createSystemGovernanceStatePersistService(
			{
				set: (key, value) => {
					fakeStore.set(key, value);
				},
			},
			"gov.state",
		);
		await persist.execute(
			{},
			{ appId: "app.demo", sessionId: "s40", permissions: ["system:write"], workingDirectory: process.cwd() },
		);

		await importService.execute(
			{ state: { ...exported.state, activeAuditKeyId: "default" } },
			{ appId: "app.demo", sessionId: "s40", permissions: ["system:write"], workingDirectory: process.cwd() },
		);
		const recover = createSystemGovernanceStateRecoverService(
			{
				get: (key) => fakeStore.get(key),
			},
			"gov.state",
		);
		const recovered = await recover.execute(
			{},
			{ appId: "app.demo", sessionId: "s40", permissions: ["system:write"], workingDirectory: process.cwd() },
		);
		expect(recovered.recovered).toBe(true);
	});
});
