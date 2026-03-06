import { describe, expect, it } from "vitest";
import { ServiceRegistry } from "./service-registry.js";
import { OSError } from "./errors.js";

describe("ServiceRegistry", () => {
	it("rejects registration when dependency is missing", () => {
		const registry = new ServiceRegistry();
		expect(() =>
			registry.register({
				name: "b",
				dependencies: ["a"],
				execute: async () => ({ ok: true }),
			}),
		).toThrow("Service dependency missing");
	});

	it("returns dependency graph", () => {
		const registry = new ServiceRegistry();
		registry.register({
			name: "a",
			execute: async () => ({ ok: true }),
		});
		registry.register({
			name: "b",
			dependencies: ["a"],
			execute: async () => ({ ok: true }),
		});
		expect(registry.getDependencies("b")).toEqual(["a"]);
		expect(registry.graph()).toEqual({
			a: [],
			b: ["a"],
		});
	});

	it("returns boot order", () => {
		const registry = new ServiceRegistry();
		registry.register({
			name: "a",
			execute: async () => ({ ok: true }),
		});
		registry.register({
			name: "b",
			dependencies: ["a"],
			execute: async () => ({ ok: true }),
		});
		registry.register({
			name: "c",
			dependencies: ["b"],
			execute: async () => ({ ok: true }),
		});
		expect(registry.bootOrder()).toEqual(["a", "b", "c"]);
	});

	it("registers services in batch with dependency resolution", () => {
		const registry = new ServiceRegistry();
		registry.registerMany([
			{
				name: "c",
				dependencies: ["b"],
				execute: async () => ({ ok: true }),
			},
			{
				name: "a",
				execute: async () => ({ ok: true }),
			},
			{
				name: "b",
				dependencies: ["a"],
				execute: async () => ({ ok: true }),
			},
		]);
		expect(registry.bootOrder()).toEqual(["a", "b", "c"]);
	});

	it("rejects batch registration cycles", () => {
		const registry = new ServiceRegistry();
		expect(() =>
			registry.registerMany([
				{
					name: "a",
					dependencies: ["b"],
					execute: async () => ({ ok: true }),
				},
				{
					name: "b",
					dependencies: ["a"],
					execute: async () => ({ ok: true }),
				},
			]),
		).toThrow("Service dependency cycle detected");
	});

	it("returns typed error for missing service lookup", () => {
		const registry = new ServiceRegistry();
		expect(() => registry.get("missing")).toThrowError(
			expect.objectContaining({ code: "E_SERVICE_NOT_FOUND" } satisfies Partial<OSError>),
		);
	});
});
