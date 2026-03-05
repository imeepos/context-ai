import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, describe, expect, it, vi } from "vitest";
import { EventBus } from "../kernel/event-bus.js";
import { PolicyEngine } from "../kernel/policy-engine.js";
import type { OSContext } from "../types/os.js";
import { NetService } from "../net-service/index.js";
import { NotificationService } from "../notification-service/index.js";
import { SchedulerService } from "../scheduler-service/index.js";
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
		expect(last).toEqual([{ topic: "a", message: "m3" }]);
	});
});
