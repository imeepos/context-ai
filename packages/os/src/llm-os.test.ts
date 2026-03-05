import { describe, expect, it } from "vitest";
import { createDefaultLLMOS } from "./llm-os.js";
import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { vi } from "vitest";

describe("createDefaultLLMOS", () => {
	it("registers default services and executes store flow", async () => {
		const root = await mkdtemp(join(tmpdir(), "os-kernel-"));
		try {
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
					"scheduler:write",
					"scheduler:read",
					"notification:read",
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

			await os.kernel.execute(
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
			const apps = await os.kernel.execute("app.list", { _: "list" }, context);
			expect(apps.apps).toHaveLength(2);

			await os.kernel.execute("store.set", { key: "name", value: "ctp" }, context);
			const result = await os.kernel.execute("store.get", { key: "name" }, context);
			expect(result.value).toBe("ctp");

			const model = await os.kernel.execute("model.generate", { model: "echo", prompt: "hi" }, context);
			expect(model.output).toBe("echo:hi");

			await os.kernel.execute(
				"package.install",
				{ package: { name: "demo", version: "1.0.0", source: "registry://demo" } },
				context,
			);
			const packages = await os.kernel.execute("package.list", {}, context);
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
			const host = await os.kernel.execute("host.execute", { adapter: "sensor", action: "read" }, context);
			expect(host.result).toEqual({ value: 42 });

			const media = await os.kernel.execute("media.inspect", { path: "a.jpg" }, context);
			expect(media.kind).toBe("image");

			const listed = await os.kernel.execute("file.list", { path: root }, context);
			expect(Array.isArray(listed.entries)).toBe(true);

			vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(new Response("ok", { status: 200 }));
			await os.kernel.execute("net.request", { url: "https://example.com" }, context);
			const journal = await os.kernel.execute("store.get", { key: "net.journal" }, context);
			expect(Array.isArray(journal.value)).toBe(true);

			const health = await os.kernel.execute("system.health", {}, context);
			expect(health.services.includes("system.health")).toBe(true);
			expect(Array.isArray(health.metrics)).toBe(true);
			const deps = await os.kernel.execute("system.dependencies", {}, context);
			expect(Object.keys(deps.graph).length).toBeGreaterThan(0);
			const metricsAll = await os.kernel.execute("system.metrics", {}, context);
			expect(Array.isArray(metricsAll.metrics)).toBe(true);
			const metricsOne = await os.kernel.execute("system.metrics", { service: "store.set" }, context);
			expect(metricsOne.metrics).toHaveLength(1);
			const auditAll = await os.kernel.execute("system.audit", { service: "store.set", limit: 5 }, context);
			expect(auditAll.records.length).toBeGreaterThan(0);
			const auditSession = await os.kernel.execute("system.audit", { sessionId: context.sessionId }, context);
			expect(auditSession.records.every((r) => r.sessionId === context.sessionId)).toBe(true);
			const topology = await os.kernel.execute("system.topology", {}, context);
			expect(topology.services.length).toBeGreaterThan(0);
			expect(Object.keys(topology.dependencies).length).toBeGreaterThan(0);
			expect(Array.isArray(topology.bootOrder)).toBe(true);
			const events = await os.kernel.execute("system.events", { topic: "kernel.service.executed", limit: 3 }, context);
			expect(events.events.length).toBeGreaterThan(0);
			const caps = await os.kernel.execute("system.capabilities", { appId: context.appId }, context);
			expect(caps.capabilities.includes("store:read")).toBe(true);
			const capsAll = await os.kernel.execute("system.capabilities.list", {}, context);
			expect(Object.keys(capsAll.capabilitiesByApp).length).toBeGreaterThan(0);
			const policy = await os.kernel.execute("system.policy", {}, context);
			expect(policy.policy.pathRule).toBeDefined();
			const policyEval = await os.kernel.execute("system.policy.evaluate", { command: "echo ok" }, context);
			expect(policyEval.allowed).toBe(true);
			const netCircuit = await os.kernel.execute("system.net.circuit", {}, context);
			expect(netCircuit.circuits).toBeDefined();
			const netCircuitReset = await os.kernel.execute("system.net.circuit.reset", {}, context);
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
			const schedulerFailures = await os.kernel.execute("system.scheduler.failures", { limit: 10 }, context);
			expect(schedulerFailures.failures.length).toBeGreaterThan(0);
			const replayed = await os.kernel.execute("scheduler.failures.replay", { id: "job-dlq-int" }, context);
			expect(replayed.replayed).toBe(true);
			await vi.advanceTimersByTimeAsync(20);
			const cleared = await os.kernel.execute(
				"scheduler.failures.clear",
				{ id: "job-dlq-int" },
				context,
			);
			expect(cleared.cleared).toBeGreaterThan(0);
			vi.useRealTimers();
			const snapshot = await os.kernel.execute("system.snapshot", {}, context);
			expect(snapshot.health.services.length).toBeGreaterThan(0);
			expect(snapshot.resilience.openNetCircuits).toBeGreaterThanOrEqual(0);
			expect(snapshot.resilience.schedulerFailures).toBeGreaterThanOrEqual(0);
			const errors = await os.kernel.execute("system.errors", {}, context);
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
			const scheduled = await os.kernel.execute("scheduler.list", { _: "list" }, context);
			expect(scheduled.taskIds).toContain("job-once");
			await vi.advanceTimersByTimeAsync(20);
			expect(scheduledEventFired).toBe(true);
			vi.useRealTimers();

			await expect(os.kernel.execute("shell.execute", { command: "rm -rf /" }, context)).rejects.toThrow();
			const alerts = os.notificationService.list().filter((item) => item.topic === "system.alert");
			expect(alerts.length).toBeGreaterThan(0);
			const listedAlerts = await os.kernel.execute(
				"notification.list",
				{ topic: "system.alert", limit: 5 },
				context,
			);
			expect(listedAlerts.notifications.length).toBeGreaterThan(0);

			await os.kernel.execute("shell.env.set", { key: "AA", value: "BB" }, context);
			const env = await os.kernel.execute("shell.env.list", { _: "list" }, context);
			expect(env.env.AA).toBe("BB");
			await os.kernel.execute("shell.env.unset", { key: "AA" }, context);
			const env2 = await os.kernel.execute("shell.env.list", { _: "list" }, context);
			expect(env2.env.AA).toBeUndefined();
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

			await os.kernel.execute("store.set", { key: "a", value: "1" }, context);
			await expect(os.kernel.execute("store.set", { key: "b", value: "2" }, context)).rejects.toThrow(
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
			await expect(os.kernel.execute("store.set", { key: "x", value: "1" }, context)).rejects.toMatchObject({
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
			await os.kernel.execute("app.disable", { appId: context.appId }, context);
			await expect(os.kernel.execute("store.set", { key: "x", value: "1" }, context)).rejects.toMatchObject({
				code: "E_APP_NOT_REGISTERED",
			});
			await os.kernel.execute("app.enable", { appId: context.appId }, context);
			await expect(os.kernel.execute("store.set", { key: "x", value: "1" }, context)).resolves.toEqual({ ok: true });
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
			await expect(os.kernel.execute("store.set", { key: "x", value: "1" }, badContext)).rejects.toMatchObject({
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
			const caps = await os.kernel.execute("system.capabilities", { appId: "app.up" }, context);
			expect(caps.capabilities).toContain("store:write");
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
			await os.kernel.execute("net.request", { url: "https://example.com/a" }, context);
			await os.kernel.execute("net.request", { url: "https://example.com/b" }, context);
			await os.kernel.execute("net.request", { url: "https://example.com/c" }, context);
			const journal = await os.kernel.execute("store.get", { key: "net.journal" }, context);
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
});
