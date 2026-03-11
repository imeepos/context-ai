import { Inject, Injectable } from "@context-ai/core";
import { WorkflowService } from "./workflow.service.js";
import { WorkflowRunner } from "./schedule.service.js";
import type { Injector } from "@context-ai/core";
import type {
    RollingWindowView,
    Task,
    TaskSummary,
    WorkflowPatch,
    TaskExecutionResult,
    WorkflowExecutionResult,
    WindowStats
} from "../types.js";
import type { Workflow as WorkflowEntity } from "../entities/workflow.entity.js";

/**
 * 滚动规划服务
 *
 * 核心职责：
 * 1. 管理滚动窗口（计算当前窗口、滑动窗口）
 * 2. 执行任务并更新状态
 * 3. 压缩历史记录
 * 4. 触发重规划
 * 5. 自动执行整个工作流
 */
@Injectable()
export class RollingPlannerService {
    constructor(
        @Inject(WorkflowService) private readonly workflowService: WorkflowService,
        @Inject(WorkflowRunner) private readonly workflowRunner: WorkflowRunner
    ) {}

    // ============================================================================
    // 滚动窗口管理
    // ============================================================================

    /**
     * 获取滚动窗口视图
     *
     * @param workflowId - 工作流 ID
     * @returns 滚动窗口视图（后顾、当前、前瞻、压缩历史）
     */
    async getWindow(workflowId: string): Promise<RollingWindowView> {
        const workflow = await this.workflowService.getWorkflowOrThrow(workflowId);
        const tasks = this.getTasks(workflow);

        // 如果没有任务，返回空窗口
        if (tasks.length === 0) {
            throw new Error('Workflow has no tasks');
        }

        // 确定当前聚焦任务
        const currentFocus = workflow.currentFocus || tasks[0]?.id;
        if (!currentFocus) {
            throw new Error('Cannot determine current focus task');
        }

        const windowConfig = workflow.windowConfig || { lookBehind: 1, lookAhead: 3 };
        const currentIndex = tasks.findIndex(t => t.id === currentFocus);

        if (currentIndex === -1) {
            throw new Error(`Current focus task not found: ${currentFocus}`);
        }

        // 计算窗口范围
        const lookBehindStart = Math.max(0, currentIndex - windowConfig.lookBehind);
        const lookBehindEnd = currentIndex;
        const lookAheadStart = currentIndex + 1;
        const lookAheadEnd = Math.min(tasks.length, currentIndex + 1 + windowConfig.lookAhead);

        const lookBehind = tasks.slice(lookBehindStart, lookBehindEnd);
        const current = tasks[currentIndex]!;
        const lookAhead = tasks.slice(lookAheadStart, lookAheadEnd);

        return {
            lookBehind,
            current,
            lookAhead,
            compressedHistory: workflow.compressedHistory || []
        };
    }

    /**
     * 获取窗口统计信息
     */
    async getWindowStats(workflowId: string): Promise<WindowStats> {
        const window = await this.getWindow(workflowId);
        return {
            lookBehindCount: window.lookBehind.length,
            lookAheadCount: window.lookAhead.length,
            compressedHistoryCount: window.compressedHistory.length,
            totalWindowSize: window.lookBehind.length + 1 + window.lookAhead.length
        };
    }

    // ============================================================================
    // 任务执行和窗口滑动
    // ============================================================================

    /**
     * 执行当前任务并滑动窗口
     *
     * 工作流程：
     * 1. 执行当前任务
     * 2. 更新任务状态
     * 3. 如果成功，压缩到历史并滑动窗口
     * 4. 如果失败，暂停工作流
     * 5. 保存到数据库
     *
     * @param workflowId - 工作流 ID
     * @param injector - 依赖注入器
     */
    async executeAndSlide(workflowId: string, injector: Injector): Promise<void> {
        const workflow = await this.workflowService.getWorkflowOrThrow(workflowId);
        const window = await this.getWindow(workflowId);
        const currentTask = window.current;

        // 检查当前任务状态
        if (currentTask.status === 'completed') {
            throw new Error('Current task is already completed, call slideWindow() instead');
        }

        if (currentTask.status === 'running') {
            throw new Error('Current task is already running');
        }

        // 标记工作流为运行中
        if (workflow.status === 'pending') {
            workflow.status = 'running';
            workflow.startedAt = new Date();
        }

        // 执行任务
        const taskResult = await this.executeTask(currentTask, workflow, injector);

        // 更新任务状态
        currentTask.status = taskResult.success ? 'completed' : 'failed';
        currentTask.result = taskResult.result;
        currentTask.error = taskResult.error;
        currentTask.completedAt = new Date();

        // 更新工作流中的任务
        const tasks = this.getTasks(workflow);
        const taskIndex = tasks.findIndex(t => t.id === currentTask.id);
        if (taskIndex !== -1) {
            tasks[taskIndex] = currentTask;
            workflow.tasks = tasks;
        }

        // 更新最后执行时间
        workflow.lastExecutedAt = new Date();

        // 更新统计信息
        if (workflow.executionStats) {
            if (taskResult.success) {
                workflow.executionStats.completedTasks += 1;
            } else {
                workflow.executionStats.failedTasks += 1;
            }
        }

        if (taskResult.success) {
            // 任务成功：压缩到历史并滑动窗口
            await this.compressAndSlide(workflow, currentTask);
        } else {
            // 任务失败：暂停工作流
            workflow.status = 'paused';
        }

        // 保存到数据库
        await this.workflowService.updateWorkflow(workflowId, workflow);
    }

    /**
     * 仅滑动窗口（当前任务已完成）
     */
    async slideWindow(workflowId: string): Promise<void> {
        const workflow = await this.workflowService.getWorkflowOrThrow(workflowId);
        const window = await this.getWindow(workflowId);
        const currentTask = window.current;

        if (currentTask.status !== 'completed') {
            throw new Error('Cannot slide window: current task is not completed');
        }

        await this.compressAndSlide(workflow, currentTask);
        await this.workflowService.updateWorkflow(workflowId, workflow);
    }

    /**
     * 压缩当前任务到历史并滑动窗口
     */
    private async compressAndSlide(workflow: WorkflowEntity, currentTask: Task): Promise<void> {
        // 1. 压缩当前任务到历史
        const summary: TaskSummary = {
            id: currentTask.id,
            name: currentTask.name,
            status: currentTask.status === 'completed' ? 'completed' : 'failed',
            result: currentTask.result,
            error: currentTask.error,
            completedAt: currentTask.completedAt
        };

        workflow.compressedHistory = workflow.compressedHistory || [];
        workflow.compressedHistory.push(summary);

        // 只保留最近 20 个
        if (workflow.compressedHistory.length > 20) {
            workflow.compressedHistory = workflow.compressedHistory.slice(-20);
        }

        // 2. 滑动窗口（更新 currentFocus）
        const tasks = this.getTasks(workflow);
        const currentIndex = tasks.findIndex(t => t.id === currentTask.id);

        if (currentIndex === -1) {
            throw new Error('Current task not found in workflow');
        }

        // 查找下一个待执行的任务
        const nextTask = tasks.slice(currentIndex + 1).find(t => t.status === 'pending');

        if (nextTask) {
            // 还有待执行任务，滑动窗口
            workflow.currentFocus = nextTask.id;
        } else {
            // 没有待执行任务，工作流完成
            workflow.status = 'completed';
            workflow.completedAt = new Date();
            workflow.currentFocus = undefined;
        }
    }

    // ============================================================================
    // 任务执行
    // ============================================================================

    /**
     * 执行单个任务
     *
     * @param task - 要执行的任务
     * @param workflow - 工作流实体
     * @param injector - 依赖注入器
     * @returns 执行结果
     */
    private async executeTask(
        task: Task,
        workflow: WorkflowEntity,
        injector: Injector
    ): Promise<TaskExecutionResult> {
        try {
            // 更新任务状态为运行中
            task.status = 'running';
            task.startedAt = new Date();

            // 调用 WorkflowRunner 执行任务
            // 注意：这里需要传递完整的 workflow 对象，因为 WorkflowRunner 需要上下文
            const result = await this.workflowRunner.executeTask(task, workflow, injector);

            return {
                success: true,
                result
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            return {
                success: false,
                error: errorMessage
            };
        }
    }

    // ============================================================================
    // 重规划
    // ============================================================================

    /**
     * 触发重规划
     *
     * @param workflowId - 工作流 ID
     * @param reason - 重规划原因
     * @param context - 重规划上下文（用户提供的额外信息）
     * @returns 应用的 Patch 列表
     */
    async replan(
        workflowId: string,
        reason: 'task_failure' | 'dependency_change' | 'user_request',
        context?: any
    ): Promise<WorkflowPatch[]> {
        const workflow = await this.workflowService.getWorkflowOrThrow(workflowId);
        const window = await this.getWindow(workflowId);

        // 调用规划引擎生成 Patches
        // TODO: 这里需要实现实际的规划引擎（可以是 LLM 或规则引擎）
        const patches = await this.generatePatches(window, reason, context);

        // 应用 Patches
        await this.workflowService.applyPatches(workflowId, patches);

        // 记录重规划事件
        workflow.replanHistory = workflow.replanHistory || [];
        workflow.replanHistory.push({
            timestamp: new Date(),
            triggerReason: reason,
            taskId: window.current.id,
            patchesApplied: patches,
            context
        });

        await this.workflowService.updateWorkflow(workflowId, workflow);

        return patches;
    }

    /**
     * 生成重规划 Patches（占位实现）
     *
     * TODO: 实现实际的规划引擎
     * - 可以调用 LLM API
     * - 可以使用规则引擎
     * - 可以基于模板生成
     */
    private async generatePatches(
        window: RollingWindowView,
        reason: string,
        context?: any
    ): Promise<WorkflowPatch[]> {
        // 占位实现：返回空数组
        // 实际应该根据 window 的状态和 reason 生成合理的 Patches
        console.log('Generating patches for replan:', { reason, context, currentTask: window.current.id });
        return [];
    }

    // ============================================================================
    // 自动执行
    // ============================================================================

    /**
     * 自动执行整个工作流
     *
     * 持续执行任务并滑动窗口，直到工作流完成或失败
     *
     * @param workflowId - 工作流 ID
     * @param injector - 依赖注入器
     * @returns 执行结果
     */
    async autoExecute(workflowId: string, injector: Injector): Promise<WorkflowExecutionResult> {
        const workflow = await this.workflowService.getWorkflowOrThrow(workflowId);
        const tasks = this.getTasks(workflow);
        const totalSteps = tasks.length;
        let completedSteps = 0;
        let failedSteps = 0;
        const errors: Array<{ taskId: string; taskName: string; error: string }> = [];

        // 标记工作流为运行中
        if (workflow.status === 'pending' || workflow.status === 'paused') {
            await this.workflowService.updateWorkflow(workflowId, { status: 'running', startedAt: new Date() });
        }

        // 持续执行直到完成或失败
        while (true) {
            const currentWorkflow = await this.workflowService.getWorkflowOrThrow(workflowId);

            // 检查工作流状态
            if (currentWorkflow.status === 'completed') {
                break;
            }

            if (currentWorkflow.status === 'paused' || currentWorkflow.status === 'failed') {
                break;
            }

            try {
                // 执行当前任务并滑动窗口
                await this.executeAndSlide(workflowId, injector);

                const window = await this.getWindow(workflowId);
                if (window.current.status === 'completed') {
                    completedSteps += 1;
                } else if (window.current.status === 'failed') {
                    failedSteps += 1;
                    errors.push({
                        taskId: window.current.id,
                        taskName: window.current.name,
                        error: window.current.error || 'Unknown error'
                    });
                }
            } catch (error) {
                // 执行出错，记录错误并停止
                const errorMessage = error instanceof Error ? error.message : String(error);
                const window = await this.getWindow(workflowId);
                errors.push({
                    taskId: window.current.id,
                    taskName: window.current.name,
                    error: errorMessage
                });
                failedSteps += 1;
                break;
            }
        }

        const finalWorkflow = await this.workflowService.getWorkflowOrThrow(workflowId);

        return {
            status: finalWorkflow.status!,
            totalSteps,
            completedSteps,
            failedSteps,
            errors
        };
    }

    // ============================================================================
    // Helper Methods
    // ============================================================================

    private getTasks(workflow: WorkflowEntity): Task[] {
        return Array.isArray(workflow.tasks) ? [...(workflow.tasks as Task[])] : [];
    }
}
