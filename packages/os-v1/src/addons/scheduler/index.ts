import type { Application } from "../../tokens.js";
import { WorkflowRunner } from "./services/schedule.service.js";

export default {
    name: "scheduler",
    description: "Dependency workflow scheduler. Manages DAG tasks with multi-dependency gates, parallel fan-out, dynamic re-planning, and failure compensation. Use this when users ask about task orchestration and dependency execution state.",
    version: "1.0.0",
    pages: [

    ],
    providers: [
        { provide: WorkflowRunner, useFactory: () => new WorkflowRunner() },
    ],
} as Application
