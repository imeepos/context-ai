import type { AppManager, AppPageRenderer } from "../app-manager/index.js";
import type { ModelService } from "../model-service/index.js";
import type { OSService } from "../types/os.js";

export interface PlannerSelectAppsRequest {
	text: string;
	limit?: number;
}

export interface PlannerSelectAppsResponse {
	selected: Array<{
		appId: string;
		score: number;
		routes: string[];
		reason: string;
	}>;
}

export interface PlannerComposeToolsRequest {
	routes: string[];
}

export interface PlannerComposeToolsResponse {
	composed: Array<{
		route: string;
		appId: string;
		prompt: string;
		tools: Array<{ name: string; description?: string; parameters?: unknown }>;
	}>;
	toolCount: number;
}

export interface RunnerExecutePlanRequest {
	text: string;
	routes: string[];
	model?: string;
	maxSteps?: number;
	stopCondition?: string;
	maxRetries?: number;
	fallbackRoute?: string;
	risk?: {
		level: "low" | "medium" | "high";
		approved?: boolean;
		approver?: string;
		approvalExpiresAt?: string;
	};
}

export interface RunnerExecutePlanResponse {
	terminatedBy: "stop_condition" | "max_steps";
	steps: number;
	results: Array<{
		route: string;
		output: string;
		recovered?: boolean;
	}>;
	failures: Array<{
		route: string;
		error: string;
		retried: number;
	}>;
	summary: string;
}

function scoreApp(text: string, app: ReturnType<AppManager["registry"]["list"]>[number]): { score: number; reason: string } {
	const lowerText = text.toLowerCase();
	let score = 0;
	const hits: string[] = [];
	if (lowerText.includes(app.id.toLowerCase())) {
		score += 3;
		hits.push("app id match");
	}
	if (lowerText.includes(app.name.toLowerCase())) {
		score += 2;
		hits.push("app name match");
	}
	for (const page of app.entry.pages) {
		if (lowerText.includes(page.id.toLowerCase()) || lowerText.includes(page.name.toLowerCase())) {
			score += 2;
			hits.push(`page match:${page.id}`);
		}
		for (const tag of page.tags ?? []) {
			if (lowerText.includes(tag.toLowerCase())) {
				score += 1;
				hits.push(`tag match:${tag}`);
			}
		}
	}
	return { score, reason: hits.length > 0 ? hits.join(", ") : "fallback ranking" };
}

export function createPlannerSelectAppsService(
	appManager: AppManager,
): OSService<PlannerSelectAppsRequest, PlannerSelectAppsResponse> {
	return {
		name: "planner.selectApps",
		requiredPermissions: ["app:read"],
		execute: async (req) => {
			const limit = req.limit && req.limit > 0 ? req.limit : 3;
			const ranked = appManager.registry
				.list()
				.map((app) => {
					const scored = scoreApp(req.text, app);
					return {
						appId: app.id,
						score: scored.score,
						routes: app.entry.pages.map((item) => item.route),
						reason: scored.reason,
					};
				})
				.sort((a, b) => b.score - a.score || a.appId.localeCompare(b.appId))
				.slice(0, limit);
			return {
				selected: ranked,
			};
		},
	};
}

export function createPlannerComposeToolsService(
	appManager: AppManager,
	pageRenderer: AppPageRenderer,
): OSService<PlannerComposeToolsRequest, PlannerComposeToolsResponse> {
	return {
		name: "planner.composeTools",
		requiredPermissions: ["app:read"],
		execute: async (req, ctx) => {
			const composed: PlannerComposeToolsResponse["composed"] = [];
			let toolCount = 0;
			for (const route of req.routes) {
				const resolved = appManager.routes.resolve(route);
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
				toolCount += rendered.tools.length;
				composed.push({
					route,
					appId: resolved.appId,
					prompt: rendered.prompt,
					tools: rendered.tools,
				});
			}
			return { composed, toolCount };
		},
	};
}

export function createRunnerExecutePlanService(
	appManager: AppManager,
	pageRenderer: AppPageRenderer,
	modelService: ModelService,
): OSService<RunnerExecutePlanRequest, RunnerExecutePlanResponse> {
	return {
		name: "runner.executePlan",
		requiredPermissions: ["app:read", "model:invoke"],
		execute: async (req, ctx) => {
			if (req.risk && req.risk.level !== "low") {
				if (!req.risk.approved || !req.risk.approver?.trim()) {
					throw new Error("E_POLICY_DENIED: execution approval required");
				}
				if (req.risk.level === "high") {
					const expiresAt = req.risk.approvalExpiresAt ? Date.parse(req.risk.approvalExpiresAt) : Number.NaN;
					if (Number.isNaN(expiresAt) || expiresAt <= Date.now()) {
						throw new Error("E_POLICY_DENIED: execution approval expired");
					}
				}
			}
			const maxSteps = req.maxSteps && req.maxSteps > 0 ? req.maxSteps : req.routes.length;
			const stopCondition = req.stopCondition ?? "DONE";
			const model = req.model ?? "echo";
			const maxRetries = req.maxRetries && req.maxRetries > 0 ? req.maxRetries : 0;
			const results: RunnerExecutePlanResponse["results"] = [];
			const failures: RunnerExecutePlanResponse["failures"] = [];
			let steps = 0;
			let terminatedBy: RunnerExecutePlanResponse["terminatedBy"] = "max_steps";
			for (const route of req.routes) {
				if (steps >= maxSteps) {
					terminatedBy = "max_steps";
					break;
				}
				let retried = 0;
				let output: string | undefined;
				while (retried <= maxRetries) {
					try {
						const resolved = appManager.routes.resolve(route);
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
						const prompt = `${rendered.prompt}\n\nTask Goal:\n${req.text}\nRoute:${route}\nTools:${rendered.tools
							.map((tool) => tool.name)
							.join(",")}`;
						const generated = await modelService.generate({
							model,
							prompt,
						});
						output = generated.output;
						break;
					} catch (error) {
						retried += 1;
						if (retried > maxRetries) {
							const message = error instanceof Error ? error.message : String(error);
							failures.push({
								route,
								error: message,
								retried: maxRetries,
							});
							if (req.fallbackRoute) {
								const fallbackResolved = appManager.routes.resolve(req.fallbackRoute);
								const fallbackRendered = await pageRenderer.render({
									appId: fallbackResolved.appId,
									page: fallbackResolved.page,
									context: {
										appId: ctx.appId,
										sessionId: ctx.sessionId,
										permissions: ctx.permissions,
										workingDirectory: ctx.workingDirectory,
									},
								});
								const fallbackPrompt = `${fallbackRendered.prompt}\n\nTask Goal:\n${req.text}\nRoute:${req.fallbackRoute}\nTools:${fallbackRendered.tools
									.map((tool) => tool.name)
									.join(",")}`;
								const fallback = await modelService.generate({
									model,
									prompt: fallbackPrompt,
								});
								results.push({
									route: req.fallbackRoute,
									output: fallback.output,
									recovered: true,
								});
							}
						}
					}
				}
				if (output !== undefined) {
					results.push({ route, output });
				}
				steps += 1;
				const latest = results.at(-1)?.output;
				if (latest && latest.includes(stopCondition)) {
					terminatedBy = "stop_condition";
					break;
				}
			}
			return {
				terminatedBy,
				steps,
				results,
				failures,
				summary: `runner.executePlan finished by ${terminatedBy} in ${steps} step(s)`,
			};
		},
	};
}
