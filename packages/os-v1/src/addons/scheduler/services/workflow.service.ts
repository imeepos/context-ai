import { Inject, Injectable } from "@context-ai/core";
import { DataSource } from "typeorm";
import { Workflow as WorkflowEntity } from "../entities/workflow.entity.js";
import type {
    CreateWorkflowInput,
    UpdateWorkflowInput,
    WorkflowPatch,
    Task,
    Edge,
    WorkflowStats,
    WorkflowStatus
} from "../types.js";

// 重新导出 WorkflowPatch，以便测试文件可以导入
export type { WorkflowPatch };

/**
 * 工作流服务
 *
 * 负责工作流的 CRUD 操作和 Patch 机制
 */
@Injectable()
export class WorkflowService {
    constructor(@Inject(DataSource) private readonly dataSource: DataSource) {}

    // ============================================================================
    // CRUD 操作
    // ============================================================================

    /**
     * 创建工作流
     */
    async createWorkflow(input: CreateWorkflowInput): Promise<WorkflowEntity> {
        const repo = this.getRepository();
        const created = repo.create({
            id: input.id,
            name: input.name,
            description: input.description ?? "",
            tasks: input.tasks ?? [],
            edges: input.edges ?? [],
            windowConfig: input.windowConfig ?? { lookBehind: 1, lookAhead: 3 },
            status: 'pending',
            compressedHistory: [],
            replanHistory: [],
            executionStats: {
                totalTasks: (input.tasks ?? []).length,
                completedTasks: 0,
                failedTasks: 0,
                retriedTasks: 0
            }
        });
        return repo.save(created);
    }

    /**
     * 列出所有工作流
     */
    async listWorkflows(status?: WorkflowStatus): Promise<WorkflowEntity[]> {
        const repo = this.getRepository();
        if (status) {
            return repo.find({ where: { status } });
        }
        return repo.find();
    }

    /**
     * 获取工作流（可能不存在）
     */
    async getWorkflow(id: string): Promise<WorkflowEntity | null> {
        return this.getRepository().findOne({ where: { id } });
    }

    /**
     * 获取工作流（不存在则抛出异常）
     */
    async getWorkflowOrThrow(id: string): Promise<WorkflowEntity> {
        const workflow = await this.getWorkflow(id);
        if (!workflow) {
            throw new Error(`Workflow not found: ${id}`);
        }
        return workflow;
    }

    /**
     * 更新工作流
     */
    async updateWorkflow(id: string, input: UpdateWorkflowInput): Promise<WorkflowEntity> {
        const repo = this.getRepository();
        const existing = await this.getWorkflowOrThrow(id);
        const merged = repo.create({
            ...existing,
            ...input,
        });
        return repo.save(merged);
    }

    /**
     * 删除工作流
     */
    async deleteWorkflow(id: string): Promise<boolean> {
        const repo = this.getRepository();
        const workflow = await this.getWorkflow(id);
        if (!workflow) {
            return false;
        }
        await repo.remove(workflow);
        return true;
    }

    // ============================================================================
    // Patch 操作
    // ============================================================================

    /**
     * 应用单个 Patch
     */
    async applyPatch(id: string, patch: WorkflowPatch): Promise<WorkflowEntity> {
        const workflow = await this.getWorkflowOrThrow(id);
        const tasks = this.getTasks(workflow);
        const edges = this.getEdges(workflow);

        switch (patch.op) {
            case "add_task":
                this.applyAddTask(tasks, patch.payload);
                break;
            case "update_task":
                this.applyUpdateTask(tasks, patch.targetId, patch.payload);
                break;
            case "remove_task":
                this.applyRemoveTask(tasks, edges, patch.targetId);
                break;
            case "add_edge":
                this.applyAddEdge(tasks, edges, patch.payload);
                break;
            case "remove_edge":
                this.applyRemoveEdge(edges, patch.payload);
                break;
            case "reorder":
                workflow.tasks = this.applyReorder(tasks, patch.payload);
                workflow.edges = edges;
                return this.getRepository().save(workflow);
            default:
                this.assertNever(patch.op);
        }

        workflow.tasks = tasks;
        workflow.edges = edges;

        // 更新统计信息
        if (workflow.executionStats) {
            workflow.executionStats.totalTasks = tasks.length;
        }

        return this.getRepository().save(workflow);
    }

    /**
     * 批量应用 Patch
     */
    async applyPatches(id: string, patches: WorkflowPatch[]): Promise<WorkflowEntity> {
        let workflow = await this.getWorkflowOrThrow(id);
        for (const patch of patches) {
            workflow = await this.applyPatch(workflow.id!, patch);
        }
        return workflow;
    }

    // ============================================================================
    // 查询和统计
    // ============================================================================

    /**
     * 获取工作流统计信息
     */
    async getWorkflowStats(id: string): Promise<WorkflowStats> {
        const workflow = await this.getWorkflowOrThrow(id);
        const tasks = this.getTasks(workflow);
        const completedTasks = tasks.filter(t => t.status === 'completed').length;
        const failedTasks = tasks.filter(t => t.status === 'failed').length;
        const totalTasks = tasks.length;
        const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

        return {
            id: workflow.id!,
            name: workflow.name!,
            status: workflow.status!,
            totalTasks,
            completedTasks,
            failedTasks,
            progress,
            currentFocus: workflow.currentFocus,
            createdAt: workflow.createAt,
            lastExecutedAt: workflow.lastExecutedAt
        };
    }

    /**
     * 根据任务 ID 查找任务
     */
    findTaskById(workflow: WorkflowEntity, taskId: string): Task | undefined {
        const tasks = this.getTasks(workflow);
        return tasks.find(t => t.id === taskId);
    }

    /**
     * 查找任务的后继任务（通过边）
     */
    findNextTasks(workflow: WorkflowEntity, taskId: string): Task[] {
        const tasks = this.getTasks(workflow);
        const edges = this.getEdges(workflow);
        const nextEdges = edges.filter(e => e.from === taskId);
        return nextEdges
            .map(edge => tasks.find(t => t.id === edge.to))
            .filter((t): t is Task => t !== undefined);
    }

    /**
     * 查找任务的前驱任务（通过边）
     */
    findPrevTasks(workflow: WorkflowEntity, taskId: string): Task[] {
        const tasks = this.getTasks(workflow);
        const edges = this.getEdges(workflow);
        const prevEdges = edges.filter(e => e.to === taskId);
        return prevEdges
            .map(edge => tasks.find(t => t.id === edge.from))
            .filter((t): t is Task => t !== undefined);
    }

    // ============================================================================
    // Private Helper Methods
    // ============================================================================

    private getRepository() {
        return this.dataSource.getRepository(WorkflowEntity);
    }

    private getTasks(workflow: WorkflowEntity): Task[] {
        return Array.isArray(workflow.tasks) ? [...(workflow.tasks as Task[])] : [];
    }

    private getEdges(workflow: WorkflowEntity): Edge[] {
        return Array.isArray(workflow.edges) ? [...(workflow.edges as Edge[])] : [];
    }

    private applyAddTask(tasks: Task[], payload: Record<string, unknown>): void {
        const id = payload.id;
        if (typeof id !== "string" || !id) {
            throw new Error("add_task payload.id is required");
        }
        if (tasks.some((item) => item.id === id)) {
            throw new Error(`Task already exists: ${id}`);
        }
        const task = { ...payload, id } as Task;
        tasks.push(task);
    }

    private applyUpdateTask(
        tasks: Task[],
        targetId: string | undefined,
        payload: Record<string, unknown>,
    ): void {
        if (!targetId) {
            throw new Error("update_task targetId is required");
        }
        const index = tasks.findIndex((item) => item.id === targetId);
        if (index < 0) {
            throw new Error(`Task not found: ${targetId}`);
        }
        const current = tasks[index];
        if (!current) {
            throw new Error(`Task not found: ${targetId}`);
        }
        const merged = { ...current, ...payload, id: current.id };
        tasks[index] = merged as Task;
    }

    private applyRemoveTask(
        tasks: Task[],
        edges: Edge[],
        targetId: string | undefined,
    ): void {
        if (!targetId) {
            throw new Error("remove_task targetId is required");
        }
        const index = tasks.findIndex((item) => item.id === targetId);
        if (index < 0) {
            throw new Error(`Task not found: ${targetId}`);
        }
        tasks.splice(index, 1);
        const remained = edges.filter((item) => item.from !== targetId && item.to !== targetId);
        edges.splice(0, edges.length, ...remained);
    }

    private applyAddEdge(
        tasks: Task[],
        edges: Edge[],
        payload: Record<string, unknown>,
    ): void {
        const from = payload.from;
        const to = payload.to;
        if (typeof from !== "string" || typeof to !== "string") {
            throw new Error("add_edge payload.from and payload.to are required");
        }
        if (!tasks.some((item) => item.id === from)) {
            throw new Error(`Task not found: ${from}`);
        }
        if (!tasks.some((item) => item.id === to)) {
            throw new Error(`Task not found: ${to}`);
        }
        if (edges.some((item) => item.from === from && item.to === to)) {
            return;
        }
        edges.push({ from, to });
    }

    private applyRemoveEdge(edges: Edge[], payload: Record<string, unknown>): void {
        const from = payload.from;
        const to = payload.to;
        if (typeof from !== "string" || typeof to !== "string") {
            throw new Error("remove_edge payload.from and payload.to are required");
        }
        const remained = edges.filter((item) => !(item.from === from && item.to === to));
        edges.splice(0, edges.length, ...remained);
    }

    private applyReorder(tasks: Task[], payload: Record<string, unknown>): Task[] {
        const taskIds = payload.taskIds;
        if (!Array.isArray(taskIds)) {
            throw new Error("reorder payload.taskIds is required");
        }
        const order = taskIds.filter((item): item is string => typeof item === "string");
        if (order.length !== taskIds.length) {
            throw new Error("reorder payload.taskIds must be string[]");
        }
        const taskMap = new Map(tasks.map((task) => [task.id, task]));
        const sorted: Task[] = [];

        for (const taskId of order) {
            const task = taskMap.get(taskId);
            if (!task) {
                throw new Error(`Task not found: ${taskId}`);
            }
            sorted.push(task);
            taskMap.delete(taskId);
        }

        for (const task of tasks) {
            if (taskMap.has(task.id)) {
                sorted.push(task);
            }
        }

        return sorted;
    }

    private assertNever(value: never): never {
        throw new Error(`Unsupported patch op: ${String(value)}`);
    }
}
