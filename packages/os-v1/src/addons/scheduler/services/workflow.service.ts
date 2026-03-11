import { Inject, Injectable } from "@context-ai/core";
import { DataSource } from "typeorm";
import { Workflow as WorkflowEntity } from "../entities/workflow.entity.js";

export interface WorkflowTaskNode {
    id: string;
}

export interface WorkflowEdgeNode {
    from: string;
    to: string;
}

export interface CreateWorkflowInput {
    id?: string;
    name: string;
    description?: string;
    tasks?: WorkflowTaskNode[];
    edges?: WorkflowEdgeNode[];
}

export interface UpdateWorkflowInput {
    name?: string;
    description?: string;
    tasks?: WorkflowTaskNode[];
    edges?: WorkflowEdgeNode[];
}

export interface WorkflowPatch {
    op: "add_task" | "update_task" | "remove_task" | "add_edge" | "remove_edge" | "reorder";
    targetId?: string;
    payload: Record<string, unknown>;
    reason: string;
}

@Injectable()
export class WorkflowService {
    constructor(@Inject(DataSource) private readonly dataSource: DataSource) {}

    async createWorkflow(input: CreateWorkflowInput): Promise<WorkflowEntity> {
        const repo = this.getRepository();
        const created = repo.create({
            id: input.id,
            name: input.name,
            description: input.description ?? "",
            tasks: input.tasks ?? [],
            edges: input.edges ?? [],
        });
        return repo.save(created);
    }

    async listWorkflows(): Promise<WorkflowEntity[]> {
        return this.getRepository().find();
    }

    async getWorkflow(id: string): Promise<WorkflowEntity | null> {
        return this.getRepository().findOne({ where: { id } });
    }

    async getWorkflowOrThrow(id: string): Promise<WorkflowEntity> {
        const workflow = await this.getWorkflow(id);
        if (!workflow) {
            throw new Error(`Workflow not found: ${id}`);
        }
        return workflow;
    }

    async updateWorkflow(id: string, input: UpdateWorkflowInput): Promise<WorkflowEntity> {
        const repo = this.getRepository();
        const existing = await this.getWorkflowOrThrow(id);
        const merged = repo.create({
            ...existing,
            ...input,
        });
        return repo.save(merged);
    }

    async deleteWorkflow(id: string): Promise<boolean> {
        const repo = this.getRepository();
        const workflow = await this.getWorkflow(id);
        if (!workflow) {
            return false;
        }
        await repo.remove(workflow);
        return true;
    }

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
        return this.getRepository().save(workflow);
    }

    async applyPatches(id: string, patches: WorkflowPatch[]): Promise<WorkflowEntity> {
        let workflow = await this.getWorkflowOrThrow(id);
        for (const patch of patches) {
            workflow = await this.applyPatch(workflow.id!, patch);
        }
        return workflow;
    }

    private getRepository() {
        return this.dataSource.getRepository(WorkflowEntity);
    }

    private getTasks(workflow: WorkflowEntity): WorkflowTaskNode[] {
        return Array.isArray(workflow.tasks) ? [...(workflow.tasks as WorkflowTaskNode[])] : [];
    }

    private getEdges(workflow: WorkflowEntity): WorkflowEdgeNode[] {
        return Array.isArray(workflow.edges) ? [...(workflow.edges as WorkflowEdgeNode[])] : [];
    }

    private applyAddTask(tasks: WorkflowTaskNode[], payload: Record<string, unknown>): void {
        const id = payload.id;
        if (typeof id !== "string" || !id) {
            throw new Error("add_task payload.id is required");
        }
        if (tasks.some((item) => item.id === id)) {
            throw new Error(`Task already exists: ${id}`);
        }
        const task = { ...payload, id } as WorkflowTaskNode;
        tasks.push(task);
    }

    private applyUpdateTask(
        tasks: WorkflowTaskNode[],
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
        tasks[index] = merged as WorkflowTaskNode;
    }

    private applyRemoveTask(
        tasks: WorkflowTaskNode[],
        edges: WorkflowEdgeNode[],
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
        tasks: WorkflowTaskNode[],
        edges: WorkflowEdgeNode[],
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

    private applyRemoveEdge(edges: WorkflowEdgeNode[], payload: Record<string, unknown>): void {
        const from = payload.from;
        const to = payload.to;
        if (typeof from !== "string" || typeof to !== "string") {
            throw new Error("remove_edge payload.from and payload.to are required");
        }
        const remained = edges.filter((item) => !(item.from === from && item.to === to));
        edges.splice(0, edges.length, ...remained);
    }

    private applyReorder(tasks: WorkflowTaskNode[], payload: Record<string, unknown>): WorkflowTaskNode[] {
        const taskIds = payload.taskIds;
        if (!Array.isArray(taskIds)) {
            throw new Error("reorder payload.taskIds is required");
        }
        const order = taskIds.filter((item): item is string => typeof item === "string");
        if (order.length !== taskIds.length) {
            throw new Error("reorder payload.taskIds must be string[]");
        }
        const taskMap = new Map(tasks.map((task) => [task.id, task]));
        const sorted: WorkflowTaskNode[] = [];

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
