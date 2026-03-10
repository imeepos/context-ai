import type { Application } from "../../tokens.js";
import { ExecuteFactory, ExecutePropsSchema } from "./execute.js";
import { HistoryFactory, HistoryPropsSchema } from "./history.js";

export default {
    name: "coding",
    description: "AI-powered coding assistant system. Supports executing coding tasks using Claude or Codex CLI tools, viewing execution history, and managing coding sessions. Use this when users ask about code generation, refactoring, debugging, or want to leverage AI coding assistants.",
    version: "1.0.0",
    pages: [
        {
            name: 'coding-execute',
            description: 'Execute coding tasks using Claude or Codex AI assistants. Supports model selection, permission modes, and various execution options. Use when user asks "write code for", "refactor this", "debug the issue", or wants AI assistance with coding tasks.',
            path: 'coding://execute',
            props: ExecutePropsSchema,
            factory: ExecuteFactory
        },
        {
            name: 'coding-history',
            description: 'Displays execution history of coding tasks with timestamps, models used, and results. Supports filtering by assistant type (claude/codex) and success status. Use when user asks "show coding history", "what tasks did I run", or wants to review past executions.',
            path: 'coding://history',
            props: HistoryPropsSchema,
            factory: HistoryFactory
        }
    ],
    providers: [],
} as Application
