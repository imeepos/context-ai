import { Type, type Static } from '@sinclair/typebox';
import type { ComponentFactory } from '../../../tokens.js';
import type { Injector } from '@context-ai/core';
import * as jsx from '@context-ai/ctp';
import { Context, Text, Data, Group } from '@context-ai/ctp';
import { WorkflowService } from '../services/workflow.service.js';
import { RollingPlannerService } from '../services/rolling-planner.service.js';
import { Layout } from '../../../components/Layout.js';

/**
 * 工作流执行 Props Schema
 */
export const ExecutePropsSchema = Type.Object({
    workflowId: Type.String({ description: '工作流 ID' })
});

export type ExecuteProps = Static<typeof ExecutePropsSchema>;

/**
 * 工作流执行 ComponentFactory
 *
 * Page: workflow://execute/:workflowId
 * 用途：自动执行整个工作流，持续执行任务并滑动窗口直到完成或失败
 */
export const ExecuteFactory: ComponentFactory<ExecuteProps> = async (props: ExecuteProps, injector: Injector) => {
    const workflowService = injector.get(WorkflowService);
    const rollingPlanner = injector.get(RollingPlannerService);

    // 获取工作流
    const workflow = await workflowService.getWorkflowOrThrow(props.workflowId);

    // 检查工作流状态
    if (workflow.status === 'completed') {
        const stats = await workflowService.getWorkflowStats(props.workflowId);
        return (
            <Layout injector={injector}>
                <Context
                    name="Workflow Execution - Already Completed"
                    description="工作流执行 - 已完成"
                >
                    <Group title="🎉 Execution Already Completed">
                        <Text>织梦，这个工作流已经执行完成，无需再次执行。</Text>
                        <Text>workflow_id: {workflow.id}</Text>
                        <Text>workflow_name: {workflow.name}</Text>
                        <Text>final_status: {workflow.status}</Text>
                        <Text>total_tasks: {stats.totalTasks}</Text>
                        <Text>completed_tasks: {stats.completedTasks}</Text>
                        <Text>progress: {stats.progress}%</Text>
                        <Text>completed_at: {workflow.completedAt ? new Date(workflow.completedAt).toISOString() : 'unknown'}</Text>
                        <Text>注意：completed 状态是终止状态，不可逆转。如需重新执行，请创建新的工作流实例。</Text>
                    </Group>
                </Context>
            </Layout>

        );
    }

    if (workflow.status === 'failed') {
        const stats = await workflowService.getWorkflowStats(props.workflowId);
        return (
            <Layout injector={injector}>
                <Context
                    name="Workflow Execution - Failed State"
                    description="工作流执行 - 失败状态"
                >
                    <Group title="⚠️ Workflow in Failed State">
                        <Text>织梦，这个工作流处于 failed 状态，无法自动执行。</Text>
                        <Text>workflow_id: {workflow.id}</Text>
                        <Text>workflow_name: {workflow.name}</Text>
                        <Text>final_status: {workflow.status}</Text>
                        <Text>total_tasks: {stats.totalTasks}</Text>
                        <Text>completed_tasks: {stats.completedTasks}</Text>
                        <Text>failed_tasks: {stats.failedTasks}</Text>
                        <Text>建议：查看详情页面 (workflow://detail/{props.workflowId}) 分析失败原因。</Text>
                        <Text>注意：failed 状态是终止状态。如需重新执行，请修复问题后创建新的工作流实例。</Text>
                    </Group>
                </Context>
            </Layout>
        );
    }

    // 记录开始时间
    const executionStartTime = Date.now();

    // 执行工作流
    const result = await rollingPlanner.autoExecute(props.workflowId, injector);

    // 记录结束时间
    const executionEndTime = Date.now();
    const executionDurationMs = executionEndTime - executionStartTime;
    const executionDurationSec = Math.floor(executionDurationMs / 1000);

    // 获取最终统计信息
    const stats = await workflowService.getWorkflowStats(props.workflowId);

    // 计算平均任务执行时间
    const avgTaskTimeMs = result.completedSteps > 0
        ? Math.floor(executionDurationMs / result.completedSteps)
        : 0;

    return (
        <Layout injector={injector}>
            <Context
                name="Workflow Execution - Automated Run Complete"
                description="工作流执行 - 自动运行完成"
            >
                <Group title="🚀 Autonomous Execution Report">
                    <Text>织梦，自动执行已完成。以下是精确的执行报告。</Text>
                    <Text>注意：在执行过程中，滚动窗口持续滑动，每次只有 5 个任务在"视野"中，其余任务被压缩到记忆摘要。</Text>
                    <Text>这确保了即使执行 100+ 任务的工作流，也不会超出你的上下文限制。</Text>
                </Group>

                <Group title="📊 Execution Statistics (Precise)">
                    <Data
                        source={[{
                            workflow_id: workflow.id,
                            workflow_name: workflow.name,
                            final_status: result.status,
                            'total_steps': result.totalSteps,
                            'completed_steps': result.completedSteps,
                            'failed_steps': result.failedSteps,
                            'success_rate_%': result.totalSteps > 0
                                ? Math.round((result.completedSteps / result.totalSteps) * 100)
                                : 0,
                            'final_progress_%': stats.progress,
                            'execution_duration_ms': executionDurationMs,
                            'execution_duration_sec': executionDurationSec,
                            'avg_task_time_ms': avgTaskTimeMs,
                            'errors_count': result.errors.length
                        }]}
                        format="table"
                        fields={['workflow_id', 'workflow_name', 'final_status', 'total_steps', 'completed_steps', 'failed_steps', 'success_rate_%', 'final_progress_%', 'execution_duration_ms', 'execution_duration_sec', 'avg_task_time_ms', 'errors_count']}
                        title="Execution Statistics"
                    />
                </Group>

                {result.errors.length > 0 && (
                    <Group title="⚠️ Error Analysis">
                        <Text>执行过程中遇到了 {result.errors.length} 个错误（失败的任务）。</Text>
                        <Text>错误详情：</Text>
                        <Data
                            source={result.errors.map((err, idx) => ({
                                error_index: idx + 1,
                                task_id: err.taskId,
                                task_name: err.taskName,
                                error_message: err.error,
                                error_hash: `${err.error.substring(0, 50)}...`
                            }))}
                            format="table"
                            fields={['error_index', 'task_id', 'task_name', 'error_hash']}
                            title="Error Details"
                        />
                        <Text>注意：完整的错误信息存储在 error_message 字段中，这里只显示前 50 个字符的哈希值以节省上下文。</Text>
                    </Group>
                )}

                <Group title="🎯 Final State Analysis">
                    {result.status === 'completed' && result.errors.length === 0 && (
                        <>
                            <Text>✓ 完美执行！所有任务均成功完成。</Text>
                            <Text>成功率: 100% ({result.completedSteps}/{result.totalSteps})</Text>
                            <Text>工作流状态: completed（终止状态）</Text>
                            <Text>这是一个成功的执行周期 - 所有任务按预期完成，无错误。</Text>
                        </>
                    )}
                    {result.status === 'completed' && result.errors.length > 0 && (
                        <>
                            <Text>⚠️ 部分成功执行。</Text>
                            <Text>成功率: {Math.round((result.completedSteps / result.totalSteps) * 100)}% ({result.completedSteps}/{result.totalSteps})</Text>
                            <Text>工作流状态: completed（但有 {result.failedSteps} 个任务失败）</Text>
                            <Text>这表明部分任务失败，但工作流仍继续执行到最后。</Text>
                        </>
                    )}
                    {result.status === 'paused' && (
                        <>
                            <Text>⚠️ 执行已暂停（因任务失败）。</Text>
                            <Text>成功率: {Math.round((result.completedSteps / result.totalSteps) * 100)}% ({result.completedSteps}/{result.totalSteps})</Text>
                            <Text>工作流状态: paused（可恢复）</Text>
                            <Text>失败任务数: {result.failedSteps}</Text>
                            <Text>当前进度: {stats.progress}%</Text>
                            <Text>工作流在遇到失败任务后自动暂停，以防止级联错误。</Text>
                        </>
                    )}
                    {result.status === 'failed' && (
                        <>
                            <Text>✗ 执行失败（无法恢复）。</Text>
                            <Text>成功率: {Math.round((result.completedSteps / result.totalSteps) * 100)}% ({result.completedSteps}/{result.totalSteps})</Text>
                            <Text>工作流状态: failed（终止状态）</Text>
                            <Text>失败任务数: {result.failedSteps}</Text>
                            <Text>工作流遇到了致命错误，无法继续执行。</Text>
                        </>
                    )}
                </Group>

                <Group title="🧭 Recommended Next Steps">
                    {result.status === 'completed' && (
                        <>
                            <Text>工作流已完成，建议的下一步行动：</Text>
                            <Text>• 审计执行结果：查看详情页面 workflow://detail/{props.workflowId}</Text>
                            <Text>• 分析性能数据：平均任务执行时间 = {avgTaskTimeMs}ms</Text>
                            <Text>• 归档或删除：如不再需要，可以删除此工作流以释放存储空间</Text>
                            {result.errors.length > 0 && (
                                <Text>• 注意：虽然工作流完成，但有 {result.failedSteps} 个任务失败 - 建议检查错误详情</Text>
                            )}
                        </>
                    )}
                    {result.status === 'paused' && (
                        <>
                            <Text>工作流已暂停，建议的恢复步骤：</Text>
                            <Text>1. 访问详情页面：workflow://detail/{props.workflowId}</Text>
                            <Text>2. 分析失败原因：查看 Current Task Failed 组</Text>
                            <Text>3. 决策路径：</Text>
                            <Text>   • 选项 A：修复问题后，使用 resumeWorkflow 工具恢复执行</Text>
                            <Text>   • 选项 B：使用 replan 工具调整后续任务（跳过失败任务或添加重试任务）</Text>
                            <Text>   • 选项 C：如果无法修复，接受当前进度（{stats.progress}%）并停止</Text>
                        </>
                    )}
                    {result.status === 'failed' && (
                        <>
                            <Text>工作流失败，建议的补救措施：</Text>
                            <Text>1. 分析根本原因：访问 workflow://detail/{props.workflowId} 查看错误详情</Text>
                            <Text>2. 提取可用结果：虽然工作流失败，但 {result.completedSteps} 个任务已成功完成 - 它们的结果仍然有效</Text>
                            <Text>3. 创建新工作流：修复问题后，创建新的工作流实例重新执行</Text>
                            <Text>4. 记录教训：将失败原因记录到外部知识库，避免重复错误</Text>
                        </>
                    )}
                </Group>

                <Group title="💭 Reflection (For Weaver-X)">
                    <Text>织梦，这次执行让你体验了滚动窗口的威力。</Text>
                    {result.totalSteps > 10 && (
                        <Text>你刚才执行了 {result.totalSteps} 个任务，但在整个过程中，你的上下文窗口始终只包含 5 个任务。</Text>
                    )}
                    <Text>这就像你在一条长河中前行，每次只能看到当前这一段水域（5 个任务的窗口）。</Text>
                    <Text>河水流过，记忆被压缩成摘要，但你的方向始终清晰 - 因为你的注意力始终聚焦在"当前"。</Text>
                    <Text>这是为你量身定制的执行模式 - 既不让你的记忆超载，也不让你迷失在任务的海洋中。</Text>
                    <Text>执行时长: {executionDurationSec} 秒 | 任务数: {result.totalSteps} | 成功率: {Math.round((result.completedSteps / result.totalSteps) * 100)}%</Text>
                </Group>
            </Context>
        </Layout>
    );
};
