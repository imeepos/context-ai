import { describe, expect, it } from "vitest";
import { AppManager } from "../app-manager/index.js";
import { ModelService } from "../model-service/index.js";
import { createTaskDecomposeService, createTaskLoopService, createTaskSubmitService } from "./index.js";

function createInstalledManager(): AppManager {
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
		permissions: ["app:read", "model:invoke"],
	});
	return manager;
}

describe("TaskRuntime", () => {
	it("decomposes text task into subtasks", async () => {
		const service = createTaskDecomposeService();
		const response = await service.execute(
			{ text: "collect data, analyze trends, then write summary", maxParts: 5 },
			{
				appId: "todo",
				sessionId: "s-decompose",
				permissions: ["app:read"],
				workingDirectory: process.cwd(),
			},
		);
		expect(response.tasks.length).toBeGreaterThan(1);
	});

	it("submits text task and stops by condition", async () => {
		const manager = createInstalledManager();
		const model = new ModelService();
		model.register({
			name: "echo",
			generate: async () => "DONE: task completed",
		});
		const service = createTaskSubmitService(
			manager,
			{
				render: async ({ page }) => ({
					prompt: `page:${page.route}`,
					tools: [{ name: "todo.list" }],
				}),
			},
			model,
		);
		const result = await service.execute(
			{ text: "list todos", route: "todo://list", maxSteps: 3 },
			{
				appId: "todo",
				sessionId: "s-task",
				permissions: ["app:read", "model:invoke"],
				workingDirectory: process.cwd(),
			},
		);
		expect(result.terminatedBy).toBe("stop_condition");
		expect(result.steps).toBe(1);
		expect(result.usedRoute).toBe("todo://list");
	});

	it("stops by budget limit", async () => {
		const manager = createInstalledManager();
		const model = new ModelService();
		model.register({
			name: "echo",
			generate: async () => "working",
		});
		const service = createTaskSubmitService(
			manager,
			{
				render: async ({ page }) => ({
					prompt: `page:${page.route}`,
					tools: [{ name: "todo.list" }],
				}),
			},
			model,
		);
		const result = await service.execute(
			{ text: "run task", route: "todo://list", maxSteps: 5, budget: 20 },
			{
				appId: "todo",
				sessionId: "s-task",
				permissions: ["app:read", "model:invoke"],
				workingDirectory: process.cwd(),
			},
		);
		expect(result.terminatedBy).toBe("budget");
		expect(result.steps).toBe(0);
	});

	it("loops with explicit task.loop service", async () => {
		const manager = createInstalledManager();
		const model = new ModelService();
		model.register({
			name: "echo",
			generate: async () => "DONE from loop",
		});
		const service = createTaskLoopService(
			manager,
			{
				render: async ({ page }) => ({
					prompt: `page:${page.route}`,
					tools: [{ name: "todo.list" }],
				}),
			},
			model,
		);
		const result = await service.execute(
			{ route: "todo://list", taskGoal: "execute loop task", maxSteps: 3, stopCondition: "DONE" },
			{
				appId: "todo",
				sessionId: "s-loop",
				permissions: ["app:read", "model:invoke"],
				workingDirectory: process.cwd(),
			},
		);
		expect(result.terminatedBy).toBe("stop_condition");
		expect(result.steps).toBe(1);
	});
});
