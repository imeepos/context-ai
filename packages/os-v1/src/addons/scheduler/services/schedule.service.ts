import { createFeatureInjector, InjectionToken, Injector, Injectable } from "@context-ai/core";
import { ACTION_EXECUTER, SESSION_ID, SESSION_LOGGER } from "../../../tokens.js";
import { SessionLogger } from "../../../core/session-logger.js";
import type { Task, Edge, WorkflowDefinition } from "../types.js";
import type { Workflow as WorkflowEntity } from "../entities/workflow.entity.js";

/**
 * 当前任务 Token
 */
export const CURRENT_TASK = new InjectionToken<Task>('CURRENT_TASK');

/**
 * 上一个任务 Token
 */
export const PREV_TASK = new InjectionToken<Task[]>('PREV_TASK');

/**
 * 下一个任务 Token
 */
export const NEXT_TASK = new InjectionToken<Task[]>('NEXT_TASK');

/**
 * 工作流 Token
 */
export const CURRENT_WORKFLOW = new InjectionToken<WorkflowDefinition>('CURRENT_WORKFLOW');

/**
 * 工作流执行器
 *
 * 负责执行工作流中的任务
 */
@Injectable()
export class WorkflowRunner {
    /**
     * 执行整个工作流（基于 DAG）
     *
     * @param workflow - 工作流定义
     * @param injector - 依赖注入器
     */
    async run(workflow: WorkflowDefinition, injector: Injector): Promise<void> {
        // 找到没有前驱的根任务
        const rootTasks = workflow.tasks.filter(t =>
            workflow.edges.every(e => e.to !== t.id)
        );

        // 递归执行
        for (const task of rootTasks) {
            await this.runTask(task, workflow, injector);
        }
    }

    /**
     * 执行单个任务（公共方法，供 RollingPlannerService 调用）
     *
     * @param task - 要执行的任务
     * @param workflow - 工作流实体（或定义）
     * @param injector - 依赖注入器
     * @returns 任务执行结果
     */
    async executeTask(task: Task, workflow: WorkflowEntity | WorkflowDefinition, injector: Injector): Promise<any> {
        // 创建任务执行的子 Injector
        const workflowDef = this.toWorkflowDefinition(workflow);
        const childInjector = createSchedulerInjector(task.id, workflowDef, injector);
        const actionExecuter = childInjector.get(ACTION_EXECUTER);

        // 执行 Action
        const result = await actionExecuter.execute(task.token, task.params, childInjector);

        return result;
    }

    /**
     * 递归执行任务（私有方法，用于 DAG 遍历）
     */
    private async runTask(task: Task, workflow: WorkflowDefinition, injector: Injector): Promise<void> {
        // 跳过已完成、已取消、已失败的任务
        if (task.status === "completed" || task.status === "cancelled" || task.status === "failed") {
            return;
        }

        // 执行任务
        try {
            task.status = "running";
            const result = await this.executeTask(task, workflow, injector);
            task.result = result;
            task.status = "completed";
        } catch (error) {
            task.status = "failed";
            task.error = error instanceof Error ? error.message : String(error);
            throw error;
        }

        // 检查并执行后继任务
        const nextEdges = workflow.edges.filter(e => e.from === task.id);
        for (const edge of nextEdges) {
            const nextTask = workflow.tasks.find(t => t.id === edge.to);
            if (nextTask) {
                await this.runTask(nextTask, workflow, injector);
            }
        }
    }

    /**
     * 将 WorkflowEntity 转换为 WorkflowDefinition
     */
    private toWorkflowDefinition(workflow: WorkflowEntity | WorkflowDefinition): WorkflowDefinition {
        if ('createAt' in workflow) {
            // 是 WorkflowEntity
            if (!workflow.id || !workflow.name) {
                throw new Error('WorkflowEntity must have id and name');
            }
            return {
                id: workflow.id,
                name: workflow.name,
                description: workflow.description || '',
                tasks: (workflow.tasks as Task[]) || [],
                edges: (workflow.edges as Edge[]) || []
            };
        }
        // 已经是 WorkflowDefinition
        return workflow as WorkflowDefinition;
    }

    // 占位方法（暂时不实现）
    async save(_workflow: WorkflowDefinition): Promise<void> {
        // TODO: 实现持久化逻辑
    }

    async load(): Promise<WorkflowDefinition[]> {
        // TODO: 实现加载逻辑
        return [];
    }
}

/**
 * 创建任务执行时的 Injector
 *
 * 提供任务执行所需的上下文（当前任务、前后任务、工作流）
 *
 * @param currentTaskId - 当前任务 ID
 * @param workflow - 工作流定义
 * @param parent - 父级 Injector
 * @returns 子 Injector
 */
export function createSchedulerInjector(currentTaskId: string, workflow: WorkflowDefinition, parent: Injector): Injector {
    const currentTask = workflow.tasks.find(t => t.id === currentTaskId);

    return createFeatureInjector([
        { provide: CURRENT_TASK, useValue: currentTask },
        { provide: CURRENT_WORKFLOW, useValue: workflow },
        {
            provide: PREV_TASK,
            useFactory: () => {
                if (!currentTask) return [];
                const prevEdges = workflow.edges.filter(e => e.to === currentTask.id);
                return prevEdges
                    .map(edge => workflow.tasks.find(t => t.id === edge.from))
                    .filter((t): t is Task => t !== undefined);
            }
        },
        {
            provide: NEXT_TASK,
            useFactory: () => {
                if (!currentTask) return [];
                const nextEdges = workflow.edges.filter(e => e.from === currentTask.id);
                return nextEdges
                    .map(edge => workflow.tasks.find(t => t.id === edge.to))
                    .filter((t): t is Task => t !== undefined);
            }
        },
        {
            provide: SESSION_ID, useValue: workflow.id
        },
        { provide: SESSION_LOGGER, useClass: SessionLogger }
    ], parent);
}
