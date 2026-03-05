import { describe, expect, it } from "vitest";
import { LLMOSKernel } from "./index.js";
import { createCTPTool, createCTPToolsFromKernel } from "./tool-adapter.js";

describe("createCTPTool", () => {
	it("adapts OSService to CTP tool definition", async () => {
		const kernel = new LLMOSKernel();
		kernel.registerService({
			name: "demo.add",
			requiredPermissions: ["math:add"],
			execute: async (req: { a: number; b: number }) => ({ sum: req.a + req.b }),
		});
		const tool = createCTPTool(
			kernel,
			{
				name: "demo.add",
				requiredPermissions: ["math:add"],
				execute: async (req: { a: number; b: number }) => ({ sum: req.a + req.b }),
			},
			{
				description: "Add numbers",
				parameters: {
					type: "object",
					properties: {
						a: { type: "number" },
						b: { type: "number" },
					},
					required: ["a", "b"],
				},
			},
		);
		const result = await tool.execute(
			{ a: 1, b: 2 },
			{
				appId: "app.math",
				sessionId: "s1",
				permissions: ["math:add"],
				workingDirectory: process.cwd(),
			},
		);
		expect(result).toMatchObject({
			result: { sum: 3 },
			meta: { service: "demo.add" },
		});
	});

	it("creates tool list from kernel services", async () => {
		const kernel = new LLMOSKernel();
		kernel.registerService({
			name: "a.ping",
			requiredPermissions: [],
			execute: async () => ({ ok: true }),
		});
		kernel.registerService({
			name: "b.ping",
			requiredPermissions: [],
			execute: async () => ({ ok: true }),
		});

		const tools = createCTPToolsFromKernel(kernel, {
			"a.ping": {
				description: "A ping",
			},
		});
		expect(tools).toHaveLength(2);
		const a = tools.find((t) => t.name === "a.ping");
		const b = tools.find((t) => t.name === "b.ping");
		expect(a?.description).toBe("A ping");
		expect(b?.description).toContain("Kernel service");
	});
});
