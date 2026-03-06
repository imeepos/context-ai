import type { OSService } from "../types/os.js";
import type { AppManager, AppPageRenderer } from "../app-manager/index.js";
import type { ModelService } from "../model-service/index.js";
import { OSError } from "../kernel/errors.js";

export interface TaskSubmitRequest {
	text: string;
	route?: string;
	model?: string;
	maxSteps?: number;
	timeoutMs?: number;
	budget?: number;
	stopCondition?: string;
}

export interface TaskSubmitResponse {
	result: string;
	terminatedBy: "stop_condition" | "max_steps" | "timeout" | "budget";
	steps: number;
	usedRoute: string;
	summary: string;
}

export interface TaskLoopRequest {
	route: string;
	taskGoal: string;
	model?: string;
	maxSteps?: number;
	timeoutMs?: number;
	budget?: number;
	stopCondition?: string;
}

export interface TaskLoopResponse {
	result: string;
	terminatedBy: "stop_condition" | "max_steps" | "timeout" | "budget";
	steps: number;
	usedRoute: string;
}

export interface TaskDecomposeRequest {
	text: string;
	maxParts?: number;
}

export interface TaskDecomposeResponse {
	tasks: string[];
}

function resolveDefaultRoute(appManager: AppManager): string {
	const app = appManager.registry.list()[0];
	if (!app) {
		throw new OSError("E_APP_NOT_REGISTERED", "No installed app");
	}
	const page = app.entry.pages.find((item) => item.default) ?? app.entry.pages[0];
	if (!page) {
		throw new OSError("E_VALIDATION_FAILED", `No page entry for app ${app.id}`);
	}
	return page.route;
}

export function createTaskSubmitService(
	appManager: AppManager,
	pageRenderer: AppPageRenderer,
	modelService: ModelService,
): OSService<TaskSubmitRequest, TaskSubmitResponse> {
	const loopService = createTaskLoopService(appManager, pageRenderer, modelService);
	const decomposeService = createTaskDecomposeService();
	return {
		name: "task.submit",
		requiredPermissions: ["app:read", "model:invoke"],
		execute: async (req, ctx) => {
			const route = req.route ?? resolveDefaultRoute(appManager);
			const decomposed = await decomposeService.execute({ text: req.text }, ctx);
			const taskGoal = decomposed.tasks.join("\n- ");
			const loop = await loopService.execute(
				{
					route,
					taskGoal,
					model: req.model,
					maxSteps: req.maxSteps,
					timeoutMs: req.timeoutMs,
					budget: req.budget,
					stopCondition: req.stopCondition,
				},
				ctx,
			);
			return {
				result: loop.result,
				terminatedBy: loop.terminatedBy,
				steps: loop.steps,
				usedRoute: route,
				summary: `task.submit finished by ${loop.terminatedBy} in ${loop.steps} step(s)`,
			};
		},
	};
}

export function createTaskDecomposeService(): OSService<TaskDecomposeRequest, TaskDecomposeResponse> {
	return {
		name: "task.decompose",
		requiredPermissions: ["app:read"],
		execute: async (req) => {
			const maxParts = req.maxParts && req.maxParts > 0 ? req.maxParts : 8;
			const tasks = req.text
				.split(/\n|;|；|,|，| and | then | 然后 | 并且 /gi)
				.map((item) => item.trim())
				.filter((item) => item.length > 0)
				.slice(0, maxParts);
			return {
				tasks: tasks.length > 0 ? tasks : [req.text.trim()],
			};
		},
	};
}

export function createTaskLoopService(
	appManager: AppManager,
	pageRenderer: AppPageRenderer,
	modelService: ModelService,
): OSService<TaskLoopRequest, TaskLoopResponse> {
	return {
		name: "task.loop",
		requiredPermissions: ["app:read", "model:invoke"],
		execute: async (req, ctx) => {
			const startedAt = Date.now();
			const maxSteps = req.maxSteps && req.maxSteps > 0 ? req.maxSteps : 3;
			const timeoutMs = req.timeoutMs && req.timeoutMs > 0 ? req.timeoutMs : 30_000;
			const budget = req.budget && req.budget > 0 ? req.budget : 20_000;
			const stopCondition = req.stopCondition ?? "DONE";
			const model = req.model ?? "echo";
			const resolved = appManager.routes.resolve(req.route);
			const rendered = await pageRenderer.render({
				appId: resolved.appId,
				page: resolved.page,
				context: {
					appId: ctx.appId,
					sessionId: ctx.sessionId,
					permissions: ctx.permissions,
					workingDirectory: ctx.workingDirectory,
				},
			});
			let steps = 0;
			let spent = 0;
			let result = "";
			let terminatedBy: TaskLoopResponse["terminatedBy"] = "max_steps";
			while (steps < maxSteps) {
				if (Date.now() - startedAt > timeoutMs) {
					terminatedBy = "timeout";
					break;
				}
				const prompt = `${rendered.prompt}\n\nTask Goal:\n${req.taskGoal}\n\nStep:${steps + 1}\nTools:${rendered.tools
					.map((tool) => tool.name)
					.join(",")}`;
				if (spent + prompt.length > budget) {
					terminatedBy = "budget";
					break;
				}
				const generated = await modelService.generate({
					model,
					prompt,
				});
				result = generated.output;
				spent += prompt.length + result.length;
				steps += 1;
				if (result.includes(stopCondition)) {
					terminatedBy = "stop_condition";
					break;
				}
			}
			return {
				result,
				terminatedBy,
				steps,
				usedRoute: req.route,
			};
		},
	};
}
