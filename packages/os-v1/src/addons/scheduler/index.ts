import { ENTITIES } from "../../orm.js";
import type { Application } from "../../tokens.js";
import { Workflow } from "./entities/workflow.entity.js";
import { WorkflowService } from "./services/workflow.service.js";
import { RollingPlannerService } from "./services/rolling-planner.service.js";
import { WorkflowRunner } from "./services/schedule.service.js";
import { ListFactory, ListPropsSchema } from "./pages/list.js";
import { DetailFactory, DetailPropsSchema } from "./pages/detail.js";
import { ExecuteFactory, ExecutePropsSchema } from "./pages/execute.js";
import { CreateFactory, CreatePropsSchema } from "./pages/create.js";

export default {
    name: "scheduler",
    description: "滚动规划工作流执行引擎。支持大规模工作流（100+ 任务）的滚动窗口执行，动态重规划，中断恢复。使用滚动窗口模式（1 后顾 + 1 当前 + 3 前瞻 = 5 个任务），避免上下文超限。",
    version: "2.0.0",
    pages: [
        {
            name: 'workflow-list',
            description: '列出所有工作流。支持按状态过滤（pending/running/paused/completed/failed）。用于查看工作流列表、筛选状态、查看统计信息。',
            path: 'workflow://list',
            props: ListPropsSchema,
            factory: ListFactory
        },
        {
            name: 'workflow-create',
            description: '创建新的滚动规划工作流。提供工作流结构说明、示例模板、参数验证。通过 createWorkflow 工具创建工作流（需要提供 name, tasks 等参数）。',
            path: 'workflow://create',
            props: CreatePropsSchema,
            factory: CreateFactory
        },
        {
            name: 'workflow-detail',
            description: '查看工作流详情和滚动窗口。显示当前窗口（5个任务）、压缩历史（最近20个任务摘要）、重规划事件。提供 nextTask（执行下一步）、replan（重规划）、pauseWorkflow（暂停）、resumeWorkflow（恢复）等工具。这是核心页面。',
            path: 'workflow://detail/:workflowId',
            props: DetailPropsSchema,
            factory: DetailFactory
        },
        {
            name: 'workflow-execute',
            description: '自动执行整个工作流。持续执行任务并滑动窗口，直到工作流完成或失败。返回执行结果、错误列表、统计信息。',
            path: 'workflow://execute/:workflowId',
            props: ExecutePropsSchema,
            factory: ExecuteFactory
        }
    ],
    providers: [
        { provide: WorkflowRunner, useFactory: () => new WorkflowRunner() },
        { provide: WorkflowService, useClass: WorkflowService },
        { provide: RollingPlannerService, useClass: RollingPlannerService },
        { provide: ENTITIES, useValue: Workflow, multi: true }
    ],
} as Application
