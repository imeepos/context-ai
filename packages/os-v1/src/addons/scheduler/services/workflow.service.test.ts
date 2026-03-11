import "reflect-metadata";
import { describe, expect, it } from "vitest";
import type { DataSource } from "typeorm";
import { Workflow as WorkflowEntity } from "../entities/workflow.entity.js";
import { WorkflowService, type WorkflowPatch } from "./workflow.service.js";

interface TaskNode {
    id: string;
    name: string;
    description: string;
    status: "pending" | "running" | "completed" | "cancelled" | "failed";
    token: string;
    params: Record<string, unknown>;
}

interface EdgeNode {
    from: string;
    to: string;
}

function createService() {
    const store: WorkflowEntity[] = [];

    const repository = {
        create(input: Partial<WorkflowEntity>) {
            return {
                id: input.id ?? `wf-${store.length + 1}`,
                name: input.name ?? "",
                description: input.description ?? "",
                tasks: input.tasks ?? [],
                edges: input.edges ?? [],
            } as WorkflowEntity;
        },
        async save(entity: WorkflowEntity) {
            const index = store.findIndex((item) => item.id === entity.id);
            if (index >= 0) {
                store[index] = { ...entity };
            } else {
                store.push({ ...entity });
            }
            return { ...entity };
        },
        async find() {
            return store.map((item) => ({ ...item }));
        },
        async findOne(options: { where: { id: string } }) {
            const found = store.find((item) => item.id === options.where.id);
            return found ? { ...found } : null;
        },
        async remove(entity: WorkflowEntity) {
            const index = store.findIndex((item) => item.id === entity.id);
            if (index >= 0) {
                store.splice(index, 1);
            }
            return entity;
        },
    };

    const dataSource = {
        getRepository: () => repository,
    } as unknown as DataSource;

    const service = new WorkflowService(dataSource);
    return { service, store };
}

describe("WorkflowService", () => {
    it("应该支持工作流 CRUD", async () => {
        const { service } = createService();
        const created = await service.createWorkflow({
            name: "novel",
            description: "write novel",
            tasks: [],
            edges: [],
        });

        expect(created.id).toBeDefined();
        expect((await service.listWorkflows())).toHaveLength(1);

        const got = await service.getWorkflowOrThrow(created.id!);
        expect(got.name).toBe("novel");

        const updated = await service.updateWorkflow(created.id!, {
            name: "novel-v2",
            description: "rewrite novel",
        });
        expect(updated.name).toBe("novel-v2");
        expect(updated.description).toBe("rewrite novel");

        const removed = await service.deleteWorkflow(created.id!);
        expect(removed).toBe(true);
        expect((await service.listWorkflows())).toHaveLength(0);
    });

    it("应该支持 add_task / update_task / remove_task", async () => {
        const { service } = createService();
        const created = await service.createWorkflow({
            name: "wf",
            tasks: [],
            edges: [],
        });

        const addPatch: WorkflowPatch = {
            op: "add_task",
            payload: {
                id: "t1",
                name: "task-1",
                status: "pending",
                token: "task.run",
                params: {},
            },
            reason: "add",
        };
        await service.applyPatch(created.id!, addPatch);

        const updatePatch: WorkflowPatch = {
            op: "update_task",
            targetId: "t1",
            payload: {
                name: "task-1-v2",
                status: "running",
            },
            reason: "update",
        };
        await service.applyPatch(created.id!, updatePatch);

        const removePatch: WorkflowPatch = {
            op: "remove_task",
            targetId: "t1",
            payload: {},
            reason: "remove",
        };
        await service.applyPatch(created.id!, removePatch);

        const latest = await service.getWorkflowOrThrow(created.id!);
        expect(latest.tasks).toHaveLength(0);
        expect(latest.edges).toHaveLength(0);
    });

    it("应该支持 add_edge / remove_edge", async () => {
        const { service } = createService();
        const tasks: TaskNode[] = [
            { id: "t1", name: "a", description: "Task a", status: "pending", token: "x", params: {} },
            { id: "t2", name: "b", description: "Task b", status: "pending", token: "x", params: {} },
        ];
        const created = await service.createWorkflow({
            name: "wf",
            tasks,
            edges: [],
        });

        await service.applyPatch(created.id!, {
            op: "add_edge",
            payload: { from: "t1", to: "t2" },
            reason: "link",
        });

        let latest = await service.getWorkflowOrThrow(created.id!);
        expect(latest.edges).toEqual([{ from: "t1", to: "t2" }]);

        await service.applyPatch(created.id!, {
            op: "remove_edge",
            payload: { from: "t1", to: "t2" },
            reason: "unlink",
        });

        latest = await service.getWorkflowOrThrow(created.id!);
        expect(latest.edges).toEqual([]);
    });

    it("应该支持 reorder", async () => {
        const { service } = createService();
        const tasks: TaskNode[] = [
            { id: "t1", name: "a", description: "Task a", status: "pending", token: "x", params: {} },
            { id: "t2", name: "b", description: "Task b", status: "pending", token: "x", params: {} },
            { id: "t3", name: "c", description: "Task c", status: "pending", token: "x", params: {} },
        ];
        const created = await service.createWorkflow({
            name: "wf",
            tasks,
            edges: [],
        });

        await service.applyPatch(created.id!, {
            op: "reorder",
            payload: { taskIds: ["t3", "t1"] },
            reason: "reorder",
        });

        const latest = await service.getWorkflowOrThrow(created.id!);
        expect((latest.tasks as TaskNode[]).map((item) => item.id)).toEqual(["t3", "t1", "t2"]);
    });

    it("任务不存在时应抛错", async () => {
        const { service } = createService();
        const created = await service.createWorkflow({
            name: "wf",
            tasks: [],
            edges: [],
        });

        await expect(
            service.applyPatch(created.id!, {
                op: "update_task",
                targetId: "missing",
                payload: { name: "x" },
                reason: "fail",
            }),
        ).rejects.toThrow("Task not found: missing");
    });

    it("应支持批量 patch", async () => {
        const { service } = createService();
        const created = await service.createWorkflow({
            name: "wf",
            tasks: [],
            edges: [],
        });

        const patches: WorkflowPatch[] = [
            {
                op: "add_task",
                payload: { id: "t1", name: "a", status: "pending", token: "x", params: {} },
                reason: "1",
            },
            {
                op: "add_task",
                payload: { id: "t2", name: "b", status: "pending", token: "x", params: {} },
                reason: "2",
            },
            { op: "add_edge", payload: { from: "t1", to: "t2" }, reason: "3" },
        ];

        const latest = await service.applyPatches(created.id!, patches);
        expect((latest.tasks as TaskNode[]).map((item) => item.id)).toEqual(["t1", "t2"]);
        expect(latest.edges as EdgeNode[]).toEqual([{ from: "t1", to: "t2" }]);
    });
});
