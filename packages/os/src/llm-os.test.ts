import { describe, expect, it } from "vitest";
import { createDefaultLLMOS } from "./llm-os.js";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { vi } from "vitest";
import { OS_APP_RUNTIME_REGISTRY } from "./di/tokens.js";
import * as TOKENS from "./tokens.js";

async function writeMockPageModule(root: string): Promise<void> {
	await writeFile(
		join(root, "index.js"),
		[
			"export function createContext() {",
			"  return {",
			'    type: "Context",',
			"    props: {",
			'      name: "Mock Page",',
			'      description: "mock",',
			'      children: { type: "Text", props: { children: "mock page" } }',
			"    }",
			"  };",
			"}",
			"export default createContext;",
			"",
		].join("\n"),
		{ encoding: "utf8" },
	);
}

describe("createDefaultLLMOS", () => {
	it("installs system task app by default and supports uninstall/install", async () => {
		const root = await mkdtemp(join(tmpdir(), "os-system-task-"));
		try {
			const os = createDefaultLLMOS({ pathPolicy: { allow: [root], deny: [] } });
			const context = {
				appId: "admin",
				sessionId: "session-system-task",
				permissions: ["app:manage", "app:read", "system:read"],
				workingDirectory: root,
			};
			await os.kernel.execute(
				"app.install",
				{
					manifest: {
						id: "admin",
						name: "Admin",
						version: "1.0.0",
						entry: "index.js",
						permissions: context.permissions,
					},
				},
				context,
			);
			const routesBefore = await os.kernel.execute(TOKENS.SYSTEM_ROUTES, { prefix: "system://", limit: 10 }, context);
			expect(routesBefore.routes).toContain("system://task");

			await os.kernel.execute(TOKENS.APP_UNINSTALL, { appId: "system" }, context);
			const routesAfterUninstall = await os.kernel.execute(TOKENS.SYSTEM_ROUTES, { prefix: "system://", limit: 10 }, context);
			expect(routesAfterUninstall.routes).not.toContain("system://task");

			await os.kernel.execute(
				"app.install",
				{
					manifest: {
						id: "system",
						name: "System Task Alt",
						version: "2.0.0",
						entry: {
							pages: [
								{
									id: "task",
									route: "system://task",
									name: "Task",
									description: "Replacement task app",
									path: "index.js",
									default: true,
								},
							],
						},
						permissions: ["app:read", "model:invoke", "app:manage", "system:read"],
					},
				},
				context,
			);
			const routesAfterInstall = await os.kernel.execute(TOKENS.SYSTEM_ROUTES, { prefix: "system://", limit: 10 }, context);
			expect(routesAfterInstall.routes).toContain("system://task");
		} finally {
			await rm(root, { recursive: true, force: true });
		}
	});

	it("registers default services and executes store flow", async () => {
		const root = await mkdtemp(join(tmpdir(), "os-kernel-"));
		try {
			await writeMockPageModule(root);
			const os = createDefaultLLMOS({ pathPolicy: { allow: [root], deny: [] } });
			const context = {
				appId: "app.default",
				sessionId: "session-default",
				permissions: [
					"store:write",
					"store:read",
					"app:manage",
					"app:read",
					"model:invoke",
					"package:write",
					"package:read",
					"ui:render",
					"host:invoke",
					"media:read",
					"file:read",
					"net:request",
					"store:read",
					"system:read",
					"system:write",
					"scheduler:write",
					"scheduler:read",
					"notification:read",
					"notification:write",
					"shell:exec",
				],
				workingDirectory: root,
			};

			await os.kernel.execute(
				"app.install",
				{
					manifest: {
						id: "app.default",
						name: "Default",
						version: "1.0.0",
						entry: "index.js",
						permissions: context.permissions,
					},
				},
				context,
			);
			const manifestV1Payload = JSON.stringify({
				id: "app.v1",
				name: "V1",
				version: "1.0.0",
				pages: [
					{
						id: "main",
						route: "app.v1://main",
						name: "Main",
						description: "Main page",
						path: "index.js",
						tags: [],
						default: true,
					},
				],
				permissions: ["app:manage", "app:read"].sort(),
			});
			const signature = os.securityService.sign(manifestV1Payload, "v1-secret");
			await os.kernel.execute(
				"app.install.v1",
				{
					manifest: {
						id: "app.v1",
						name: "V1",
						version: "1.0.0",
						entry: {
							pages: [
								{
									id: "main",
									route: "app.v1://main",
									name: "Main",
									description: "Main page",
									path: "index.js",
									default: true,
								},
							],
						},
						permissions: ["app:manage", "app:read"],
						signing: { keyId: "v1", signature },
					},
					requireSignature: true,
					signingSecret: "v1-secret",
				},
				context,
			);
			const v1Caps = await os.kernel.execute(TOKENS.SYSTEM_CAPABILITIES, { appId: "app.v1" }, context);
			expect(v1Caps.capabilities).toContain("app:read");

			const notesInstall = await os.kernel.execute(
				"app.install",
				{
					manifest: {
						id: "app.notes",
						name: "Notes",
						version: "1.0.0",
						entry: "index.js",
						permissions: ["file:read"],
					},
				},
				context,
			);
			const notesRollback = await os.kernel.execute(
				"app.install.rollback",
				{ appId: "app.notes", rollbackToken: notesInstall.report.rollbackToken },
				context,
			);
			expect(notesRollback.uninstalled).toBe(true);
			const rollbackEvents = await os.kernel.execute(
				"notification.list",
				{ topic: "system.app.rollback", limit: 10 },
				context,
			);
			expect(rollbackEvents.notifications.length).toBeGreaterThan(0);
			const capsAfterRollback = await os.kernel.execute(TOKENS.SYSTEM_CAPABILITIES_LIST, {}, context);
			expect(capsAfterRollback.capabilitiesByApp["app.notes"]).toBeUndefined();
			expect(capsAfterRollback.capabilitiesByApp.system).toContain("model:invoke");
			const systemRoute = await os.kernel.execute(TOKENS.SYSTEM_ROUTES, { prefix: "system://", limit: 10 }, context);
			expect(systemRoute.routes).toContain("system://task");
			const apps = await os.kernel.execute(TOKENS.APP_LIST, { _: "list" }, context);
			expect(apps.apps).toHaveLength(3);
			const installEvents = await os.kernel.execute(TOKENS.NOTIFICATION_LIST, { topic: "system.app.install", limit: 10 }, context);
			expect(installEvents.notifications.length).toBeGreaterThan(0);
			const routes = await os.kernel.execute(
				"system.routes",
				{ appId: "app.default", prefix: "app.default://", offset: 0, limit: 10 },
				context,
			);
			expect(routes.total).toBeGreaterThan(0);
			const routeStats = await os.kernel.execute(TOKENS.SYSTEM_ROUTES_STATS, { appId: "app.default" }, context);
			expect(Array.isArray(routeStats.stats)).toBe(true);
			const installReport = await os.kernel.execute(TOKENS.SYSTEM_APP_INSTALL_REPORT, { appId: "app.v1" }, context);
			expect(installReport.rollbackToken).toContain("app.v1@1.0.0:");
			const startedV1 = await os.kernel.execute(TOKENS.APP_START, { appId: "app.v1" }, context);
			expect(startedV1.route).toBe("app.v1://main");

			await os.kernel.execute(TOKENS.STORE_SET, { key: "name", value: "ctp" }, context);
			const result = await os.kernel.execute(TOKENS.STORE_GET, { key: "name" }, context);
			expect(result.value).toBe("ctp");

			const model = await os.kernel.execute(TOKENS.MODEL_GENERATE, { model: "echo", prompt: "hi" }, context);
			expect(model.output).toBe("echo:hi");
			const task = await os.kernel.execute(
				"task.submit",
				{ text: "summarize todo status", route: "app.default://main", maxSteps: 1, stopCondition: "echo" },
				context,
			);
			expect(typeof task.result).toBe("string");
			expect(task.usedRoute).toBe("app.default://main");
			const decomposed = await os.kernel.execute(
				"task.decompose",
				{ text: "collect data, analyze, then summarize", maxParts: 5 },
				context,
			);
			expect(decomposed.tasks.length).toBeGreaterThan(1);
			const looped = await os.kernel.execute(
				"task.loop",
				{
					route: "app.default://main",
					taskGoal: "loop once",
					maxSteps: 1,
				},
				context,
			);
			expect(looped.steps).toBeGreaterThan(0);
			const riskConfirm = await os.kernel.execute(
				"runtime.risk.confirm",
				{
					riskLevel: "high",
					approved: true,
					approver: "ops",
					approvalExpiresAt: new Date(Date.now() + 60_000).toISOString(),
				},
				context,
			);
			expect(riskConfirm.allowed).toBe(true);
			const selectedApps = await os.kernel.execute(
				"planner.selectApps",
				{ text: "use default app to summarize", limit: 1 },
				context,
			);
			expect(selectedApps.selected.length).toBeGreaterThan(0);
			const composedTools = await os.kernel.execute(
				"planner.composeTools",
				{ routes: ["app.default://main"] },
				context,
			);
			expect(composedTools.composed.length).toBe(1);
			const runPlan = await os.kernel.execute(
				"runner.executePlan",
				{
					text: "run default route once",
					routes: ["app.default://main"],
					maxSteps: 1,
				},
				context,
			);
			expect(runPlan.steps).toBeGreaterThan(0);

			await os.kernel.execute(
				"package.install",
				{ package: { name: "demo", version: "1.0.0", source: "registry://demo" } },
				context,
			);
			const packages = await os.kernel.execute(TOKENS.PACKAGE_LIST, {}, context);
			expect(packages.packages).toHaveLength(1);

			const ui = await os.kernel.execute(
				"ui.render",
				{ screen: "home", tree: { type: "text", text: "hello" } },
				context,
			);
			expect(ui.schemaVersion).toBe("1.0");

			os.hostAdapters.register({
				name: "sensor",
				handle: async () => ({ value: 42 }),
			});
			const host = await os.kernel.execute(TOKENS.HOST_EXECUTE, { adapter: "sensor", action: "read" }, context);
			expect(host.result).toEqual({ value: 42 });

			const media = await os.kernel.execute(TOKENS.MEDIA_INSPECT, { path: "a.jpg" }, context);
			expect(media.kind).toBe("image");

			const listed = await os.kernel.execute(TOKENS.FILE_LIST, { path: root }, context);
			expect(Array.isArray(listed.entries)).toBe(true);

			vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(new Response("ok", { status: 200 }));
			await os.kernel.execute(TOKENS.NET_REQUEST, { url: "https://example.com" }, context);
			const journal = await os.kernel.execute(TOKENS.STORE_GET, { key: "net.journal" }, context);
			expect(Array.isArray(journal.value)).toBe(true);

			const health = await os.kernel.execute(TOKENS.SYSTEM_HEALTH, {}, context);
			expect(health.services.includes("system.health")).toBe(true);
			expect(Array.isArray(health.metrics)).toBe(true);
			const deps = await os.kernel.execute(TOKENS.SYSTEM_DEPENDENCIES, {}, context);
			expect(Object.keys(deps.graph).length).toBeGreaterThan(0);
			const metricsAll = await os.kernel.execute(TOKENS.SYSTEM_METRICS, {}, context);
			expect(Array.isArray(metricsAll.metrics)).toBe(true);
			const metricsOne = await os.kernel.execute(TOKENS.SYSTEM_METRICS, { service: "store.set" }, context);
			expect(metricsOne.metrics).toHaveLength(1);
			const auditAll = await os.kernel.execute(TOKENS.SYSTEM_AUDIT, { service: "store.set", limit: 5 }, context);
			expect(auditAll.records.length).toBeGreaterThan(0);
			const governanceState = await os.kernel.execute(TOKENS.SYSTEM_GOVERNANCE_STATE_EXPORT, {}, context);
			expect(typeof governanceState.state).toBe("object");
			const auditSession = await os.kernel.execute(TOKENS.SYSTEM_AUDIT, { sessionId: context.sessionId }, context);
			expect(auditSession.records.every((r) => r.sessionId === context.sessionId)).toBe(true);
			const topology = await os.kernel.execute(TOKENS.SYSTEM_TOPOLOGY, {}, context);
			expect(topology.services.length).toBeGreaterThan(0);
			expect(Object.keys(topology.dependencies).length).toBeGreaterThan(0);
			expect(Array.isArray(topology.bootOrder)).toBe(true);
			const events = await os.kernel.execute(TOKENS.SYSTEM_EVENTS, { topic: "kernel.service.executed", limit: 3 }, context);
			expect(events.events.length).toBeGreaterThan(0);
			const caps = await os.kernel.execute(TOKENS.SYSTEM_CAPABILITIES, { appId: context.appId }, context);
			expect(caps.capabilities.includes("store:read")).toBe(true);
			const capsAll = await os.kernel.execute(TOKENS.SYSTEM_CAPABILITIES_LIST, {}, context);
			expect(Object.keys(capsAll.capabilitiesByApp).length).toBeGreaterThan(0);
			const policy = await os.kernel.execute(TOKENS.SYSTEM_POLICY, {}, context);
			expect(policy.policy.pathRule).toBeDefined();
			const policyEval = await os.kernel.execute(TOKENS.SYSTEM_POLICY_EVALUATE, { command: "echo ok" }, context);
			expect(policyEval.allowed).toBe(true);
			const netCircuit = await os.kernel.execute(TOKENS.SYSTEM_NET_CIRCUIT, {}, context);
			expect(netCircuit.circuits).toBeDefined();
			const netCircuitReset = await os.kernel.execute(TOKENS.SYSTEM_NET_CIRCUIT_RESET, {}, context);
			expect(typeof netCircuitReset.cleared).toBe("number");
			vi.useFakeTimers();
			os.schedulerService.scheduleRetryable(
				"job-dlq-int",
				async () => {
					throw new Error("dlq-int-error");
				},
				{ maxRetries: 0, backoffMs: 10 },
			);
			await vi.advanceTimersByTimeAsync(20);
			const schedulerFailures = await os.kernel.execute(TOKENS.SYSTEM_SCHEDULER_FAILURES, { limit: 10 }, context);
			expect(schedulerFailures.failures.length).toBeGreaterThan(0);
			const replayed = await os.kernel.execute(TOKENS.SCHEDULER_FAILURES_REPLAY, { id: "job-dlq-int" }, context);
			expect(replayed.replayed).toBe(true);
			await vi.advanceTimersByTimeAsync(20);
			const cleared = await os.kernel.execute(
				"scheduler.failures.clear",
				{ id: "job-dlq-int" },
				context,
			);
			expect(cleared.cleared).toBeGreaterThan(0);
			vi.useRealTimers();
			const snapshot = await os.kernel.execute(TOKENS.SYSTEM_SNAPSHOT, {}, context);
			expect(snapshot.health.services.length).toBeGreaterThan(0);
			expect(snapshot.resilience.openNetCircuits).toBeGreaterThanOrEqual(0);
			expect(snapshot.resilience.schedulerFailures).toBeGreaterThanOrEqual(0);
			const errors = await os.kernel.execute(TOKENS.SYSTEM_ERRORS, {}, context);
			expect(typeof errors.totalFailures).toBe("number");

			vi.useFakeTimers();
			let scheduledEventFired = false;
			os.kernel.events.subscribe("demo.scheduled", () => {
				scheduledEventFired = true;
			});
			await os.kernel.execute(
				"scheduler.scheduleOnce",
				{ id: "job-once", delayMs: 10, topic: "demo.scheduled", payload: { ok: true } },
				context,
			);
			const scheduled = await os.kernel.execute(TOKENS.SCHEDULER_LIST, { _: "list" }, context);
			expect(scheduled.taskIds).toContain("job-once");
			await vi.advanceTimersByTimeAsync(20);
			expect(scheduledEventFired).toBe(true);
			vi.useRealTimers();

			await expect(os.kernel.execute(TOKENS.SHELL_EXECUTE, { command: "rm -rf /" }, context)).rejects.toThrow();
			const alerts = os.notificationService.list().filter((item) => item.topic === "system.alert");
			expect(alerts.length).toBeGreaterThan(0);
			const listedAlerts = await os.kernel.execute(
				"notification.list",
				{ topic: "system.alert", limit: 5 },
				context,
			);
			expect(listedAlerts.notifications.length).toBeGreaterThan(0);
			vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("ok", { status: 200 }));
			const channelConfigured = await os.kernel.execute(
				"notification.channel.configure",
				{
					webhook: { url: "https://webhook.example/send" },
				},
				context,
			);
			expect(channelConfigured.configured).toContain("webhook");
			await os.kernel.execute(
				"notification.send",
				{ topic: "system.alert", message: "channel dispatch", severity: "warning" },
				context,
			);
			const channelStats = await os.kernel.execute(TOKENS.NOTIFICATION_CHANNEL_STATS, {}, context);
			expect(typeof channelStats.channels.webhook?.success).toBe("number");
			const alertsSummary = await os.kernel.execute(TOKENS.SYSTEM_ALERTS, { topic: "system.alert", limit: 10 }, context);
			expect(alertsSummary.total).toBeGreaterThan(0);
			const alertsExport = await os.kernel.execute(
				"system.alerts.export",
				{ topic: "system.alert", format: "json" },
				context,
			);
			expect(alertsExport.contentType).toBe("application/json");
			const alertsStats = await os.kernel.execute(TOKENS.SYSTEM_ALERTS_STATS, {}, context);
			expect(typeof alertsStats.stats.sent).toBe("number");
			const alertsTopics = await os.kernel.execute(TOKENS.SYSTEM_ALERTS_TOPICS, {}, context);
			expect(typeof alertsTopics.topics).toBe("object");
			const alertsPolicy = await os.kernel.execute(TOKENS.SYSTEM_ALERTS_POLICY, {}, context);
			expect(typeof alertsPolicy.policy.dedupeWindowMs).toBe("number");
			const updatedPolicy = await os.kernel.execute(
				"notification.policy.update",
				{ dedupeWindowMs: 1234 },
				context,
			);
			expect(updatedPolicy.policy.dedupeWindowMs).toBe(1234);
			const alertsTrends = await os.kernel.execute(TOKENS.SYSTEM_ALERTS_TRENDS, { windowMinutes: 10 }, context);
			expect(typeof alertsTrends.total).toBe("number");
			const alertsSLO = await os.kernel.execute(TOKENS.SYSTEM_ALERTS_SLO, {}, context);
			expect(typeof alertsSLO.avgAckLatencyMs).toBe("number");
			const incidents = await os.kernel.execute(TOKENS.SYSTEM_ALERTS_INCIDENTS, { topic: "system.alert" }, context);
			expect(typeof incidents.totalIncidents).toBe("number");
			const digest = await os.kernel.execute(TOKENS.SYSTEM_ALERTS_DIGEST, { topic: "system.alert" }, context);
			expect(typeof digest.digest).toBe("string");
			const report = await os.kernel.execute(TOKENS.SYSTEM_ALERTS_REPORT, { topic: "system.alert" }, context);
			expect(typeof report.digest).toBe("string");
			const compact = await os.kernel.execute(
				"system.alerts.report.compact",
				{ topic: "system.alert", windowMinutes: 10 },
				context,
			);
			expect(typeof compact.summary).toBe("string");
			const flapping = await os.kernel.execute(
				"system.alerts.flapping",
				{ topic: "system.alert", windowMinutes: 10, threshold: 2 },
				context,
			);
			expect(typeof flapping.total).toBe("number");
			const timeline = await os.kernel.execute(
				"system.alerts.timeline",
				{ topic: "system.alert", windowMinutes: 10, bucketMinutes: 5 },
				context,
			);
			expect(Array.isArray(timeline.buckets)).toBe(true);
			const hotspots = await os.kernel.execute(
				"system.alerts.hotspots",
				{ topic: "system.alert", windowMinutes: 10, limit: 5 },
				context,
			);
			expect(Array.isArray(hotspots.items)).toBe(true);
			const recommendations = await os.kernel.execute(
				"system.alerts.recommendations",
				{ topic: "system.alert", windowMinutes: 10 },
				context,
			);
			expect(recommendations.recommendations.length).toBeGreaterThan(0);
			const feed = await os.kernel.execute(
				"system.alerts.feed",
				{ topic: "system.alert", offset: 0, limit: 5 },
				context,
			);
			expect(Array.isArray(feed.items)).toBe(true);
			const backlog = await os.kernel.execute(
				"system.alerts.backlog",
				{ topic: "system.alert", overdueThresholdMs: 1000 },
				context,
			);
			expect(typeof backlog.totalUnacked).toBe("number");
			const breaches = await os.kernel.execute(
				"system.alerts.breaches",
				{ topic: "system.alert", windowMinutes: 10 },
				context,
			);
			expect(Array.isArray(breaches.breaches)).toBe(true);
			const alertsHealth = await os.kernel.execute(
				"system.alerts.health",
				{ topic: "system.alert", windowMinutes: 10 },
				context,
			);
			expect(["healthy", "degraded", "critical"]).toContain(alertsHealth.level);
			const remediationPlan = await os.kernel.execute(
				"system.alerts.auto-remediate.plan",
				{ topic: "system.alert", windowMinutes: 10 },
				context,
			);
			expect(Array.isArray(remediationPlan.actions)).toBe(true);
			const remediationExec = await os.kernel.execute(
				"system.alerts.auto-remediate.execute",
				{
					approved: true,
					dryRun: true,
					approver: "ops.lead",
					approvalExpiresAt: new Date(Date.now() + 60000).toISOString(),
					actions: remediationPlan.actions,
				},
				context,
			);
			expect(remediationExec.approved).toBe(true);
			const remediationAudit = await os.kernel.execute(
				"system.alerts.auto-remediate.audit",
				{ limit: 10 },
				context,
			);
			expect(Array.isArray(remediationAudit.records)).toBe(true);
			const slo = await os.kernel.execute(TOKENS.SYSTEM_SLO, {}, context);
			expect(typeof slo.global.successRate).toBe("number");
			await os.kernel.execute(
				"system.slo.rules.upsert",
				{
					rule: {
						id: "rule-demo",
						metric: "global_error_rate",
						operator: "gt",
						threshold: 0.5,
						severity: "warning",
					},
				},
				context,
			);
			const sloRules = await os.kernel.execute(TOKENS.SYSTEM_SLO_RULES_LIST, {}, context);
			expect(sloRules.rules.some((r: { id: string }) => r.id === "rule-demo")).toBe(true);
			const sloBreaches = await os.kernel.execute(TOKENS.SYSTEM_SLO_RULES_EVALUATE, {}, context);
			expect(Array.isArray(sloBreaches.breaches)).toBe(true);
			const policyVersion = await os.kernel.execute(TOKENS.SYSTEM_POLICY_VERSION_CREATE, { label: "test" }, context);
			expect(typeof policyVersion.versionId).toBe("string");
			const policyVersions = await os.kernel.execute(TOKENS.SYSTEM_POLICY_VERSION_LIST, {}, context);
			expect(policyVersions.versions.length).toBeGreaterThan(0);
			const policyBatch = await os.kernel.execute(
				"system.policy.simulate.batch",
				{ inputs: [{ command: "echo ok" }, { command: "rm -rf /" }] },
				context,
			);
			expect(policyBatch.total).toBe(2);
			const policyUpdate = await os.kernel.execute(
				"system.policy.update",
				{ patch: { networkRule: { denyDomains: ["forbidden.local"] } }, createVersionLabel: "deny" },
				context,
			);
			expect(policyUpdate.policy.networkRule.denyDomains).toContain("forbidden.local");
			const policyGuard = await os.kernel.execute(
				"system.policy.guard.apply",
				{
					patch: { networkRule: { denyDomains: ["guard.local"] } },
					simulationInputs: [{ command: "echo ok" }],
					requireAllSimulationsAllowed: true,
				},
				context,
			);
			expect(typeof policyGuard.applied).toBe("boolean");
			const policyRollback = await os.kernel.execute(
				"system.policy.version.rollback",
				{ versionId: policyVersion.versionId },
				context,
			);
			expect(typeof policyRollback.rolledBack).toBe("boolean");
			const auditExport = await os.kernel.execute(
				"system.audit.export",
				{ limit: 10, compress: true, signingSecret: "s1" },
				context,
			);
			expect(auditExport.compressed).toBe(true);
			await os.kernel.execute(
				"system.audit.keys.rotate",
				{ keyId: "k-demo", secret: "secret-demo", setActive: true },
				context,
			);
			const auditKeys = await os.kernel.execute(TOKENS.SYSTEM_AUDIT_KEYS_LIST, {}, context);
			expect(auditKeys.activeKeyId).toBe("k-demo");
			os.tenantQuotaGovernor.setQuota("tenant-a", { maxToolCalls: 100, maxTokens: 10000 });
			const quotaNow = await os.kernel.execute(
				"system.quota",
				{ tenantId: "tenant-a" },
				context,
			);
			expect(quotaNow.tenantId).toBe("tenant-a");
			const quotaAdjusted = await os.kernel.execute(
				"system.quota.adjust",
				{ tenantId: "tenant-a", loadFactor: 0.9, priority: "high" },
				context,
			);
			expect(quotaAdjusted.tenantId).toBe("tenant-a");
			await os.kernel.execute(
				"system.quota.policy.upsert",
				{
					policy: {
						id: "tenant-a-peak",
						tier: "enterprise",
						priority: "high",
						loadMin: 0.8,
						quota: { maxToolCalls: 50, maxTokens: 5000 },
					},
				},
				context,
			);
			const quotaPolicyList = await os.kernel.execute(TOKENS.SYSTEM_QUOTA_POLICY_LIST, {}, context);
			expect(quotaPolicyList.policies.some((p: { id: string }) => p.id === "tenant-a-peak")).toBe(true);
			const quotaPolicyApply = await os.kernel.execute(
				"system.quota.policy.apply",
				{
					tenantId: "tenant-a",
					tier: "enterprise",
					priority: "high",
					loadFactor: 0.9,
				},
				context,
			);
			expect(typeof quotaPolicyApply.matchedPolicyId === "string" || quotaPolicyApply.matchedPolicyId === undefined).toBe(
				true,
			);
			const quotaHotspots = await os.kernel.execute(TOKENS.SYSTEM_QUOTA_HOTSPOTS, { thresholdToolCalls: 1 }, context);
			expect(Array.isArray(quotaHotspots.hotspots)).toBe(true);
			const chaos = await os.kernel.execute(
				"system.chaos.run",
				{ scenario: "policy_denied" },
				context,
			);
			expect(chaos.passed).toBe(true);
			const chaosReplay = await os.kernel.execute(
				"system.chaos.run",
				{ scenario: "scheduler_replay" },
				context,
			);
			expect(typeof chaosReplay.passed).toBe("boolean");
			await os.kernel.execute(TOKENS.SYSTEM_CHAOS_BASELINE_CAPTURE, { name: "default" }, context);
			const baseline = await os.kernel.execute(
				"system.chaos.baseline.verify",
				{ name: "default", maxErrorRateDelta: 1, maxFailureDelta: 100 },
				context,
			);
			expect(typeof baseline.passed).toBe("boolean");
			const governancePersist = await os.kernel.execute(TOKENS.SYSTEM_GOVERNANCE_STATE_PERSIST, {}, context);
			expect(governancePersist.persisted).toBe(true);
			const governanceRecover = await os.kernel.execute(TOKENS.SYSTEM_GOVERNANCE_STATE_RECOVER, {}, context);
			expect(typeof governanceRecover.recovered).toBe("boolean");
			const schedulerState = await os.kernel.execute(TOKENS.SCHEDULER_STATE_EXPORT, {}, context);
			expect(Array.isArray(schedulerState.tasks)).toBe(true);
			const schedulerPersist = await os.kernel.execute(TOKENS.SCHEDULER_STATE_PERSIST, {}, context);
			expect(typeof schedulerPersist.persisted).toBe("boolean");
			const schedulerRecover = await os.kernel.execute(TOKENS.SCHEDULER_STATE_RECOVER, {}, context);
			expect(typeof schedulerRecover.recovered).toBe("boolean");
			const alertsList = await os.kernel.execute(TOKENS.NOTIFICATION_LIST, { topic: "system.alert", limit: 1 }, context);
			if (alertsList.notifications[0]?.id) {
				const ack = await os.kernel.execute(
					"notification.ack",
					{ id: alertsList.notifications[0].id },
					context,
				);
				expect(ack.acknowledged).toBe(1);
			}
			const ackAll = await os.kernel.execute(
				"notification.ackAll",
				{ topic: "system.alert" },
				context,
			);
			expect(typeof ackAll.acknowledged).toBe("number");
			const cleanup = await os.kernel.execute(TOKENS.NOTIFICATION_CLEANUP, {}, context);
			expect(typeof cleanup.notifications).toBe("number");
			const unacked = await os.kernel.execute(TOKENS.SYSTEM_ALERTS_UNACKED, { topic: "system.alert" }, context);
			expect(typeof unacked.total).toBe("number");
			const clearedAlerts = await os.kernel.execute(
				"system.alerts.clear",
				{ topic: "system.alert", severity: "error" },
				context,
			);
			expect(typeof clearedAlerts.cleared).toBe("number");
			await os.kernel.execute(TOKENS.NOTIFICATION_MUTE, { topic: "system.alert", durationMs: 1000 }, context);
			const muteList = await os.kernel.execute(TOKENS.NOTIFICATION_MUTE_LIST, {}, context);
			expect(muteList.mutes.length).toBeGreaterThan(0);
			const muted = await os.kernel.execute(
				"notification.send",
				{ topic: "system.alert", message: "muted-alert", severity: "error" },
				context,
			);
			expect(muted.sent).toBe(false);
			await os.kernel.execute(TOKENS.NOTIFICATION_UNMUTE, { topic: "system.alert" }, context);

			await os.kernel.execute(TOKENS.SHELL_ENV_SET, { key: "AA", value: "BB" }, context);
			const env = await os.kernel.execute(TOKENS.SHELL_ENV_LIST, { _: "list" }, context);
			expect(env.env.AA).toBe("BB");
			await os.kernel.execute(TOKENS.SHELL_ENV_UNSET, { key: "AA" }, context);
			const env2 = await os.kernel.execute(TOKENS.SHELL_ENV_LIST, { _: "list" }, context);
			expect(env2.env.AA).toBeUndefined();
		} finally {
			await rm(root, { recursive: true, force: true });
		}
	});

	it("destroys app injectors when the os injector is destroyed", async () => {
		const root = await mkdtemp(join(tmpdir(), "os-destroy-"));
		try {
			await writeMockPageModule(root);
			const os = createDefaultLLMOS({ pathPolicy: { allow: [root], deny: [] } });
			const context = {
				appId: "admin",
				sessionId: "session-destroy",
				permissions: ["app:manage", "app:read"],
				workingDirectory: root,
			};

			await os.kernel.execute(
				TOKENS.APP_INSTALL,
				{
					manifest: {
						id: "app.cleanup",
						name: "Cleanup",
						version: "1.0.0",
						entry: "index.js",
						permissions: ["app:read"],
					},
				},
				context,
			);

			const runtimeRegistry = os.injector.get(OS_APP_RUNTIME_REGISTRY);
			const appInjector = runtimeRegistry.get("app.cleanup");
			const destroySpy = vi.spyOn(appInjector, "destroy");

			await os.injector.destroy();

			expect(destroySpy).toHaveBeenCalledTimes(1);
			expect(runtimeRegistry.has("app.cleanup")).toBe(false);
			expect(runtimeRegistry.has("system")).toBe(false);
		} finally {
			await rm(root, { recursive: true, force: true });
		}
	});

	it("enforces tenant quota governor", async () => {
		const root = await mkdtemp(join(tmpdir(), "os-kernel-tenant-"));
		try {
			const os = createDefaultLLMOS({ pathPolicy: { allow: [root], deny: [] } });
			os.tenantQuotaGovernor.setQuota("tenant-a", { maxToolCalls: 2, maxTokens: 1000 });
			const context = {
				appId: "app.tenant",
				sessionId: "session-tenant",
				tenantId: "tenant-a",
				permissions: ["store:write", "app:manage"],
				workingDirectory: root,
			};
			await os.kernel.execute(
				"app.install",
				{
					manifest: {
						id: "app.tenant",
						name: "Tenant",
						version: "1.0.0",
						entry: "index.js",
						permissions: context.permissions,
					},
				},
				context,
			);

			await os.kernel.execute(TOKENS.STORE_SET, { key: "a", value: "1" }, context);
			await expect(os.kernel.execute(TOKENS.STORE_SET, { key: "b", value: "2" }, context)).rejects.toThrow(
				"Tenant quota exceeded",
			);
		} finally {
			await rm(root, { recursive: true, force: true });
		}
	});

	it("sends alert when scheduler task fails", async () => {
		vi.useFakeTimers();
		const root = await mkdtemp(join(tmpdir(), "os-kernel-scheduler-"));
		try {
			const os = createDefaultLLMOS({ pathPolicy: { allow: [root], deny: [] } });
			os.schedulerService.scheduleRetryable(
				"job-alert",
				async () => {
					throw new Error("boom");
				},
				{ maxRetries: 0, backoffMs: 10 },
			);
			await vi.advanceTimersByTimeAsync(20);
			const alerts = os.notificationService.list().filter((item) => item.topic === "system.alert");
			expect(alerts.some((a) => a.message.includes("scheduler task failed"))).toBe(true);
		} finally {
			vi.useRealTimers();
			await rm(root, { recursive: true, force: true });
		}
	});

	it("supports disabling services at factory level", async () => {
		const root = await mkdtemp(join(tmpdir(), "os-kernel-toggle-"));
		try {
			const os = createDefaultLLMOS({
				pathPolicy: { allow: [root], deny: [] },
				enabledServices: {
					"package.install": false,
				},
			});
			const context = {
				appId: "app.toggle",
				sessionId: "session-toggle",
				permissions: ["package:write", "app:manage"],
				workingDirectory: root,
			};
			await os.kernel.execute(
				"app.install",
				{
					manifest: {
						id: "app.toggle",
						name: "Toggle",
						version: "1.0.0",
						entry: "index.js",
						permissions: context.permissions,
					},
				},
				context,
			);
			await expect(
				os.kernel.execute(
					"package.install",
					{ package: { name: "demo", version: "1.0.0", source: "registry://demo" } },
					context,
				),
			).rejects.toMatchObject({ code: "E_SERVICE_NOT_FOUND" });
		} finally {
			await rm(root, { recursive: true, force: true });
		}
	});

	it("rejects execution for unregistered app", async () => {
		const root = await mkdtemp(join(tmpdir(), "os-kernel-auth-"));
		try {
			const os = createDefaultLLMOS({ pathPolicy: { allow: [root], deny: [] } });
			const context = {
				appId: "app.unknown",
				sessionId: "session-auth",
				permissions: ["store:write"],
				workingDirectory: root,
			};
			await expect(os.kernel.execute(TOKENS.STORE_SET, { key: "x", value: "1" }, context)).rejects.toMatchObject({
				code: "E_APP_NOT_REGISTERED",
			});
		} finally {
			await rm(root, { recursive: true, force: true });
		}
	});

	it("blocks execution when app is disabled and allows after enable", async () => {
		const root = await mkdtemp(join(tmpdir(), "os-kernel-disable-"));
		try {
			const os = createDefaultLLMOS({ pathPolicy: { allow: [root], deny: [] } });
			const context = {
				appId: "app.disable-flow",
				sessionId: "session-disable",
				permissions: ["store:write", "app:manage"],
				workingDirectory: root,
			};
			await os.kernel.execute(
				"app.install",
				{
					manifest: {
						id: context.appId,
						name: "DisableFlow",
						version: "1.0.0",
						entry: "index.js",
						permissions: context.permissions,
					},
				},
				context,
			);
			await os.kernel.execute(TOKENS.APP_DISABLE, { appId: context.appId }, context);
			await expect(os.kernel.execute(TOKENS.STORE_SET, { key: "x", value: "1" }, context)).rejects.toMatchObject({
				code: "E_APP_NOT_REGISTERED",
			});
			await os.kernel.execute(TOKENS.APP_ENABLE, { appId: context.appId }, context);
			await expect(os.kernel.execute(TOKENS.STORE_SET, { key: "x", value: "1" }, context)).resolves.toEqual({ ok: true });
		} finally {
			await rm(root, { recursive: true, force: true });
		}
	});

	it("rejects context permissions not granted by manifest", async () => {
		const root = await mkdtemp(join(tmpdir(), "os-kernel-perm-"));
		try {
			const os = createDefaultLLMOS({ pathPolicy: { allow: [root], deny: [] } });
			const setupContext = {
				appId: "app.perm",
				sessionId: "session-perm",
				permissions: ["app:manage"],
				workingDirectory: root,
			};
			await os.kernel.execute(
				"app.install",
				{
					manifest: {
						id: "app.perm",
						name: "Perm",
						version: "1.0.0",
						entry: "index.js",
						permissions: ["store:read"],
					},
				},
				setupContext,
			);
			const badContext = {
				appId: "app.perm",
				sessionId: "session-perm",
				permissions: ["store:write"],
				workingDirectory: root,
			};
			await expect(os.kernel.execute(TOKENS.STORE_SET, { key: "x", value: "1" }, badContext)).rejects.toMatchObject({
				code: "E_APP_PERMISSION_MISMATCH",
			});
		} finally {
			await rm(root, { recursive: true, force: true });
		}
	});

	it("updates capabilities after app upgrade", async () => {
		const root = await mkdtemp(join(tmpdir(), "os-kernel-upgrade-"));
		try {
			const os = createDefaultLLMOS({ pathPolicy: { allow: [root], deny: [] } });
			const context = {
				appId: "app.up",
				sessionId: "session-up",
				permissions: ["app:manage", "system:read"],
				workingDirectory: root,
			};
			await os.kernel.execute(
				"app.install",
				{
					manifest: {
						id: "app.up",
						name: "Up",
						version: "1.0.0",
						entry: "index.js",
						permissions: ["store:read", "app:manage", "system:read"],
					},
				},
				context,
			);
			await os.kernel.execute(
				"app.upgrade",
				{
					manifest: {
						id: "app.up",
						name: "Up",
						version: "1.1.0",
						entry: "index.js",
						permissions: ["store:read", "store:write", "app:manage", "system:read"],
					},
				},
				context,
			);
			const caps = await os.kernel.execute(TOKENS.SYSTEM_CAPABILITIES, { appId: "app.up" }, context);
			expect(caps.capabilities).toContain("store:write");
		} finally {
			await rm(root, { recursive: true, force: true });
		}
	});

	it("restores capabilities after install rollback to previous version", async () => {
		const root = await mkdtemp(join(tmpdir(), "os-kernel-rollback-caps-"));
		try {
			const os = createDefaultLLMOS({ pathPolicy: { allow: [root], deny: [] } });
			const context = {
				appId: "app.up",
				sessionId: "session-rollback-caps",
				permissions: ["app:manage", "app:read", "system:read"],
				workingDirectory: root,
			};
			await os.kernel.execute(
				"app.install",
				{
					manifest: {
						id: "app.up",
						name: "Up",
						version: "1.0.0",
						entry: "index.js",
						permissions: ["app:manage", "app:read", "store:read", "system:read"],
					},
				},
				context,
			);
			const upgraded = await os.kernel.execute(
				"app.install",
				{
					manifest: {
						id: "app.up",
						name: "Up",
						version: "1.1.0",
						entry: {
							pages: [
								{
									id: "v2",
									route: "app.up://v2",
									name: "V2",
									description: "V2 page",
									path: "v2.js",
									default: true,
								},
							],
						},
						permissions: ["app:manage", "app:read", "store:write", "system:read"],
					},
				},
				context,
			);
			await os.kernel.execute(
				"app.install.rollback",
				{
					appId: "app.up",
					rollbackToken: upgraded.report.rollbackToken,
				},
				context,
			);
			const caps = await os.kernel.execute(TOKENS.SYSTEM_CAPABILITIES, { appId: "app.up" }, context);
			expect(caps.capabilities).toContain("store:read");
			expect(caps.capabilities).not.toContain("store:write");
		} finally {
			await rm(root, { recursive: true, force: true });
		}
	});

	it("persists and recovers rollback state in default os flow", async () => {
		const root = await mkdtemp(join(tmpdir(), "os-kernel-rollback-state-"));
		try {
			const os = createDefaultLLMOS({ pathPolicy: { allow: [root], deny: [] } });
			const context = {
				appId: "app.up",
				sessionId: "session-rollback-state",
				permissions: ["app:manage", "app:read", "system:read", "system:write"],
				workingDirectory: root,
			};
			await os.kernel.execute(
				"app.install",
				{
					manifest: {
						id: "app.up",
						name: "Up",
						version: "1.0.0",
						entry: "index.js",
						permissions: ["app:manage", "app:read", "system:read", "system:write"],
					},
				},
				context,
			);
			const upgraded = await os.kernel.execute(
				"app.install",
				{
					manifest: {
						id: "app.up",
						name: "Up",
						version: "1.1.0",
						entry: {
							pages: [
								{
									id: "v2",
									route: "app.up://v2",
									name: "V2",
									description: "V2 page",
									path: "v2.js",
									default: true,
								},
							],
						},
						permissions: ["app:manage", "app:read", "system:read", "system:write"],
					},
				},
				context,
			);
			await os.kernel.execute(TOKENS.SYSTEM_APP_ROLLBACK_STATE_PERSIST, {}, context);

			await os.kernel.execute(
				"system.app.rollback.state.import",
				{
					state: {
						snapshots: [],
						installReports: [],
					},
				},
				context,
			);
			const recoveredState = await os.kernel.execute(TOKENS.SYSTEM_APP_ROLLBACK_STATE_RECOVER, {}, context);
			expect(recoveredState.recovered).toBe(true);
			expect(typeof recoveredState.stateHash).toBe("string");
			expect(typeof recoveredState.stateSizeBytes).toBe("number");
			const rolled = await os.kernel.execute(
				"app.install.rollback",
				{
					appId: "app.up",
					rollbackToken: upgraded.report.rollbackToken,
				},
				context,
			);
			expect(rolled.restoredVersion).toBe("1.0.0");
		} finally {
			await rm(root, { recursive: true, force: true });
		}
	});

	it("returns safe failure for invalid persisted rollback state", async () => {
		const root = await mkdtemp(join(tmpdir(), "os-kernel-rollback-state-invalid-"));
		try {
			const os = createDefaultLLMOS({ pathPolicy: { allow: [root], deny: [] } });
			const context = {
				appId: "app.invalid",
				sessionId: "session-rollback-state-invalid",
				permissions: ["app:manage", "app:read", "system:read", "system:write", "store:write"],
				workingDirectory: root,
			};
			await os.kernel.execute(
				"app.install",
				{
					manifest: {
						id: "app.invalid",
						name: "Invalid",
						version: "1.0.0",
						entry: "index.js",
						permissions: context.permissions,
					},
				},
				context,
			);
			await os.kernel.execute(
				"store.set",
				{
					key: "system.app.rollback.state",
					value: {
						snapshots: [
							{
								token: "",
								appId: "bad",
								createdAt: "not-a-date",
								expiresAt: "2026-01-01T00:00:00.000Z",
							},
						],
						installReports: [],
					},
				},
				context,
			);
			const recoveredState = await os.kernel.execute(TOKENS.SYSTEM_APP_ROLLBACK_STATE_RECOVER, {}, context);
			expect(recoveredState.recovered).toBe(false);
			expect(recoveredState.reason).toBe("invalid_state");
			expect(recoveredState.errorCode).toBe("E_VALIDATION_FAILED");
			expect(typeof recoveredState.stateHash).toBe("string");
			expect(recoveredState.stateSizeBytes).toBeGreaterThan(0);
		} finally {
			await rm(root, { recursive: true, force: true });
		}
	});

	it("supports rollback gc dry-run and stats window in default os flow", async () => {
		const root = await mkdtemp(join(tmpdir(), "os-kernel-rollback-gc-"));
		try {
			const os = createDefaultLLMOS({ pathPolicy: { allow: [root], deny: [] } });
			const context = {
				appId: "app.gc",
				sessionId: "session-rollback-gc",
				permissions: ["app:manage", "app:read", "system:read", "system:write"],
				workingDirectory: root,
			};
			await os.kernel.execute(
				"app.install",
				{
					manifest: {
						id: "app.gc",
						name: "GC",
						version: "1.0.0",
						entry: {
							pages: [
								{
									id: "v1",
									route: "app.gc://v1",
									name: "V1",
									description: "GC v1 page",
									path: "v1.js",
									default: true,
								},
							],
						},
						permissions: ["app:manage", "app:read", "system:read", "system:write"],
					},
				},
				context,
			);
			await os.kernel.execute(
				"app.install",
				{
					manifest: {
						id: "app.gc",
						name: "GC",
						version: "1.1.0",
						entry: {
							pages: [
								{
									id: "v2",
									route: "app.gc://v2",
									name: "V2",
									description: "GC v2 page",
									path: "v2.js",
									default: true,
								},
							],
						},
						permissions: ["app:manage", "app:read", "system:read", "system:write"],
					},
				},
				context,
			);
			const dryRun = await os.kernel.execute(TOKENS.SYSTEM_APP_ROLLBACK_GC, { dryRun: true, limit: 1 }, context);
			expect(dryRun.dryRun).toBe(true);
			expect(dryRun.eligible).toBeGreaterThanOrEqual(0);
			const stats = await os.kernel.execute(
				"system.app.rollback.stats",
				{ appId: "app.gc", soonToExpireWindowMs: 24 * 60 * 60 * 1000 },
				context,
			);
			expect(typeof stats.soonToExpireSnapshots).toBe("number");
		} finally {
			await rm(root, { recursive: true, force: true });
		}
	});

	it("caps net journal size by configured limit", async () => {
		const root = await mkdtemp(join(tmpdir(), "os-kernel-net-journal-"));
		try {
			const os = createDefaultLLMOS({
				pathPolicy: { allow: [root], deny: [] },
				netJournalLimit: 2,
			});
			const context = {
				appId: "app.net-cap",
				sessionId: "session-net-cap",
				permissions: ["app:manage", "net:request", "store:read"],
				workingDirectory: root,
			};
			await os.kernel.execute(
				"app.install",
				{
					manifest: {
						id: context.appId,
						name: "NetCap",
						version: "1.0.0",
						entry: "index.js",
						permissions: context.permissions,
					},
				},
				context,
			);
			vi.spyOn(globalThis, "fetch")
				.mockResolvedValueOnce(new Response("ok-1", { status: 200 }))
				.mockResolvedValueOnce(new Response("ok-2", { status: 200 }))
				.mockResolvedValueOnce(new Response("ok-3", { status: 200 }));
			await os.kernel.execute(TOKENS.NET_REQUEST, { url: "https://example.com/a" }, context);
			await os.kernel.execute(TOKENS.NET_REQUEST, { url: "https://example.com/b" }, context);
			await os.kernel.execute(TOKENS.NET_REQUEST, { url: "https://example.com/c" }, context);
			const journal = await os.kernel.execute(TOKENS.STORE_GET, { key: "net.journal" }, context);
			expect(Array.isArray(journal.value)).toBe(true);
			expect(journal.value).toHaveLength(2);
		} finally {
			await rm(root, { recursive: true, force: true });
		}
	});

	it("applies notification dedupe window from factory options", async () => {
		vi.useFakeTimers();
		const root = await mkdtemp(join(tmpdir(), "os-kernel-notify-dedupe-"));
		try {
			const os = createDefaultLLMOS({
				pathPolicy: { allow: [root], deny: [] },
				notificationDedupeWindowMs: 1000,
			});
			os.notificationService.send({ topic: "system.alert", message: "dup" });
			os.notificationService.send({ topic: "system.alert", message: "dup" });
			expect(os.notificationService.list()).toHaveLength(1);
			vi.advanceTimersByTime(1001);
			os.notificationService.send({ topic: "system.alert", message: "dup" });
			expect(os.notificationService.list()).toHaveLength(2);
		} finally {
			vi.useRealTimers();
			await rm(root, { recursive: true, force: true });
		}
	});

	it("applies notification rate limit from factory options", async () => {
		vi.useFakeTimers();
		const root = await mkdtemp(join(tmpdir(), "os-kernel-notify-rate-"));
		try {
			const os = createDefaultLLMOS({
				pathPolicy: { allow: [root], deny: [] },
				notificationRateLimit: { limit: 1, windowMs: 1000 },
			});
			expect(os.notificationService.send({ topic: "system.alert", message: "r1" })).toBe(true);
			expect(os.notificationService.send({ topic: "system.alert", message: "r2" })).toBe(false);
		} finally {
			vi.useRealTimers();
			await rm(root, { recursive: true, force: true });
		}
	});

	it("applies notification retention limit from factory options", async () => {
		const root = await mkdtemp(join(tmpdir(), "os-kernel-notify-retention-"));
		try {
			const os = createDefaultLLMOS({
				pathPolicy: { allow: [root], deny: [] },
				notificationRetentionLimit: 2,
			});
			os.notificationService.send({ topic: "system.alert", message: "x1" });
			os.notificationService.send({ topic: "system.alert", message: "x2" });
			os.notificationService.send({ topic: "system.alert", message: "x3" });
			expect(os.notificationService.query({ topic: "system.alert" })).toHaveLength(2);
		} finally {
			await rm(root, { recursive: true, force: true });
		}
	});

	it("runs text task orchestration e2e (render + planner + runner)", async () => {
		const root = await mkdtemp(join(tmpdir(), "os-e2e-"));
		try {
			await writeMockPageModule(root);
			const os = createDefaultLLMOS({ pathPolicy: { allow: [root], deny: [] } });
			const context = {
				appId: "todo",
				sessionId: "s-e2e",
				permissions: ["app:manage", "app:read", "model:invoke", "system:read"],
				workingDirectory: root,
			};
			await os.kernel.execute(
				"app.install.v1",
				{
					manifest: {
						id: "todo",
						name: "Todo",
						version: "1.0.0",
						entry: {
							pages: [
								{
									id: "list",
									route: "todo://list",
									name: "List",
									description: "Todo list page",
									path: "index.js",
									default: true,
								},
							],
						},
						permissions: ["app:manage", "app:read", "model:invoke", "system:read"],
					},
				},
				context,
			);
			const rendered = await os.kernel.execute(TOKENS.APP_PAGE_RENDER, { route: "todo://list" }, context);
			expect(typeof rendered.prompt).toBe("string");
			const renderedQuick = await os.kernel.execute(TOKENS.RENDER, { route: "todo://list" }, context);
			expect(renderedQuick.page.route).toBe("todo://list");
			const started = await os.kernel.execute(TOKENS.APP_START, { appId: "todo" }, context);
			expect(started.route).toBe("todo://list");
			const selected = await os.kernel.execute(
				"planner.selectApps",
				{ text: "show todo list", limit: 1 },
				context,
			);
			expect(selected.selected[0]?.appId).toBe("todo");
			const composed = await os.kernel.execute(TOKENS.PLANNER_COMPOSE_TOOLS, { routes: ["todo://list"] }, context);
			expect(composed.composed.length).toBe(1);
			const executed = await os.kernel.execute(
				"runner.executePlan",
				{ text: "summarize todos", routes: ["todo://list"], maxSteps: 1 },
				context,
			);
			expect(executed.steps).toBe(1);
		} finally {
			await rm(root, { recursive: true, force: true });
		}
	});
});
