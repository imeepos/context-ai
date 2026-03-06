import { describe, expect, it } from "vitest";
import { AppManager } from "./index.js";
import { OSError } from "../kernel/errors.js";

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
});
