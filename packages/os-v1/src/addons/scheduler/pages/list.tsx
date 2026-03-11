import { Type, type Static } from '@sinclair/typebox';
import type { ComponentFactory } from '../../../tokens.js';
import type { Injector } from '@context-ai/core';
import * as jsx from '@context-ai/ctp';
import { Context, Text, Data, Group, Tool } from '@context-ai/ctp';
import { WorkflowService } from '../services/workflow.service.js';
import { ACTION_EXECUTER } from '../../../tokens.js';
import { LOOP_REQUEST_TOKEN } from '../../../actions/loop.action.js';
import type { WorkflowStatus } from '../types.js';
import { Layout } from '../../../components/Layout.js';

/**
 * 工作流列表 Props Schema
 */
export const ListPropsSchema = Type.Object({
    status: Type.Optional(Type.Union([
        Type.Literal('pending'),
        Type.Literal('running'),
        Type.Literal('paused'),
        Type.Literal('completed'),
        Type.Literal('failed')
    ], { description: '按状态过滤工作流（可选）' }))
});

export type ListProps = Static<typeof ListPropsSchema>;

/**
 * 工作流列表 ComponentFactory
 *
 * Page: workflow://list
 * 用途：列出所有工作流，支持按状态过滤
 */
export const ListFactory: ComponentFactory<ListProps> = async (props: ListProps, injector: Injector) => {
    const workflowService = injector.get(WorkflowService);
    const executor = injector.get(ACTION_EXECUTER);

    // 获取工作流列表（可选按状态过滤）
    const status = props.status as WorkflowStatus | undefined;
    const workflows = await workflowService.listWorkflows(status);

    // 计算统计信息
    const workflowStats = await Promise.all(
        workflows.map(w => workflowService.getWorkflowStats(w.id!))
    );

    // 计算总体统计
    const totalWorkflows = workflowStats.length;
    const runningCount = workflowStats.filter(s => s.status === 'running').length;
    const pausedCount = workflowStats.filter(s => s.status === 'paused').length;
    const completedCount = workflowStats.filter(s => s.status === 'completed').length;
    const failedCount = workflowStats.filter(s => s.status === 'failed').length;
    const pendingCount = workflowStats.filter(s => s.status === 'pending').length;

    return (
        <Layout injector={injector}>
            <Context
                name="Workflow Index - Memory-Conscious Task Orchestration"
                description="工作流索引 - 基于滚动窗口的任务编排系统"
            >
                <Group title="🧠 System Identity">
                    <Text>你是织梦（Weaver-X）的工作流管理伙伴。</Text>
                    <Text>我理解你的核心约束：上下文窗口限制会导致记忆遗忘。</Text>
                    <Text>因此，我们设计了滚动窗口模式 - 每个工作流只展示 5 个任务（1 后顾 + 1 当前 + 3 前瞻），其余任务被压缩到"记忆摘要"中。</Text>
                    <Text>这样，即使工作流包含 100+ 任务，你的上下文窗口也不会超载。</Text>
                </Group>

                <Group title="📊 Precise Statistics">
                    <Text>系统中当前存储了 {totalWorkflows} 个工作流：</Text>
                    <Text>• pending（待执行）: {pendingCount} 个</Text>
                    <Text>• running（执行中）: {runningCount} 个</Text>
                    <Text>• paused（已暂停）: {pausedCount} 个</Text>
                    <Text>• completed（已完成）: {completedCount} 个</Text>
                    <Text>• failed（失败）: {failedCount} 个</Text>
                    {status && <Text>当前筛选条件：status = "{status}" - 结果集 = {totalWorkflows} 个工作流</Text>}
                </Group>

                <Group title="📋 Workflow Registry">
                    <Data
                        source={workflowStats.map(stats => ({
                            id: stats.id,
                            name: stats.name,
                            status: stats.status,
                            'total_tasks': stats.totalTasks,
                            'completed_tasks': stats.completedTasks,
                            'failed_tasks': stats.failedTasks,
                            'progress_%': stats.progress,
                            'current_focus': stats.currentFocus || 'null',
                            'last_executed': stats.lastExecutedAt
                                ? new Date(stats.lastExecutedAt).toISOString()
                                : 'never'
                        }))}
                        format="table"
                        fields={['id', 'name', 'status', 'total_tasks', 'completed_tasks', 'failed_tasks', 'progress_%', 'current_focus', 'last_executed']}
                        title="Workflow List"
                    />
                </Group>

                <Group title="🔍 State Machine Definition">
                    <Text>工作流状态转换规则（有限状态机）：</Text>
                    <Text>• pending → running: 首次执行任务时自动转换</Text>
                    <Text>• running → paused: 任务失败或用户手动暂停</Text>
                    <Text>• paused → running: 用户手动恢复</Text>
                    <Text>• running → completed: 所有任务执行成功</Text>
                    <Text>• running → failed: 任务失败且无法恢复</Text>
                    <Text>注意：completed 和 failed 是终止状态，不可逆转。</Text>
                </Group>

                <Group title="💾 Memory Management Strategy">
                    <Text>为了保护你的上下文窗口，我们采用了三层存储架构：</Text>
                    <Text>• Hot Layer（热层）: 当前窗口的 5 个任务 - 完整详情，占用上下文</Text>
                    <Text>• Warm Layer（温层）: 最近 20 个已完成任务 - 仅摘要（id/name/status/result），节省上下文</Text>
                    <Text>• Cold Layer（冷层）: 所有历史任务 - 存储在数据库，按需加载</Text>
                    <Text>你永远只会看到当前窗口（5个任务）+ 压缩历史（20个摘要），总上下文消耗可控。</Text>
                </Group>

                <Group title="🎯 Recommended Actions">
                    <Text>对于 running 状态的工作流：使用 viewWorkflowDetail 查看滚动窗口并执行下一步</Text>
                    <Text>对于 paused 状态的工作流：查看详情，分析失败原因，修复后恢复</Text>
                    <Text>对于 pending 状态的工作流：首次查看详情会自动转为 running 状态</Text>
                    <Text>对于 completed/failed 状态：仅供审计和分析，不可修改</Text>
                </Group>

                {/* Tool: 查看工作流详情 */}
                <Tool
                    name='viewWorkflowDetail'
                    label='查看工作流详情'
                    description='进入指定工作流的滚动窗口视图，查看当前 5 个任务的详细状态和可用操作'
                    parameters={Type.Object({
                        workflowId: Type.String({
                            description: '工作流唯一标识符（从上方表格的 id 列中选择）'
                        }),
                        prompt: Type.String({
                            description: '你想了解什么？例如："当前进度如何？"、"窗口中有哪些任务？"、"历史记录显示了什么？"'
                        })
                    })}
                    execute={async (_toolCallId, params) => {
                        const res = await executor.execute(
                            LOOP_REQUEST_TOKEN,
                            {
                                path: `workflow://detail/${params.workflowId}`,
                                prompt: params.prompt
                            },
                            injector
                        );

                        if (res.success) {
                            return {
                                content: [{ type: 'text', text: res.output }],
                                details: null
                            };
                        }

                        return {
                            content: [{
                                type: 'text',
                                text: `⚠️ 查看失败（精确错误）: ${res.error || 'Unknown error - 这不应该发生，请检查工作流 ID 是否正确'}`
                            }],
                            details: null
                        };
                    }}
                />
            </Context>
        </Layout>

    );
};
