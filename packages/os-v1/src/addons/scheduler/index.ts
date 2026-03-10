import type { Application } from "../../tokens.js";
import { DetailFactory, DetailPropsSchema } from "./detail.js";
import { ListFactory, ListPropsSchema } from "./list.js";
import { FailuresFactory, FailuresPropsSchema } from "./failures.js";

export default {
    name: "scheduler",
    description: "Scheduled task management system. Supports viewing and managing scheduled tasks in the system, including Cron tasks, interval tasks, and one-time tasks. Use this when users ask about scheduled tasks, want to view task lists, check task details, or manage failed tasks.",
    version: "1.0.0",
    pages: [
        {
            name: 'scheduler-list',
            description: 'Displays all active tasks in a table format. Supports filtering by task type (once/interval/cron). Includes tools to create new tasks and cancel existing ones. Use when user asks "show me scheduled tasks", "what tasks are running", or wants to manage tasks.',
            path: 'scheduler://list',
            props: ListPropsSchema,
            factory: ListFactory
        },
        {
            name: 'scheduler-detail',
            description: 'Shows detailed information about a specific task including type, topic, payload, schedule configuration, and execution times. The taskId parameter is required. Use when user wants to know more about a particular scheduled task.',
            path: 'scheduler://detail/:taskId',
            props: DetailPropsSchema,
            factory: DetailFactory
        },
        {
            name: 'scheduler-failures',
            description: 'Displays failed task records with error information and timestamps. Includes tools to replay failed tasks or clear failure records. Use when user asks about task failures or wants to retry failed operations.',
            path: 'scheduler://failures',
            props: FailuresPropsSchema,
            factory: FailuresFactory
        }
    ],
    providers: [],
} as Application
