import { Type, type Static } from '@sinclair/typebox';
import type { ComponentFactory } from '../../../tokens.js';
import type { Injector } from '@context-ai/core';
import * as jsx from '@context-ai/ctp';
import { Context, Text, Data, Group, Tool } from '@context-ai/ctp';
import { WorkflowService } from '../services/workflow.service.js';
import { RollingPlannerService } from '../services/rolling-planner.service.js';
import { Layout } from '../../../components/Layout.js';

/**
 * 工作流详情 Props Schema
 */
export const DetailPropsSchema = Type.Object({
    workflowId: Type.String({ description: '工作流 ID' })
});

export type DetailProps = Static<typeof DetailPropsSchema>;

/**
 * 工作流详情 ComponentFactory
 *
 * Page: workflow://detail/:workflowId
 * 用途：查看工作流的滚动窗口和执行状态（核心页面）
 */
export const DetailFactory: ComponentFactory<DetailProps> = async (props: DetailProps, injector: Injector) => {
    const workflowService = injector.get(WorkflowService);
    const rollingPlanner = injector.get(RollingPlannerService);

    // 获取工作流和滚动窗口
    const workflow = await workflowService.getWorkflowOrThrow(props.workflowId);
    const window = await rollingPlanner.getWindow(props.workflowId);
    const stats = await workflowService.getWorkflowStats(props.workflowId);
    const windowStats = await rollingPlanner.getWindowStats(props.workflowId);

    // 构建窗口任务列表（后顾 + 当前 + 前瞻）
    const windowTasks = [
        ...window.lookBehind.map((t, idx) => ({
            relative_pos: -(window.lookBehind.length - idx),
            task_id: t.id,
            task_name: t.name,
            status: t.status,
            position_marker: '(已完成，后顾)',
            result_summary: t.result ? JSON.stringify(t.result).substring(0, 50) + '...' : 'null'
        })),
        {
            relative_pos: 0,
            task_id: window.current.id,
            task_name: window.current.name,
            status: window.current.status,
            position_marker: '← 当前焦点（你的注意力应集中于此）',
            result_summary: window.current.result ? JSON.stringify(window.current.result).substring(0, 50) + '...' : 'null'
        },
        ...window.lookAhead.map((t, idx) => ({
            relative_pos: idx + 1,
            task_id: t.id,
            task_name: t.name,
            status: t.status,
            position_marker: `(前瞻 +${idx + 1})`,
            result_summary: 'not_executed_yet'
        }))
    ];

    // 计算精确的时间信息
    const createdAt = workflow.createAt ? new Date(workflow.createAt) : null;
    const startedAt = workflow.startedAt ? new Date(workflow.startedAt) : null;
    const lastExecutedAt = stats.lastExecutedAt ? new Date(stats.lastExecutedAt) : null;
    const now = new Date();
    const elapsedTime = startedAt ? Math.floor((now.getTime() - startedAt.getTime()) / 1000) : 0;
    const idleTime = lastExecutedAt ? Math.floor((now.getTime() - lastExecutedAt.getTime()) / 1000) : 0;

    return (
        <Layout injector={injector}>
            <Context
                name="Workflow Detail - Rolling Window View"
                description="工作流详情 - 滚动窗口视图（为织梦的上下文窗口优化）"
            >
                <Group title="🧠 Context Window Protection">
                    <Text>织梦，这是专为你设计的滚动窗口视图。</Text>
                    <Text>我理解你的记忆会随着上下文拉长而遗忘，因此我只向你展示必要的信息。</Text>
                    <Text>当前窗口包含 {windowStats.totalWindowSize} 个任务（{window.lookBehind.length} 后顾 + 1 当前 + {window.lookAhead.length} 前瞻）。</Text>
                    <Text>其余 {stats.totalTasks - windowStats.totalWindowSize} 个任务已被压缩到"记忆摘要"中，不占用你的上下文窗口。</Text>
                    <Text>⚠️ 重要提示：不要尝试一次性查看所有任务 - 这会超出你的上下文限制并导致记忆丢失。相信滚动窗口，一步一步来。</Text>
                </Group>

                <Group title="📊 Workflow Metadata (Precise)">
                    <Data
                        source={[{
                            workflow_id: workflow.id,
                            workflow_name: workflow.name,
                            current_status: workflow.status,
                            'total_tasks_count': stats.totalTasks,
                            'completed_tasks_count': stats.completedTasks,
                            'failed_tasks_count': stats.failedTasks,
                            'progress_percentage': stats.progress,
                            'current_focus_task_id': stats.currentFocus || 'null',
                            'window_config': `lookBehind=${workflow.windowConfig?.lookBehind}, lookAhead=${workflow.windowConfig?.lookAhead}`,
                            'created_at_iso': createdAt?.toISOString() || 'null',
                            'started_at_iso': startedAt?.toISOString() || 'null',
                            'last_executed_at_iso': lastExecutedAt?.toISOString() || 'null',
                            'elapsed_time_seconds': elapsedTime,
                            'idle_time_seconds': idleTime
                        }]}
                        format="table"
                        fields={['workflow_id', 'workflow_name', 'current_status', 'total_tasks_count', 'completed_tasks_count', 'failed_tasks_count', 'progress_percentage', 'current_focus_task_id', 'window_config', 'created_at_iso', 'started_at_iso', 'last_executed_at_iso', 'elapsed_time_seconds', 'idle_time_seconds']}
                        title="Workflow Metadata"
                    />
                </Group>

                <Group title="🎯 Current Rolling Window (Hot Layer - In Your Context)">
                    <Text>这是你当前"看到"的 {windowStats.totalWindowSize} 个任务 - 它们占用你的上下文窗口。</Text>
                    <Text>窗口布局：[{window.lookBehind.length} 个后顾] + [1 个当前] + [{window.lookAhead.length} 个前瞻] = {windowStats.totalWindowSize} 个任务</Text>
                    <Data
                        source={windowTasks}
                        format="table"
                        fields={['relative_pos', 'task_id', 'task_name', 'status', 'position_marker', 'result_summary']}
                        title="Window Tasks (Relative Positioning)"
                    />
                    <Text>注意：relative_pos 表示相对于当前焦点的位置（0 = 当前，负数 = 后顾，正数 = 前瞻）</Text>
                </Group>

                {window.current.status === 'running' && (
                    <Group title="🔍 Current Task Deep Dive">
                        <Text>当前焦点任务的完整信息（这是你应该关注的任务）：</Text>
                        <Text>• task_id: {window.current.id}</Text>
                        <Text>• task_name: {window.current.name}</Text>
                        <Text>• task_description: {window.current.description}</Text>
                        <Text>• task_status: {window.current.status}</Text>
                        <Text>• action_token: {String(window.current.token)}</Text>
                        <Text>• started_at: {window.current.startedAt ? new Date(window.current.startedAt).toISOString() : 'not_started_yet'}</Text>
                        <Text>• params: {JSON.stringify(window.current.params, null, 2)}</Text>
                        <Text>这是你唯一需要执行的任务 - 完成它后，窗口会自动滑动到下一个。</Text>
                    </Group>
                )}

                {window.current.status === 'failed' && (
                    <Group title="⚠️ Current Task Failed">
                        <Text>当前任务执行失败，工作流已暂停。</Text>
                        <Text>• task_id: {window.current.id}</Text>
                        <Text>• error_message: {window.current.error || 'unknown_error'}</Text>
                        <Text>• failed_at: {window.current.completedAt ? new Date(window.current.completedAt).toISOString() : 'unknown'}</Text>
                        <Text>你可以使用 replan 工具来调整后续任务，或手动修复问题后恢复工作流。</Text>
                    </Group>
                )}

                {window.compressedHistory.length > 0 && (
                    <Group title="💾 Compressed Memory (Warm Layer - Summarized)">
                        <Text>这是被压缩的历史记录 - 只保留关键摘要，不占用过多上下文。</Text>
                        <Text>总共有 {window.compressedHistory.length} 个任务被压缩（最多保留 20 个最近的）。</Text>
                        <Text>显示最近 10 个压缩任务：</Text>
                        <Data
                            source={window.compressedHistory.slice(-10).map(h => ({
                                task_id: h.id,
                                task_name: h.name,
                                final_status: h.status,
                                result_hash: h.result ? `${JSON.stringify(h.result).substring(0, 30)}...` : 'null',
                                completed_at_iso: h.completedAt ? new Date(h.completedAt).toISOString() : 'null'
                            }))}
                            format="table"
                            fields={['task_id', 'task_name', 'final_status', 'result_hash', 'completed_at_iso']}
                            title="Compressed History (Last 10)"
                        />
                        <Text>注意：这里只保留了 id/name/status/result_hash，完整的 params 和详细信息已被丢弃以节省你的上下文。</Text>
                        <Text>如果需要查看完整历史，它存储在数据库中（Cold Layer），但会占用大量上下文 - 除非必要，否则不建议加载。</Text>
                    </Group>
                )}

                {workflow.replanHistory && workflow.replanHistory.length > 0 && (
                    <Group title="🔄 Replan Event Log (Audit Trail)">
                        <Text>工作流经历了 {workflow.replanHistory.length} 次重规划事件（动态调整）。</Text>
                        <Text>显示最近 5 次重规划：</Text>
                        <Data
                            source={workflow.replanHistory.slice(-5).map(event => ({
                                timestamp_iso: new Date(event.timestamp).toISOString(),
                                trigger_reason: event.triggerReason,
                                triggered_at_task_id: event.taskId,
                                patches_applied_count: event.patchesApplied.length,
                                context_provided: event.context ? JSON.stringify(event.context).substring(0, 50) + '...' : 'null'
                            }))}
                            format="table"
                            fields={['timestamp_iso', 'trigger_reason', 'triggered_at_task_id', 'patches_applied_count', 'context_provided']}
                            title="Recent Replan Events"
                        />
                        <Text>每次重规划都会生成一系列 Patch 操作（add_task, remove_task, update_task 等），动态调整工作流结构。</Text>
                    </Group>
                )}

                <Group title="🎮 Available Actions">
                    <Text>根据当前状态 ({workflow.status})，你可以执行以下操作：</Text>
                    {(workflow.status === 'running' || workflow.status === 'pending') && window.current.status !== 'completed' && (
                        <Text>• nextTask: 执行当前焦点任务，完成后窗口自动滑动到下一个任务</Text>
                    )}
                    {(workflow.status === 'running' || workflow.status === 'paused') && (
                        <Text>• replan: 根据当前状态动态调整后续任务（需要提供原因）</Text>
                    )}
                    {workflow.status === 'running' && (
                        <Text>• pauseWorkflow: 暂停执行，保存当前状态（可稍后恢复）</Text>
                    )}
                    {workflow.status === 'paused' && (
                        <Text>• resumeWorkflow: 恢复执行（将状态从 paused 转为 running）</Text>
                    )}
                    <Text>不可用的操作将不会显示为工具 - 如果你看不到某个工具，说明当前状态不允许该操作。</Text>
                </Group>

                {/* Tool 1: 执行下一个任务并滑动窗口 */}
                {(workflow.status === 'running' || workflow.status === 'pending') && window.current.status !== 'completed' && (
                    <Tool
                        name='nextTask'
                        label='执行下一步'
                        description={`执行当前焦点任务（task_id: ${window.current.id}），成功后自动滑动窗口到下一个任务。失败则暂停工作流。`}
                        parameters={Type.Object({})}
                        execute={async () => {
                            try {
                                await rollingPlanner.executeAndSlide(props.workflowId, injector);
                                return {
                                    content: [{
                                        type: 'text',
                                        text: `✓ 任务执行成功 (task_id: ${window.current.id})。\n窗口已滑动到下一个任务。\n建议：再次访问 workflow://detail/${props.workflowId} 查看新窗口状态。`
                                    }],
                                    details: null
                                };
                            } catch (error) {
                                const errorMessage = error instanceof Error ? error.message : String(error);
                                return {
                                    content: [{
                                        type: 'text',
                                        text: `✗ 执行失败 (task_id: ${window.current.id})。\n精确错误: ${errorMessage}\n工作流已自动暂停（status: paused）。\n建议：使用 replan 工具调整后续任务，或修复问题后使用 resumeWorkflow 恢复。`
                                    }],
                                    details: null
                                };
                            }
                        }}
                    />
                )}

                {/* Tool 2: 触发重规划 */}
                {(workflow.status === 'running' || workflow.status === 'paused') && (
                    <Tool
                        name='replan'
                        label='触发重规划'
                        description='基于当前窗口状态，动态生成 Patch 操作来调整后续任务。需要提供重规划原因（reason）以便审计。'
                        parameters={Type.Object({
                            reason: Type.String({
                                description: '重规划原因（必须精确描述）。例如："task-047 失败，需要添加重试任务"、"发现依赖变化，需要调整执行顺序"、"优化执行路径，减少不必要的任务"'
                            })
                        })}
                        execute={async (_toolCallId, params) => {
                            try {
                                const patches = await rollingPlanner.replan(
                                    props.workflowId,
                                    'user_request',
                                    { reason: params.reason }
                                );
                                return {
                                    content: [{
                                        type: 'text',
                                        text: `✓ 重规划完成。\n应用的 Patch 数量: ${patches.length} 个。\n原因: ${params.reason}\n建议：再次查看详情以确认调整结果。`
                                    }],
                                    details: null
                                };
                            } catch (error) {
                                const errorMessage = error instanceof Error ? error.message : String(error);
                                return {
                                    content: [{
                                        type: 'text',
                                        text: `✗ 重规划失败。\n精确错误: ${errorMessage}`
                                    }],
                                    details: null
                                };
                            }
                        }}
                    />
                )}

                {/* Tool 3: 暂停工作流 */}
                {workflow.status === 'running' && (
                    <Tool
                        name='pauseWorkflow'
                        label='暂停工作流'
                        description='将工作流状态从 running 转为 paused。当前所有状态会被保存到数据库，稍后可以从当前焦点任务恢复执行。'
                        parameters={Type.Object({})}
                        execute={async () => {
                            await workflowService.updateWorkflow(props.workflowId, { status: 'paused' });
                            return {
                                content: [{
                                    type: 'text',
                                    text: `✓ 工作流已暂停。\n当前焦点任务: ${window.current.id}\n当前进度: ${stats.progress}%\n所有状态已持久化到数据库。\n恢复方法：使用 resumeWorkflow 工具。`
                                }],
                                details: null
                            };
                        }}
                    />
                )}

                {/* Tool 4: 恢复工作流 */}
                {workflow.status === 'paused' && (
                    <Tool
                        name='resumeWorkflow'
                        label='恢复工作流'
                        description='将工作流状态从 paused 转为 running。从之前暂停的焦点任务继续执行。'
                        parameters={Type.Object({})}
                        execute={async () => {
                            await workflowService.updateWorkflow(props.workflowId, { status: 'running' });
                            return {
                                content: [{
                                    type: 'text',
                                    text: `✓ 工作流已恢复为运行状态。\n将从焦点任务 ${window.current.id} 继续执行。\n建议：使用 nextTask 工具执行下一步。`
                                }],
                                details: null
                            };
                        }}
                    />
                )}
            </Context>
        </Layout>
    );
};
