import type { Application } from "../../tokens.js";
import { ExecuteFactory, ExecutePropsSchema } from "./execute.js";
import { HistoryFactory, HistoryPropsSchema } from "./history.js";
import { BugfixFactory, BugfixPropsSchema } from "./bugfix.js";
import { BugReportService } from "./services/bug-report.service.js";
import { BugReport } from "./entities/bug-report.entity.js";
import { ENTITIES } from "../../orm.js";

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
        },
        {
            name: 'coding-bugfix',
            description: 'Bug 报告管理系统。展示所有捕获的错误报告（包括 Action 错误、全局错误、手动报告），支持按状态和严重程度过滤，并提供智能自动修复功能（使用 Claude 或 Codex）。Use when user asks "show bugs", "list errors", "fix bugs", or wants to manage error reports.',
            path: 'coding://bugfix',
            props: BugfixPropsSchema,
            factory: BugfixFactory
        }
    ],
    providers: [
        { provide: BugReportService, useClass: BugReportService },
        { provide: ENTITIES, useValue: BugReport, multi: true }
    ]
} as Application
