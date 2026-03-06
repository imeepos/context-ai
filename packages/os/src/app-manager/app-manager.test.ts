import { describe, expect, it } from "vitest";
import {
	AppManager,
	createAppStartService,
	createAppInstallService,
	createAppInstallV1Service,
	createAppPageRenderService,
	createRenderService,
	createRuntimeRiskConfirmService,
	createRuntimeToolsValidateService,
} from "./index.js";
import { OSError } from "../kernel/errors.js";
import { SecurityService } from "../security-service/index.js";

describe("AppManager", () => {
	it("installs app and grants manifest permissions", () => {
		const manager = new AppManager();
		manager.install({
			id: "app.notes",
			name: "Notes",
			version: "1.0.0",
			entry: "index.js",
			permissions: ["file:read", "file:write"],
		});

		expect(manager.registry.get("app.notes").name).toBe("Notes");
		expect(manager.permissions.has("app.notes", "file:read")).toBe(true);
	});

	it("enforces lifecycle transitions", () => {
		const manager = new AppManager();
		manager.install({
			id: "app.todo",
			name: "Todo",
			version: "1.0.0",
			entry: "index.js",
			permissions: [],
		});
		expect(manager.setState("app.todo", "resolved")).toBe("resolved");
		expect(manager.setState("app.todo", "active")).toBe("active");
		expect(() => manager.setState("app.todo", "installed")).toThrow("Invalid lifecycle transition");
		expect(() => manager.setState("app.todo", "installed")).toThrowError(
			expect.objectContaining({ code: "E_VALIDATION_FAILED" } satisfies Partial<OSError>),
		);
	});

	it("enforces quota", () => {
		const manager = new AppManager();
		manager.install(
			{
				id: "app.quota",
				name: "Quota",
				version: "1.0.0",
				entry: "index.js",
				permissions: [],
			},
			{ maxToolCalls: 1, maxTokens: 10 },
		);
		manager.quota.consume("app.quota", { toolCalls: 1, tokens: 5 });
		expect(() => manager.quota.consume("app.quota", { toolCalls: 1 })).toThrow("Quota exceeded");
		expect(() => manager.quota.consume("app.quota", { toolCalls: 1 })).toThrowError(
			expect.objectContaining({ code: "E_QUOTA_EXCEEDED" } satisfies Partial<OSError>),
		);
	});

	it("supports disable/enable and uninstall", () => {
		const manager = new AppManager();
		manager.install({
			id: "app.switch",
			name: "Switch",
			version: "1.0.0",
			entry: "index.js",
			permissions: ["store:write"],
		});
		expect(manager.isEnabled("app.switch")).toBe(true);
		manager.disable("app.switch");
		expect(manager.isEnabled("app.switch")).toBe(false);
		manager.enable("app.switch");
		expect(manager.isEnabled("app.switch")).toBe(true);
		manager.uninstall("app.switch");
		expect(manager.registry.has("app.switch")).toBe(false);
		expect(() => manager.routes.resolve("app.switch://main")).toThrowError(
			expect.objectContaining({ code: "E_VALIDATION_FAILED" } satisfies Partial<OSError>),
		);
	});

	it("upgrades app manifest and permissions", () => {
		const manager = new AppManager();
		manager.install({
			id: "app.up",
			name: "Up",
			version: "1.0.0",
			entry: "index.js",
			permissions: ["store:read"],
		});
		manager.upgrade({
			id: "app.up",
			name: "Up",
			version: "1.1.0",
			entry: "index.js",
			permissions: ["store:read", "store:write"],
		});
		expect(manager.registry.get("app.up").version).toBe("1.1.0");
		expect(manager.permissions.has("app.up", "store:write")).toBe(true);
	});

	it("returns typed error for missing app operations", () => {
		const manager = new AppManager();
		expect(() => manager.enable("missing-app")).toThrowError(
			expect.objectContaining({ code: "E_APP_NOT_REGISTERED" } satisfies Partial<OSError>),
		);
		expect(() =>
			manager.upgrade({
				id: "missing-app",
				name: "Missing",
				version: "1.0.0",
				entry: "index.js",
				permissions: [],
			}),
		).toThrowError(expect.objectContaining({ code: "E_APP_NOT_REGISTERED" } satisfies Partial<OSError>));
	});

	it("returns typed validation error for invalid manifest", () => {
		const manager = new AppManager();
		expect(() =>
			manager.install({
				id: "",
				name: "Invalid",
				version: "1.0.0",
				entry: "index.js",
				permissions: [],
			}),
		).toThrowError(expect.objectContaining({ code: "E_VALIDATION_FAILED" } satisfies Partial<OSError>));
	});

	it("registers and resolves page route for v1 manifest", () => {
		const manager = new AppManager();
		manager.install({
			id: "todo",
			name: "Todo",
			version: "1.0.0",
			entry: {
				pages: [
					{
						id: "list",
						route: "todo://list",
						name: "List",
						description: "Show todo list",
						path: "src/todo/list.tsx",
						default: true,
					},
				],
			},
			permissions: ["app:manage", "app:read"],
		});
		const resolved = manager.routes.resolve("todo://list");
		expect(resolved.appId).toBe("todo");
		expect(resolved.page.path).toBe("src/todo/list.tsx");
	});

	it("replaces stale routes when install is called with same app id", () => {
		const manager = new AppManager();
		manager.install({
			id: "todo",
			name: "Todo",
			version: "1.0.0",
			entry: {
				pages: [
					{
						id: "list",
						route: "todo://list",
						name: "List",
						description: "Show todo list",
						path: "src/todo/list.tsx",
						default: true,
					},
				],
			},
			permissions: ["app:manage", "app:read"],
		});
		manager.install({
			id: "todo",
			name: "Todo",
			version: "1.1.0",
			entry: {
				pages: [
					{
						id: "board",
						route: "todo://board",
						name: "Board",
						description: "Show todo board",
						path: "src/todo/board.tsx",
						default: true,
					},
				],
			},
			permissions: ["app:manage", "app:read"],
		});
		expect(() => manager.routes.resolve("todo://list")).toThrowError(
			expect.objectContaining({ code: "E_VALIDATION_FAILED" } satisfies Partial<OSError>),
		);
		expect(manager.routes.resolve("todo://board").page.path).toBe("src/todo/board.tsx");
	});

	it("renders app page by route", async () => {
		const manager = new AppManager();
		manager.install({
			id: "todo",
			name: "Todo",
			version: "1.0.0",
			entry: {
				pages: [
					{
						id: "list",
						route: "todo://list",
						name: "List",
						description: "Show todo list",
						path: "src/todo/list.tsx",
						default: true,
					},
				],
			},
			permissions: ["app:manage", "app:read"],
		});
		const service = createAppPageRenderService(manager, {
			render: async ({ appId, page }) => ({
				prompt: `render:${appId}:${page.route}`,
				tools: [{ name: "todo.list" }],
				metadata: { appId },
			}),
		});
		const result = await service.execute(
			{ route: "todo://list" },
			{
				appId: "todo",
				sessionId: "s-render",
				permissions: ["app:read"],
				workingDirectory: process.cwd(),
			},
		);
		expect(result.prompt).toContain("todo://list");
		expect(result.tools[0]?.name).toBe("todo.list");
		const stats = manager.routes.stats("todo");
		expect(stats[0]?.success).toBeGreaterThan(0);
	});

	it("supports quick render alias service", async () => {
		const manager = new AppManager();
		manager.install({
			id: "todo",
			name: "Todo",
			version: "1.0.0",
			entry: {
				pages: [
					{
						id: "list",
						route: "todo://list",
						name: "List",
						description: "Show todo list",
						path: "src/todo/list.tsx",
						default: true,
					},
				],
			},
			permissions: ["app:manage", "app:read"],
		});
		const service = createRenderService(manager, {
			render: async ({ appId, page }) => ({
				prompt: `render:${appId}:${page.route}`,
				tools: [{ name: "todo.list" }],
			}),
		});
		const result = await service.execute(
			{ route: "todo://list" },
			{
				appId: "todo",
				sessionId: "s-render-quick",
				permissions: ["app:read"],
				workingDirectory: process.cwd(),
			},
		);
		expect(result.page.route).toBe("todo://list");
		expect(result.tools[0]?.name).toBe("todo.list");
	});

	it("starts app with default page when route is omitted", async () => {
		const manager = new AppManager();
		manager.install({
			id: "todo",
			name: "Todo",
			version: "1.0.0",
			entry: {
				pages: [
					{
						id: "list",
						route: "todo://list",
						name: "List",
						description: "Show todo list",
						path: "src/todo/list.tsx",
						default: true,
					},
				],
			},
			permissions: ["app:manage", "app:read"],
		});
		const service = createAppStartService(manager, {
			render: async ({ appId, page }) => ({
				prompt: `start:${appId}:${page.route}`,
				tools: [{ name: "todo.list" }],
			}),
		});
		const result = await service.execute(
			{ appId: "todo" },
			{
				appId: "todo",
				sessionId: "s-start",
				permissions: ["app:read"],
				workingDirectory: process.cwd(),
			},
		);
		expect(result.route).toBe("todo://list");
		expect(result.prompt).toContain("start:todo:todo://list");
		expect(manager.lifecycle.getState("todo")).toBe("running");
	});

	it("starts app with provided route", async () => {
		const manager = new AppManager();
		manager.install({
			id: "todo",
			name: "Todo",
			version: "1.0.0",
			entry: {
				pages: [
					{
						id: "list",
						route: "todo://list",
						name: "List",
						description: "Show todo list",
						path: "src/todo/list.tsx",
						default: true,
					},
					{
						id: "detail",
						route: "todo://detail",
						name: "Detail",
						description: "Show todo detail",
						path: "src/todo/detail.tsx",
					},
				],
			},
			permissions: ["app:manage", "app:read"],
		});
		const service = createAppStartService(manager, {
			render: async ({ page }) => ({
				prompt: `start:${page.route}`,
				tools: [{ name: "todo.open" }],
			}),
		});
		const result = await service.execute(
			{ appId: "todo", route: "todo://detail" },
			{
				appId: "todo",
				sessionId: "s-start-route",
				permissions: ["app:read"],
				workingDirectory: process.cwd(),
			},
		);
		expect(result.route).toBe("todo://detail");
		expect(result.tools[0]?.name).toBe("todo.open");
		expect(manager.lifecycle.getState("todo")).toBe("running");
	});

	it("records failed render when app.start renderer throws", async () => {
		const manager = new AppManager();
		manager.install({
			id: "todo",
			name: "Todo",
			version: "1.0.0",
			entry: {
				pages: [
					{
						id: "list",
						route: "todo://list",
						name: "List",
						description: "Show todo list",
						path: "src/todo/list.tsx",
						default: true,
					},
				],
			},
			permissions: ["app:manage", "app:read"],
		});
		const service = createAppStartService(manager, {
			render: async () => {
				throw new Error("render boom");
			},
		});
		await expect(
			service.execute(
				{ appId: "todo" },
				{
					appId: "todo",
					sessionId: "s-start-failed",
					permissions: ["app:read"],
					workingDirectory: process.cwd(),
				},
			),
		).rejects.toThrow("render boom");
		const stats = manager.routes.stats("todo");
		expect(stats[0]?.failure).toBeGreaterThan(0);
	});

	it("recovers lifecycle from suspended to running on app.start", async () => {
		const manager = new AppManager();
		manager.install({
			id: "todo",
			name: "Todo",
			version: "1.0.0",
			entry: {
				pages: [
					{
						id: "list",
						route: "todo://list",
						name: "List",
						description: "Show todo list",
						path: "src/todo/list.tsx",
						default: true,
					},
				],
			},
			permissions: ["app:manage", "app:read"],
		});
		manager.setState("todo", "resolved");
		manager.setState("todo", "active");
		manager.setState("todo", "running");
		manager.setState("todo", "suspended");
		const service = createAppStartService(manager, {
			render: async ({ page }) => ({
				prompt: page.route,
				tools: [],
			}),
		});
		await service.execute(
			{ appId: "todo" },
			{
				appId: "todo",
				sessionId: "s-start-resume",
				permissions: ["app:read"],
				workingDirectory: process.cwd(),
			},
		);
		expect(manager.lifecycle.getState("todo")).toBe("running");
	});

	it("validates runtime tools against route app permissions", async () => {
		const manager = new AppManager();
		manager.install({
			id: "todo",
			name: "Todo",
			version: "1.0.0",
			entry: {
				pages: [
					{
						id: "list",
						route: "todo://list",
						name: "List",
						description: "Show todo list",
						path: "src/todo/list.tsx",
						default: true,
					},
				],
			},
			permissions: ["app:read", "store:read"],
		});
		const service = createRuntimeToolsValidateService(manager);
		const ok = await service.execute(
			{
				route: "todo://list",
				tools: [{ name: "todo.list", parameters: { type: "object" }, requiredPermissions: ["store:read"] }],
			},
			{
				appId: "todo",
				sessionId: "s-tools",
				permissions: ["app:read"],
				workingDirectory: process.cwd(),
			},
		);
		expect(ok.valid).toBe(true);

		const bad = await service.execute(
			{
				route: "todo://list",
				tools: [{ name: "", parameters: "bad", requiredPermissions: ["store:write"] }],
			},
			{
				appId: "todo",
				sessionId: "s-tools",
				permissions: ["app:read"],
				workingDirectory: process.cwd(),
			},
		);
		expect(bad.valid).toBe(false);
		expect(bad.issues.length).toBeGreaterThan(0);
	});

	it("rejects install with no page delta unless force is true", async () => {
		const manager = new AppManager();
		const service = createAppInstallService(manager);
		const manifest = {
			id: "todo",
			name: "Todo",
			version: "1.0.0",
			entry: {
				pages: [
					{
						id: "list",
						route: "todo://list",
						name: "List",
						description: "Show todo list",
						path: "src/todo/list.tsx",
						default: true,
					},
				],
			},
			permissions: ["app:manage"],
		};
		await service.execute(
			{ manifest },
			{
				appId: "todo",
				sessionId: "s-install",
				permissions: ["app:manage"],
				workingDirectory: process.cwd(),
			},
		);
		await expect(
			service.execute(
				{ manifest },
				{
					appId: "todo",
					sessionId: "s-install",
					permissions: ["app:manage"],
					workingDirectory: process.cwd(),
				},
			),
		).rejects.toThrowError(expect.objectContaining({ code: "E_VALIDATION_FAILED" } satisfies Partial<OSError>));
		const forced = await service.execute(
			{ manifest, force: true },
			{
				appId: "todo",
				sessionId: "s-install",
				permissions: ["app:manage"],
				workingDirectory: process.cwd(),
			},
		);
		expect(forced.ok).toBe(true);
		expect(forced.report.appId).toBe("todo");
		expect(Array.isArray(forced.report.addedObservability)).toBe(true);
	});

	it("supports v1 install with signature verification", async () => {
		const manager = new AppManager();
		const security = new SecurityService();
		const service = createAppInstallV1Service(manager, security);
		const manifest = {
			id: "todo.v1",
			name: "Todo V1",
			version: "1.0.0",
			entry: {
				pages: [
					{
						id: "list",
						route: "todo.v1://list",
						name: "List",
						description: "Show todo list",
						path: "src/todo-v1/list.tsx",
						default: true,
					},
				],
			},
			permissions: ["app:manage", "app:read"],
		};
		const payload = JSON.stringify({
			id: manifest.id,
			name: manifest.name,
			version: manifest.version,
			pages: [
				{
					id: "list",
					route: "todo.v1://list",
					name: "List",
					description: "Show todo list",
					path: "src/todo-v1/list.tsx",
					tags: [],
					default: true,
				},
			],
			permissions: ["app:manage", "app:read"].sort(),
		});
		const signingSecret = "k-sign";
		const signature = security.sign(payload, signingSecret);
		const result = await service.execute(
			{
				manifest: {
					...manifest,
					signing: { keyId: "k1", signature },
				},
				requireSignature: true,
				signingSecret,
			},
			{
				appId: "todo.v1",
				sessionId: "s-install-v1",
				permissions: ["app:manage"],
				workingDirectory: process.cwd(),
			},
		);
		expect(result.ok).toBe(true);
		await expect(
			service.execute(
				{
					manifest: {
						...manifest,
						signing: { keyId: "k1", signature: "deadbeef" },
					},
					requireSignature: true,
					signingSecret,
				},
				{
					appId: "todo.v1",
					sessionId: "s-install-v1",
					permissions: ["app:manage"],
					workingDirectory: process.cwd(),
				},
			),
		).rejects.toThrowError(expect.objectContaining({ code: "E_POLICY_DENIED" } satisfies Partial<OSError>));
	});

	it("confirms runtime risk by level and approval metadata", async () => {
		const service = createRuntimeRiskConfirmService();
		const low = await service.execute(
			{ riskLevel: "low" },
			{
				appId: "todo",
				sessionId: "s-risk",
				permissions: ["app:read"],
				workingDirectory: process.cwd(),
			},
		);
		expect(low.allowed).toBe(true);
		const mediumDenied = await service.execute(
			{ riskLevel: "medium" },
			{
				appId: "todo",
				sessionId: "s-risk",
				permissions: ["app:read"],
				workingDirectory: process.cwd(),
			},
		);
		expect(mediumDenied.allowed).toBe(false);
		const highDenied = await service.execute(
			{ riskLevel: "high", approved: true, approver: "ops" },
			{
				appId: "todo",
				sessionId: "s-risk",
				permissions: ["app:read"],
				workingDirectory: process.cwd(),
			},
		);
		expect(highDenied.allowed).toBe(false);
		const highAllowed = await service.execute(
			{
				riskLevel: "high",
				approved: true,
				approver: "ops",
				approvalExpiresAt: new Date(Date.now() + 60_000).toISOString(),
			},
			{
				appId: "todo",
				sessionId: "s-risk",
				permissions: ["app:read"],
				workingDirectory: process.cwd(),
			},
		);
		expect(highAllowed.allowed).toBe(true);
	});
});
