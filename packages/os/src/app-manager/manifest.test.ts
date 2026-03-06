import { describe, expect, it } from "vitest";
import { normalizeManifest, validateManifest } from "./manifest.js";
import { OSError } from "../kernel/errors.js";

describe("AppManifest v1", () => {
	it("normalizes legacy entry string into pages[]", () => {
		const normalized = normalizeManifest({
			id: "todo",
			name: "Todo",
			version: "1.0.0",
			entry: "src/pages/todo.tsx",
			permissions: ["app:manage"],
		});
		expect(normalized.entry.pages).toHaveLength(1);
		expect(normalized.entry.pages[0]?.route).toBe("todo://main");
		expect(normalized.entry.pages[0]?.default).toBe(true);
	});

	it("validates v1 entry pages", () => {
		expect(() =>
			validateManifest({
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
							path: "src/pages/list.tsx",
							default: true,
						},
					],
				},
				permissions: ["app:manage"],
			}),
		).not.toThrow();
	});

	it("rejects route conflicts and invalid route format", () => {
		expect(() =>
			validateManifest({
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
							path: "src/pages/list.tsx",
							default: true,
						},
						{
							id: "detail",
							route: "todo://list",
							name: "Detail",
							description: "Show todo detail",
							path: "src/pages/detail.tsx",
						},
					],
				},
				permissions: ["app:manage"],
			}),
		).toThrowError(expect.objectContaining({ code: "E_VALIDATION_FAILED" } satisfies Partial<OSError>));

		expect(() =>
			validateManifest({
				id: "todo",
				name: "Todo",
				version: "1.0.0",
				entry: {
					pages: [
						{
							id: "list",
							route: "bad-route",
							name: "List",
							description: "Show todo list",
							path: "src/pages/list.tsx",
							default: true,
						},
					],
				},
				permissions: ["app:manage"],
			}),
		).toThrowError(expect.objectContaining({ code: "E_VALIDATION_FAILED" } satisfies Partial<OSError>));
	});

	it("requires default page when multiple pages exist", () => {
		expect(() =>
			validateManifest({
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
							path: "src/pages/list.tsx",
						},
						{
							id: "detail",
							route: "todo://detail",
							name: "Detail",
							description: "Show todo detail",
							path: "src/pages/detail.tsx",
						},
					],
				},
				permissions: ["app:manage"],
			}),
		).toThrowError(expect.objectContaining({ code: "E_VALIDATION_FAILED" } satisfies Partial<OSError>));
	});

	it("rejects multiple default pages", () => {
		expect(() =>
			validateManifest({
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
							path: "src/pages/list.tsx",
							default: true,
						},
						{
							id: "detail",
							route: "todo://detail",
							name: "Detail",
							description: "Show todo detail",
							path: "src/pages/detail.tsx",
							default: true,
						},
					],
				},
				permissions: ["app:manage"],
			}),
		).toThrowError(expect.objectContaining({ code: "E_VALIDATION_FAILED" } satisfies Partial<OSError>));
	});
});
