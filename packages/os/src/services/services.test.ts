import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, describe, expect, it, vi } from "vitest";
import { EventBus } from "../kernel/event-bus.js";
import { PolicyEngine } from "../kernel/policy-engine.js";
import type { OSContext } from "../types/os.js";
import { NetService } from "../net-service/index.js";
import { NotificationService } from "../notification-service/index.js";
import { SchedulerService, StoreSchedulerStateAdapter } from "../scheduler-service/index.js";
import { SecurityService } from "../security-service/index.js";
import { StoreService } from "../store-service/index.js";

const createdDirs: string[] = [];

afterEach(async () => {
	vi.restoreAllMocks();
	await Promise.all(createdDirs.map((dir) => rm(dir, { recursive: true, force: true })));
	createdDirs.length = 0;
});

describe("SecurityService", () => {
	it("redacts secret patterns", () => {
		const security = new SecurityService();
		const output = security.redactSecrets("api_key=abc token=def password=ghi");
		expect(output).toContain("api_key=***");
		expect(output).toContain("token=***");
		expect(output).toContain("password=***");
	});

	it("signs and verifies payload", () => {
		const security = new SecurityService();
		const signature = security.sign("payload", "secret");
		expect(security.verify("payload", "secret", signature)).toBe(true);
		expect(security.verify("payload", "wrong", signature)).toBe(false);
	});
});

describe("StoreService", () => {
	it("stores values and persists to file", async () => {
		const store = new StoreService();
		store.set("k1", "v1");
		const dir = await mkdtemp(join(tmpdir(), "os-store-"));
		createdDirs.push(dir);
		const storePath = join(dir, "store.json");
		await store.saveToFile(storePath);

		const other = new StoreService();
		await other.loadFromFile(storePath);
		expect(other.get("k1")).toBe("v1");
	});

	it("supports json adapter load/save", async () => {
		const dir = await mkdtemp(join(tmpdir(), "os-store-json-"));
		createdDirs.push(dir);
		const storePath = join(dir, "data.json");
		const store = StoreService.createJsonFile(storePath);
		store.set("k2", "v2");
		await store.save();

		const restored = StoreService.createJsonFile(storePath);
		await restored.load();
		expect(restored.get("k2")).toBe("v2");
	});
});

describe("NetService", () => {
	it("enforces domain policy", async () => {
		const ctx: OSContext = {
			appId: "app.net",
			sessionId: "s1",
			permissions: ["net:request"],
			workingDirectory: process.cwd(),
		};
		const policy = new PolicyEngine({ networkRule: { allowDomains: ["example.com"] } });
		const net = new NetService(policy, new SecurityService());
		await expect(net.request({ url: "https://blocked.dev" }, ctx)).rejects.toThrow("Network target denied");
	});

	it("retries request and redacts response", async () => {
		const fetchMock = vi
			.spyOn(globalThis, "fetch")
			.mockRejectedValueOnce(new Error("temporary"))
			.mockResolvedValueOnce(
				new Response("token=secret", { status: 200, headers: { "content-type": "text/plain" } }),
			);
		const ctx: OSContext = {
			appId: "app.net",
			sessionId: "s1",
			permissions: ["net:request"],
			workingDirectory: process.cwd(),
		};
		const net = new NetService(new PolicyEngine(), new SecurityService());
		const response = await net.request({ url: "https://example.com", retries: 1 }, ctx);
		expect(response.status).toBe(200);
		expect(response.body).toContain("token=***");
		expect(fetchMock).toHaveBeenCalledTimes(2);
	});

	it("writes journal entry via callback", async () => {
		vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(new Response("ok", { status: 200 }));
		const journal: string[] = [];
		const ctx: OSContext = {
			appId: "app.net",
			sessionId: "s1",
			permissions: ["net:request"],
			workingDirectory: process.cwd(),
		};
		const net = new NetService(new PolicyEngine(), new SecurityService(), async (entry) => {
			journal.push(`${entry.method} ${entry.url} ${entry.success}`);
		});
		await net.request({ url: "https://example.com", method: "GET" }, ctx);
		expect(journal).toHaveLength(1);
		expect(journal[0]).toContain("https://example.com");
	});

	it("denies network method by policy", async () => {
		const ctx: OSContext = {
			appId: "app.net",
			sessionId: "s1",
			permissions: ["net:request"],
			workingDirectory: process.cwd(),
		};
		const policy = new PolicyEngine({
			networkRule: {
				allowDomains: ["example.com"],
				allowMethods: ["GET"],
			},
		});
		const net = new NetService(policy, new SecurityService());
		await expect(net.request({ url: "https://example.com", method: "POST" }, ctx)).rejects.toThrow(
			"Network method denied",
		);
	});

	it("enforces network rate limit", async () => {
		vi.useFakeTimers();
		const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(async () => new Response("ok", { status: 200 }));
		const ctx: OSContext = {
			appId: "app.net",
			sessionId: "rate-1",
			permissions: ["net:request"],
			workingDirectory: process.cwd(),
		};
		const policy = new PolicyEngine({
			networkRule: {
				allowDomains: ["example.com"],
				rateLimit: { limit: 2, windowMs: 1000 },
			},
		});
		const net = new NetService(policy, new SecurityService());
		await net.request({ url: "https://example.com" }, ctx);
		await net.request({ url: "https://example.com" }, ctx);
		await expect(net.request({ url: "https://example.com" }, ctx)).rejects.toThrow("Network rate limit exceeded");
		expect(fetchMock).toHaveBeenCalledTimes(2);
		vi.useRealTimers();
	});

	it("opens circuit breaker after consecutive failures and recovers after cooldown", async () => {
		vi.useFakeTimers();
		const fetchMock = vi
			.spyOn(globalThis, "fetch")
			.mockRejectedValueOnce(new Error("net-1"))
			.mockRejectedValueOnce(new Error("net-2"))
			.mockResolvedValueOnce(new Response("ok", { status: 200 }));
		const ctx: OSContext = {
			appId: "app.net",
			sessionId: "breaker-1",
			permissions: ["net:request"],
			workingDirectory: process.cwd(),
		};
		const net = new NetService(new PolicyEngine(), new SecurityService(), undefined, {
			circuitBreaker: {
				failureThreshold: 2,
				cooldownMs: 1000,
			},
		});
		await expect(net.request({ url: "https://example.com" }, ctx)).rejects.toThrow("net-1");
		await expect(net.request({ url: "https://example.com" }, ctx)).rejects.toThrow("net-2");
		await expect(net.request({ url: "https://example.com" }, ctx)).rejects.toMatchObject({
			code: "E_NET_CIRCUIT_OPEN",
		});
		expect(fetchMock).toHaveBeenCalledTimes(2);

		await vi.advanceTimersByTimeAsync(1000);
		const response = await net.request({ url: "https://example.com" }, ctx);
		expect(response.status).toBe(200);
		expect(fetchMock).toHaveBeenCalledTimes(3);
		vi.useRealTimers();
	});
});

describe("SchedulerService", () => {
	it("schedules and cancels interval task", () => {
		vi.useFakeTimers();
		const scheduler = new SchedulerService();
		let count = 0;
		scheduler.scheduleInterval("job-1", 10, () => {
			count += 1;
		});
		vi.advanceTimersByTime(35);
		expect(count).toBe(3);
		expect(scheduler.cancel("job-1")).toBe(true);
		vi.advanceTimersByTime(50);
		expect(count).toBe(3);
		vi.useRealTimers();
	});

	it("retries task until success", async () => {
		vi.useFakeTimers();
		const scheduler = new SchedulerService();
		let attempts = 0;
		scheduler.scheduleRetryable(
			"job-retry",
			async () => {
				attempts += 1;
				if (attempts < 3) throw new Error("retry");
			},
			{ maxRetries: 5, backoffMs: 10 },
		);
		await vi.advanceTimersByTimeAsync(100);
		expect(attempts).toBe(3);
		vi.useRealTimers();
	});

	it("publishes retry and failure events", async () => {
		vi.useFakeTimers();
		const bus = new EventBus();
		const scheduler = new SchedulerService(bus);
		let retried = 0;
		let failed = 0;
		bus.subscribe("scheduler.task.retried", () => {
			retried += 1;
		});
		bus.subscribe("scheduler.task.failed", () => {
			failed += 1;
		});
		scheduler.scheduleRetryable(
			"job-fail",
			async () => {
				throw new Error("nope");
			},
			{ maxRetries: 1, backoffMs: 10 },
		);
		await vi.advanceTimersByTimeAsync(50);
		expect(retried).toBe(1);
		expect(failed).toBe(1);
		vi.useRealTimers();
	});

	it("lists task ids", () => {
		vi.useFakeTimers();
		const scheduler = new SchedulerService();
		scheduler.scheduleOnce("list-1", 1000, () => {});
		expect(scheduler.list()).toContain("list-1");
		vi.useRealTimers();
	});

	it("stores failed retryable tasks in dead letter queue", async () => {
		vi.useFakeTimers();
		const scheduler = new SchedulerService();
		scheduler.scheduleRetryable(
			"job-dlq",
			async () => {
				throw new Error("hard-fail");
			},
			{ maxRetries: 1, backoffMs: 10 },
		);
		await vi.advanceTimersByTimeAsync(50);
		const failures = scheduler.listFailures();
		expect(failures).toHaveLength(1);
		expect(failures[0]?.id).toBe("job-dlq");
		expect(failures[0]?.error).toBe("hard-fail");
		vi.useRealTimers();
	});

	it("clears dead letter records by id or all", async () => {
		vi.useFakeTimers();
		const scheduler = new SchedulerService();
		scheduler.scheduleRetryable(
			"job-clear-1",
			async () => {
				throw new Error("e1");
			},
			{ maxRetries: 0, backoffMs: 5 },
		);
		scheduler.scheduleRetryable(
			"job-clear-2",
			async () => {
				throw new Error("e2");
			},
			{ maxRetries: 0, backoffMs: 5 },
		);
		await vi.advanceTimersByTimeAsync(30);
		expect(scheduler.listFailures()).toHaveLength(2);

		const removedOne = scheduler.clearFailures("job-clear-1");
		expect(removedOne).toBe(1);
		expect(scheduler.listFailures()).toHaveLength(1);

		const removedAll = scheduler.clearFailures();
		expect(removedAll).toBe(1);
		expect(scheduler.listFailures()).toHaveLength(0);
		vi.useRealTimers();
	});

	it("replays dead letter task and succeeds", async () => {
		vi.useFakeTimers();
		const scheduler = new SchedulerService();
		let runs = 0;
		scheduler.scheduleRetryable(
			"job-replay-1",
			async () => {
				runs += 1;
				if (runs === 1) {
					throw new Error("first-fail");
				}
			},
			{ maxRetries: 0, backoffMs: 5 },
		);
		await vi.advanceTimersByTimeAsync(30);
		expect(scheduler.listFailures()).toHaveLength(1);
		expect(scheduler.replayFailure("job-replay-1")).toBe(true);
		await vi.advanceTimersByTimeAsync(30);
		expect(scheduler.listFailures()).toHaveLength(0);
		expect(runs).toBe(2);
		vi.useRealTimers();
	});

	it("exports and restores persisted scheduler state", async () => {
		vi.useFakeTimers();
		const bus = new EventBus();
		const scheduler = new SchedulerService(bus);
		let fired = 0;
		bus.subscribe("demo.restore", () => {
			fired += 1;
		});
		scheduler.scheduleEventOnce("persist-once", 100, "demo.restore", { ok: true });
		const snapshot = scheduler.exportState();
		expect(snapshot.tasks).toHaveLength(1);
		scheduler.cancel("persist-once");

		const restored = new SchedulerService(bus);
		const restoredResult = restored.restoreState(snapshot);
		expect(restoredResult.restoredTasks).toBe(1);
		await vi.advanceTimersByTimeAsync(120);
		expect(fired).toBe(1);
		vi.useRealTimers();
	});

	it("persists and recovers state via store adapter", async () => {
		vi.useFakeTimers();
		const store = new StoreService();
		const adapter = new StoreSchedulerStateAdapter(store);
		const scheduler = new SchedulerService(undefined, {
			storage: adapter,
			autoPersist: true,
		});
		scheduler.scheduleEventOnce("persist-store-1", 100, "demo.store", { ok: true });
		const persisted = scheduler.persistState();
		expect(persisted.persisted).toBe(true);

		const restoredBus = new EventBus();
		let fired = 0;
		restoredBus.subscribe("demo.store", () => {
			fired += 1;
		});
		const recovered = new SchedulerService(restoredBus, {
			storage: adapter,
		});
		const recoveredState = recovered.recoverState();
		expect(recoveredState.recovered).toBe(true);
		expect(recoveredState.restoredTasks).toBe(1);
		await vi.advanceTimersByTimeAsync(120);
		expect(fired).toBe(1);
		vi.useRealTimers();
	});
});

describe("NotificationService", () => {
	it("publishes event bus message", () => {
		const bus = new EventBus();
		const notification = new NotificationService(bus);
		const messages: string[] = [];
		bus.subscribe<{ message: string }>("notify", (event) => {
			messages.push(event.payload.message);
		});

		notification.send({ topic: "notify", message: "hello" });
		expect(messages).toEqual(["hello"]);
	});

	it("queries notifications by topic and limit", () => {
		const bus = new EventBus();
		const notification = new NotificationService(bus);
		notification.send({ topic: "a", message: "m1" });
		notification.send({ topic: "b", message: "m2" });
		notification.send({ topic: "a", message: "m3" });

		const a = notification.query({ topic: "a" });
		expect(a).toHaveLength(2);
		const last = notification.query({ limit: 1 });
		expect(last[0]?.topic).toBe("a");
		expect(last[0]?.message).toBe("m3");
		expect(last[0]?.severity).toBe("info");
	});

	it("deduplicates same topic+message within window", () => {
		vi.useFakeTimers();
		const bus = new EventBus();
		const notification = new NotificationService(bus, { dedupeWindowMs: 1000 });
		notification.send({ topic: "system.alert", message: "same" });
		notification.send({ topic: "system.alert", message: "same" });
		expect(notification.list()).toHaveLength(1);

		vi.advanceTimersByTime(1001);
		notification.send({ topic: "system.alert", message: "same" });
		expect(notification.list()).toHaveLength(2);
		vi.useRealTimers();
	});

	it("mutes topic within window and restores after expiration", () => {
		vi.useFakeTimers();
		const bus = new EventBus();
		const notification = new NotificationService(bus);
		notification.muteTopic({ topic: "system.alert", durationMs: 1000 });
		const sent1 = notification.send({ topic: "system.alert", message: "drop", severity: "error" });
		expect(sent1).toBe(false);
		expect(notification.list()).toHaveLength(0);

		vi.advanceTimersByTime(1001);
		const sent2 = notification.send({ topic: "system.alert", message: "deliver", severity: "critical" });
		expect(sent2).toBe(true);
		expect(notification.list()).toHaveLength(1);
		expect(notification.list()[0]?.severity).toBe("critical");
		vi.useRealTimers();
	});

	it("lists active mute topics", () => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date("2026-01-01T00:00:00.000Z"));
		const bus = new EventBus();
		const notification = new NotificationService(bus);
		notification.muteTopic({ topic: "system.alert", durationMs: 1000 });
		notification.muteTopic({ topic: "ops.alert", durationMs: 2000 });
		const mutes = notification.listMutes();
		expect(mutes).toHaveLength(2);
		expect(mutes[0]?.topic).toBe("ops.alert");
		vi.setSystemTime(new Date("2026-01-01T00:00:02.100Z"));
		const mutesAfter = notification.listMutes();
		expect(mutesAfter).toHaveLength(0);
		vi.useRealTimers();
	});

	it("filters notifications by since/until window", () => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date("2026-01-01T00:00:00.000Z"));
		const bus = new EventBus();
		const notification = new NotificationService(bus);
		notification.send({ topic: "system.alert", message: "m1" });
		vi.setSystemTime(new Date("2026-01-01T00:00:10.000Z"));
		notification.send({ topic: "system.alert", message: "m2" });
		vi.setSystemTime(new Date("2026-01-01T00:00:20.000Z"));
		notification.send({ topic: "system.alert", message: "m3" });

		const filtered = notification.query({
			topic: "system.alert",
			since: "2026-01-01T00:00:05.000Z",
			until: "2026-01-01T00:00:15.000Z",
		});
		expect(filtered).toHaveLength(1);
		expect(filtered[0]?.message).toBe("m2");
		vi.useRealTimers();
	});

	it("rate limits notifications per topic and records stats", () => {
		vi.useFakeTimers();
		const bus = new EventBus();
		const notification = new NotificationService(bus, {
			rateLimit: { limit: 2, windowMs: 1000 },
		});
		expect(notification.send({ topic: "system.alert", message: "m1" })).toBe(true);
		expect(notification.send({ topic: "system.alert", message: "m2" })).toBe(true);
		expect(notification.send({ topic: "system.alert", message: "m3" })).toBe(false);

		const stats = notification.getStats();
		expect(stats.sent).toBe(2);
		expect(stats.dropped.rateLimited).toBe(1);
		expect(stats.byTopic["system.alert"]?.sent).toBe(2);
		expect(stats.byTopic["system.alert"]?.dropped).toBe(1);

		vi.advanceTimersByTime(1001);
		expect(notification.send({ topic: "system.alert", message: "m4" })).toBe(true);
		vi.useRealTimers();
	});

	it("acknowledges notifications and filters unacked records", () => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date("2026-01-01T00:00:00.000Z"));
		const bus = new EventBus();
		const notification = new NotificationService(bus);
		notification.send({ topic: "system.alert", message: "m1" });
		vi.setSystemTime(new Date("2026-01-01T00:00:10.000Z"));
		notification.send({ topic: "system.alert", message: "m2" });
		const all = notification.query({ topic: "system.alert" });
		expect(all).toHaveLength(2);
		const firstId = all[0]?.id;
		expect(firstId).toBeDefined();
		const acked = notification.ack({ id: firstId! });
		expect(acked).toBe(1);
		const unacked = notification.query({ topic: "system.alert", acknowledged: false });
		expect(unacked).toHaveLength(1);
		expect(unacked[0]?.message).toBe("m2");
		expect(notification.query({ topic: "system.alert" })[0]?.ackedAt).toBeDefined();
		vi.useRealTimers();
	});

	it("acknowledges notifications in batch by filter", () => {
		const bus = new EventBus();
		const notification = new NotificationService(bus);
		notification.send({ topic: "system.alert", message: "m1", severity: "error" });
		notification.send({ topic: "system.alert", message: "m2", severity: "warning" });
		notification.send({ topic: "ops.alert", message: "m3", severity: "error" });
		const acked = notification.ackAll({ topic: "system.alert" });
		expect(acked).toBe(2);
		const unackedSystem = notification.query({ topic: "system.alert", acknowledged: false });
		expect(unackedSystem).toHaveLength(0);
		const unackedOps = notification.query({ topic: "ops.alert", acknowledged: false });
		expect(unackedOps).toHaveLength(1);
	});

	it("cleans up old notifications and expired mutes", () => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date("2026-01-01T00:00:00.000Z"));
		const bus = new EventBus();
		const notification = new NotificationService(bus);
		notification.send({ topic: "system.alert", message: "old" });
		notification.muteTopic({ topic: "system.alert", durationMs: 1000 });

		vi.setSystemTime(new Date("2026-01-01T00:00:10.000Z"));
		notification.send({ topic: "ops.alert", message: "new" });
		const cleaned = notification.cleanup({ olderThan: "2026-01-01T00:00:05.000Z" });
		expect(cleaned.notifications).toBe(1);
		expect(notification.query({ topic: "ops.alert" })).toHaveLength(1);
		expect(cleaned.mutes).toBe(1);
		vi.useRealTimers();
	});

	it("enforces retention limit for stored notifications", () => {
		const bus = new EventBus();
		const notification = new NotificationService(bus, { retentionLimit: 2 });
		notification.send({ topic: "system.alert", message: "r1" });
		notification.send({ topic: "system.alert", message: "r2" });
		notification.send({ topic: "system.alert", message: "r3" });
		const list = notification.query({ topic: "system.alert" });
		expect(list).toHaveLength(2);
		expect(list[0]?.message).toBe("r2");
		expect(list[1]?.message).toBe("r3");
	});

	it("updates notification policy at runtime", () => {
		const bus = new EventBus();
		const notification = new NotificationService(bus, {
			dedupeWindowMs: 0,
		});
		notification.updatePolicy({
			dedupeWindowMs: 1000,
			rateLimit: { limit: 1, windowMs: 1000 },
			retentionLimit: 2,
		});
		const policy = notification.getPolicy();
		expect(policy.dedupeWindowMs).toBe(1000);
		expect(policy.rateLimit?.limit).toBe(1);
		expect(policy.retentionLimit).toBe(2);
	});

	it("retries notification channel adapter delivery", async () => {
		vi.useFakeTimers();
		const bus = new EventBus();
		const notification = new NotificationService(bus, {
			channelDelivery: {
				retries: 2,
				backoffMs: 10,
			},
		});
		const adapter = {
			name: "webhook",
			send: vi
				.fn()
				.mockRejectedValueOnce(new Error("x1"))
				.mockRejectedValueOnce(new Error("x2"))
				.mockResolvedValue(undefined),
		};
		notification.registerChannelAdapter(adapter);
		notification.send({ topic: "system.alert", message: "channel-test", severity: "error" });
		await vi.advanceTimersByTimeAsync(50);
		const stats = notification.getChannelStats();
		expect(adapter.send).toHaveBeenCalledTimes(3);
		expect(stats.webhook?.retried).toBe(2);
		expect(stats.webhook?.success).toBe(1);
		vi.useRealTimers();
	});

	it("configures standard notification channels and sends payloads", async () => {
		const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("ok", { status: 200 }));
		const bus = new EventBus();
		const notification = new NotificationService(bus);
		const configured = notification.configureChannels({
			webhook: { url: "https://webhook.example/send" },
			slack: { webhookUrl: "https://slack.example/hook" },
			email: { endpoint: "https://email.example/send", to: "ops@example.com" },
		});
		expect(configured.configured).toEqual(["webhook", "slack", "email"]);
		notification.send({ topic: "system.alert", message: "chan", severity: "critical" });
		await new Promise((resolve) => setTimeout(resolve, 0));
		expect(fetchMock).toHaveBeenCalledTimes(3);
		const stats = notification.getChannelStats();
		expect(stats.webhook?.success).toBe(1);
		expect(stats.slack?.success).toBe(1);
		expect(stats.email?.success).toBe(1);
	});
});
