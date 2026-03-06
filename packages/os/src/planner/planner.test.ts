import { describe, expect, it } from "vitest";
import { AppManager } from "../app-manager/index.js";
import { ModelService } from "../model-service/index.js";
import {
	createPlannerComposeToolsService,
	createPlannerSelectAppsService,
	createRunnerExecutePlanService,
} from "./index.js";

function createManager(): AppManager {
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
					name: "Todo List",
					description: "Show todo list",
					path: "src/todo/list.tsx",
					tags: ["task"],
					default: true,
				},
			],
		},
		permissions: ["app:read", "model:invoke"],
	});
	manager.install({
		id: "calendar",
		name: "Calendar",
		version: "1.0.0",
		entry: {
			pages: [
				{
					id: "events",
					route: "calendar://events",
					name: "Events",
					description: "Show calendar events",
					path: "src/calendar/events.tsx",
					tags: ["schedule"],
					default: true,
				},
			],
		},
		permissions: ["app:read", "model:invoke"],
	});
	return manager;
}

describe("PlannerRuntime", () => {
	it("selects apps by text similarity", async () => {
		const manager = createManager();
		const service = createPlannerSelectAppsService(manager);
		const response = await service.execute(
			{ text: "show my todo tasks", limit: 1 },
			{
				appId: "todo",
				sessionId: "s-planner",
				permissions: ["app:read"],
				workingDirectory: process.cwd(),
			},
		);
		expect(response.selected).toHaveLength(1);
		expect(response.selected[0]?.appId).toBe("todo");
	});

	it("composes tools from multiple routes", async () => {
		const manager = createManager();
		const service = createPlannerComposeToolsService(manager, {
			render: async ({ page }) => ({
				prompt: `page:${page.route}`,
				tools: [{ name: `${page.id}.tool` }],
			}),
		});
		const response = await service.execute(
			{ routes: ["todo://list", "calendar://events"] },
			{
				appId: "todo",
				sessionId: "s-planner",
				permissions: ["app:read"],
				workingDirectory: process.cwd(),
			},
		);
		expect(response.composed).toHaveLength(2);
		expect(response.toolCount).toBe(2);
	});

	it("executes plan across routes", async () => {
		const manager = createManager();
		const model = new ModelService();
		model.register({
			name: "echo",
			generate: async (req) => (req.prompt.includes("calendar://events") ? "DONE: merged output" : "continue"),
		});
		const service = createRunnerExecutePlanService(
			manager,
			{
				render: async ({ page }) => ({
					prompt: `page:${page.route}`,
					tools: [{ name: `${page.id}.tool` }],
				}),
			},
			model,
		);
		const response = await service.execute(
			{
				text: "plan today tasks",
				routes: ["todo://list", "calendar://events"],
				stopCondition: "DONE",
				maxSteps: 5,
			},
			{
				appId: "todo",
				sessionId: "s-runner",
				permissions: ["app:read", "model:invoke"],
				workingDirectory: process.cwd(),
			},
		);
		expect(response.results.length).toBeGreaterThan(0);
		expect(["stop_condition", "max_steps"]).toContain(response.terminatedBy);
	});

	it("retries failed route and falls back to fallback route", async () => {
		const manager = createManager();
		const model = new ModelService();
		let call = 0;
		model.register({
			name: "echo",
			generate: async (req) => {
				call += 1;
				if (req.prompt.includes("todo://list")) {
					throw new Error("todo failed");
				}
				return "DONE: fallback success";
			},
		});
		const service = createRunnerExecutePlanService(
			manager,
			{
				render: async ({ page }) => ({
					prompt: `page:${page.route}`,
					tools: [{ name: `${page.id}.tool` }],
				}),
			},
			model,
		);
		const response = await service.execute(
			{
				text: "plan with fallback",
				routes: ["todo://list"],
				fallbackRoute: "calendar://events",
				maxRetries: 1,
				stopCondition: "DONE",
			},
			{
				appId: "todo",
				sessionId: "s-runner-fallback",
				permissions: ["app:read", "model:invoke"],
				workingDirectory: process.cwd(),
			},
		);
		expect(call).toBeGreaterThan(1);
		expect(response.failures).toHaveLength(1);
		expect(response.results.some((item) => item.route === "calendar://events" && item.recovered)).toBe(true);
	});

	it("denies high-risk execution without valid approval", async () => {
		const manager = createManager();
		const model = new ModelService();
		model.register({
			name: "echo",
			generate: async () => "ok",
		});
		const service = createRunnerExecutePlanService(
			manager,
			{
				render: async ({ page }) => ({
					prompt: `page:${page.route}`,
					tools: [{ name: `${page.id}.tool` }],
				}),
			},
			model,
		);
		await expect(
			service.execute(
				{
					text: "danger op",
					routes: ["todo://list"],
					risk: { level: "high", approved: true, approver: "ops" },
				},
				{
					appId: "todo",
					sessionId: "s-runner-risk",
					permissions: ["app:read", "model:invoke"],
					workingDirectory: process.cwd(),
				},
			),
		).rejects.toThrow();
		const allowed = await service.execute(
			{
				text: "danger op",
				routes: ["todo://list"],
				risk: {
					level: "high",
					approved: true,
					approver: "ops",
					approvalExpiresAt: new Date(Date.now() + 60_000).toISOString(),
				},
			},
			{
				appId: "todo",
				sessionId: "s-runner-risk",
				permissions: ["app:read", "model:invoke"],
				workingDirectory: process.cwd(),
			},
		);
		expect(allowed.steps).toBeGreaterThan(0);
	});
});
