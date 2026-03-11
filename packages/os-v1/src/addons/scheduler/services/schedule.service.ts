import { createFeatureInjector, InjectionToken, Injector } from "@context-ai/core";
import { ACTION_EXECUTER, SESSION_ID, SESSION_LOGGER, type Token } from "../../../tokens.js";
import type { Static, TSchema } from "@mariozechner/pi-ai";
import { SessionLogger } from "../../../core/session-logger.js";
export interface WorkflowPatch {
    op: "add_task" | "update_task" | "remove_task" | "add_edge" | "remove_edge" | "reorder";
    targetId?: string;
    payload: Record<string, unknown>;
    reason: string;
}
export interface Task<TRequest extends TSchema = TSchema, TResponse extends TSchema = TSchema> {
    id: string;
    name: string;
    description: string;
    // 任务状态
    status: "pending" | "running" | "completed" | "cancelled" | "failed";
    // 要执行的action
    token: Token<TRequest, TResponse>;
    // 参数
    params: Static<TRequest>;
    // 结果
    result: Static<TResponse> | undefined;
}
export interface Edge {
    from: string;
    to: string;
}
export interface Workflow {
    id: string;
    name: string;
    description: string;
    tasks: Task[];
    edges: Edge[];
}
/**
 * 当前任务
 */
export const CURRENT_TASK = new InjectionToken<Task>('CURRENT_TASK');
/**
 * 上一个任务
 */
export const PREV_TASK = new InjectionToken<Task[]>('PREV_TASK');
/**
 * 下一个任务
 */
export const NEXT_TASK = new InjectionToken<Task[]>('NEXT_TASK');
/**
 * 工作流
 */
export const CURRENT_WORKFLOW = new InjectionToken<Workflow>('CURRENT_WORKFLOW');

/**
 * 工作流执行器
 */
export class WorkflowRunner {
    async run(workflow: Workflow, injector: Injector): Promise<void> {
        // 找到没有连线的节点
        const rootTasks = workflow.tasks.filter(t => workflow.edges.every(e => e.from !== t.id && e.to !== t.id));
        // 递归执行
        for (const task of rootTasks) {
            workflow = await this.runTask(task, workflow, injector);
        }
        // 递归结束
    }

    private async runTask(task: Task, workflow: Workflow, injector: Injector): Promise<Workflow> {
        if (task.status !== "completed" && task.status !== "cancelled" && task.status !== "failed") {
            const childInjector = createSchedulerInjector(task.id, workflow, injector);
            const actionExecuter = childInjector.get(ACTION_EXECUTER);
            task.status = "running";
            const result = await actionExecuter.execute(task.token, task.params, childInjector);
            task.result = result;
            task.status = "completed";
            workflow.tasks = workflow.tasks.map(t => t.id === task.id ? task : t);
            // 根据当前任务，前一个任务，下一个任务组成的上下文，生成或更新成后续的任务，走一步看一步
        }
        // 检查下一个任务是否满足执行条件
        const nextTasks = workflow.edges.filter(e => e.from === task.id);
        for (const nextTask of nextTasks) {
            const next = workflow.tasks.find(t => t.id === nextTask.to);
            if (next) {
                if (next.status !== "completed" && next.status !== "cancelled" && next.status !== "failed") {
                    workflow = await this.runTask(next, workflow, injector);
                }
            }
        }
        return workflow;
    }

    async save(_workflow: Workflow): Promise<void> {

    }

    async load(): Promise<Workflow[]> {
        return []
    }
}

/**
 * 创建任务执行时的injector
 */
export function createSchedulerInjector(current: string, workflow: Workflow, parent: Injector): Injector {
    return createFeatureInjector([
        { provide: CURRENT_TASK, useValue: workflow.tasks.find(t => t.id === current) },
        { provide: CURRENT_WORKFLOW, useValue: workflow },
        {
            provide: PREV_TASK, useFactory: (current: Task) => {
                const prev = workflow.edges.filter(e => e.to === current.id);
                return prev.map(p => workflow.tasks.find(t => t.id === p.from));
            }, deps: [CURRENT_TASK]
        },
        {
            provide: NEXT_TASK, useFactory: (current: Task) => {
                const next = workflow.edges.filter(e => e.from === current.id);
                return next.map(p => workflow.tasks.find(t => t.id === p.to));
            }, deps: [CURRENT_TASK]
        },
        {
            provide: SESSION_ID, useValue: workflow.id
        },
        { provide: SESSION_LOGGER, useClass: SessionLogger }
    ], parent)
}
