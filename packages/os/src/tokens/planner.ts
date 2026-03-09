import type {
    PlannerComposeToolsRequest,
    PlannerComposeToolsResponse,
    PlannerSelectAppsRequest,
    PlannerSelectAppsResponse,
    RunnerExecutePlanRequest,
    RunnerExecutePlanResponse,
} from "../planner/index.js";
import { token } from "./shared.js";

// Planner Tokens
export const PLANNER_SELECT_APPS = token<PlannerSelectAppsRequest, PlannerSelectAppsResponse, "planner.selectApps">("planner.selectApps");

export const PLANNER_COMPOSE_TOOLS = token<PlannerComposeToolsRequest, PlannerComposeToolsResponse, "planner.composeTools">(
    "planner.composeTools",
);

export const RUNNER_EXECUTE_PLAN = token<RunnerExecutePlanRequest, RunnerExecutePlanResponse, "runner.executePlan">("runner.executePlan");
