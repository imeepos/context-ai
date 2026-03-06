import { describe, expect, it } from "vitest";
import { AppRouteRegistry } from "./route-registry.js";
import { OSError } from "../kernel/errors.js";

describe("AppRouteRegistry", () => {
	it("registers, resolves and unregisters routes", () => {
		const registry = new AppRouteRegistry();
		registry.register({
			id: "todo",
			name: "Todo",
			version: "1.0.0",
			entry: {
				pages: [
					{
						id: "list",
						route: "todo://list",
						name: "List",
						description: "Todo list",
						path: "src/todo/list.tsx",
						default: true,
					},
				],
			},
			permissions: [],
		});
		expect(registry.resolve("todo://list").appId).toBe("todo");
		expect(registry.listRoutes("todo")).toEqual(["todo://list"]);
		registry.unregisterApp("todo");
		expect(() => registry.resolve("todo://list")).toThrowError(
			expect.objectContaining({ code: "E_VALIDATION_FAILED" } satisfies Partial<OSError>),
		);
	});

	it("tracks route render stats", () => {
		const registry = new AppRouteRegistry();
		registry.register({
			id: "todo",
			name: "Todo",
			version: "1.0.0",
			entry: {
				pages: [
					{
						id: "list",
						route: "todo://list",
						name: "List",
						description: "Todo list",
						path: "src/todo/list.tsx",
						default: true,
					},
				],
			},
			permissions: [],
		});
		registry.recordRender("todo://list", { success: true });
		registry.recordRender("todo://list", { success: false, error: "boom" });
		const stats = registry.stats("todo");
		expect(stats).toHaveLength(1);
		expect(stats[0]?.total).toBe(2);
		expect(stats[0]?.success).toBe(1);
		expect(stats[0]?.failure).toBe(1);
		expect(stats[0]?.lastError).toContain("boom");
	});

	it("clears lastError after successful render", () => {
		const registry = new AppRouteRegistry();
		registry.register({
			id: "todo",
			name: "Todo",
			version: "1.0.0",
			entry: {
				pages: [
					{
						id: "list",
						route: "todo://list",
						name: "List",
						description: "Todo list",
						path: "src/todo/list.tsx",
						default: true,
					},
				],
			},
			permissions: [],
		});
		registry.recordRender("todo://list", { success: false, error: "boom" });
		registry.recordRender("todo://list", { success: true });
		const stats = registry.stats("todo");
		expect(stats[0]?.lastError).toBeUndefined();
	});

	it("rejects duplicate route from another app", () => {
		const registry = new AppRouteRegistry();
		registry.register({
			id: "a",
			name: "A",
			version: "1.0.0",
			entry: {
				pages: [
					{
						id: "list",
						route: "shared://list",
						name: "List",
						description: "Shared",
						path: "src/a/list.tsx",
						default: true,
					},
				],
			},
			permissions: [],
		});
		expect(() =>
			registry.register({
				id: "b",
				name: "B",
				version: "1.0.0",
				entry: {
					pages: [
						{
							id: "list",
							route: "shared://list",
							name: "List",
							description: "Shared",
							path: "src/b/list.tsx",
							default: true,
						},
					],
				},
				permissions: [],
			}),
		).toThrowError(expect.objectContaining({ code: "E_VALIDATION_FAILED" } satisfies Partial<OSError>));
	});
});
