import {
	PlannerComposeToolsOSService,
	PlannerSelectAppsOSService,
	RunnerExecutePlanOSService,
} from "../../planner/index.js";
import {
	TaskDecomposeOSService,
	TaskLoopOSService,
	TaskSubmitOSService,
} from "../../task-runtime/index.js";
import {
	PLANNER_COMPOSE_TOOLS,
	PLANNER_SELECT_APPS,
	RUNNER_EXECUTE_PLAN,
	TASK_DECOMPOSE,
	TASK_LOOP,
	TASK_SUBMIT,
} from "../../tokens.js";
import { OS_APP_MANAGER, OS_APP_PAGE_RENDERER, OS_MODEL, OS_SYSTEM_RUNTIME } from "../tokens.js";
import { defineInjectableOSService } from "./definition.js";

export const WORKFLOW_SERVICE_DEFINITIONS = [
	defineInjectableOSService(TASK_SUBMIT, TaskSubmitOSService, [OS_APP_MANAGER, OS_APP_PAGE_RENDERER, OS_MODEL, OS_SYSTEM_RUNTIME] as const),
	defineInjectableOSService(TASK_DECOMPOSE, TaskDecomposeOSService, [] as const),
	defineInjectableOSService(TASK_LOOP, TaskLoopOSService, [OS_APP_MANAGER, OS_APP_PAGE_RENDERER, OS_MODEL, OS_SYSTEM_RUNTIME] as const),
	defineInjectableOSService(PLANNER_SELECT_APPS, PlannerSelectAppsOSService, [OS_APP_MANAGER] as const),
	defineInjectableOSService(PLANNER_COMPOSE_TOOLS, PlannerComposeToolsOSService, [OS_APP_MANAGER, OS_APP_PAGE_RENDERER] as const),
	defineInjectableOSService(RUNNER_EXECUTE_PLAN, RunnerExecutePlanOSService, [OS_APP_MANAGER, OS_APP_PAGE_RENDERER, OS_MODEL] as const),
] as const;
