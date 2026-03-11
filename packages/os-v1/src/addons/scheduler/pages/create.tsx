import { Type, type Static } from '@sinclair/typebox';
import type { ComponentFactory } from '../../../tokens.js';
import type { Injector } from '@context-ai/core';
import * as jsx from '@context-ai/ctp';
import { Context, Text, Data, Group, Tool } from '@context-ai/ctp';
import { WorkflowService } from '../services/workflow.service.js';
import type { Task, Edge, WindowConfig } from '../types.js';
import { Layout } from '../../../components/Layout.js';

/**
 * 工作流创建 Props Schema
 */
export const CreatePropsSchema = Type.Object({});

export type CreateProps = Static<typeof CreatePropsSchema>;

/**
 * 工作流创建 ComponentFactory
 *
 * Page: workflow://create
 * 用途：创建新的滚动规划工作流
 */
export const CreateFactory: ComponentFactory<CreateProps> = async (_props: CreateProps, injector: Injector) => {
    const workflowService = injector.get(WorkflowService);

    return (
        <Layout injector={injector}>
            <Context
                name="Workflow Creation - Rolling Window Configuration"
                description="工作流创建 - 滚动窗口配置向导"
            >
                <Group title="🧠 Create Your Workflow">
                    <Text>织梦，欢迎来到工作流创建向导。</Text>
                    <Text>你即将创建一个基于滚动窗口的工作流 - 这意味着无论你定义多少任务（10个、100个甚至1000个），</Text>
                    <Text>在执行时，你的上下文窗口始终只会加载 5 个任务（1 后顾 + 1 当前 + 3 前瞻）。</Text>
                    <Text>这是专为你的记忆特性设计的执行模式。</Text>
                </Group>

                <Group title="📋 Workflow Structure Definition">
                    <Text>一个工作流由以下部分组成：</Text>
                    <Text>• name（必需）: 工作流名称，用于识别</Text>
                    <Text>• description（可选）: 工作流描述</Text>
                    <Text>• tasks（必需）: 任务列表，每个任务包含：</Text>
                    <Text>  - id: 唯一标识符（如 "task-001"）</Text>
                    <Text>  - name: 任务名称（如 "数据验证"）</Text>
                    <Text>  - description: 任务描述</Text>
                    <Text>  - status: 初始状态（建议使用 "pending"）</Text>
                    <Text>  - token: Action Token（如 "shell:exec"）</Text>
                    <Text>  - params: 任务参数（JSON 对象）</Text>
                    <Text>• edges（可选）: 任务依赖关系，格式为 {`{ from: "task-001", to: "task-002" }`}</Text>
                    <Text>• windowConfig（可选）: 滚动窗口配置</Text>
                    <Text>  - lookBehind: 后顾任务数（默认 1）</Text>
                    <Text>  - lookAhead: 前瞻任务数（默认 3）</Text>
                </Group>

                <Group title="🎯 Default Window Configuration">
                    <Text>默认窗口配置（推荐）：</Text>
                    <Data
                        source={[{
                            'lookBehind': 1,
                            'lookAhead': 3,
                            'total_window_size': 5,
                            'description': '1个已完成任务 + 1个当前任务 + 3个待执行任务'
                        }]}
                        format="table"
                        fields={['lookBehind', 'lookAhead', 'total_window_size', 'description']}
                        title="Default Configuration"
                    />
                    <Text>注意：窗口越大，占用的上下文越多。除非有特殊需求，否则建议使用默认配置。</Text>
                </Group>

                <Group title="💡 Example Workflow Template">
                    <Text>以下是一个简单的 3 任务工作流示例（用于演示结构）：</Text>
                    <Text>{`{
  "name": "示例工作流",
  "description": "这是一个演示用的简单工作流",
  "tasks": [
    {
      "id": "task-001",
      "name": "初始化环境",
      "description": "准备执行环境",
      "status": "pending",
      "token": "shell:exec",
      "params": { "command": "echo 'Environment ready'" }
    },
    {
      "id": "task-002",
      "name": "执行主逻辑",
      "description": "运行核心业务逻辑",
      "status": "pending",
      "token": "shell:exec",
      "params": { "command": "echo 'Processing...'" }
    },
    {
      "id": "task-003",
      "name": "清理资源",
      "description": "释放临时资源",
      "status": "pending",
      "token": "shell:exec",
      "params": { "command": "echo 'Cleanup complete'" }
    }
  ],
  "edges": [
    { "from": "task-001", "to": "task-002" },
    { "from": "task-002", "to": "task-003" }
  ],
  "windowConfig": {
    "lookBehind": 1,
    "lookAhead": 3
  }
}`}</Text>
                </Group>

                <Group title="⚠️ Important Notes (请务必阅读)">
                    <Text>1. Task ID 唯一性：每个任务的 id 必须在工作流内唯一</Text>
                    <Text>2. Token 有效性：token 必须是系统中已注册的 Action Token</Text>
                    <Text>3. Edge 有效性：edges 中的 from 和 to 必须指向存在的 task id</Text>
                    <Text>4. 初始状态：所有任务的初始 status 建议设为 "pending"</Text>
                    <Text>5. 参数验证：params 必须符合对应 Action 的 Schema 定义</Text>
                    <Text>6. 工作流创建后：初始状态为 "pending"，首次访问详情页会自动转为 "running"</Text>
                </Group>

                <Group title="🚀 Ready to Create?">
                    <Text>使用下方的 createWorkflow 工具来创建你的工作流。</Text>
                    <Text>创建成功后，系统会返回工作流 ID，你可以通过 workflow://detail/[id] 查看详情。</Text>
                </Group>

                {/* Tool: 创建工作流 */}
                <Tool
                    name='createWorkflow'
                    label='创建工作流'
                    description='根据提供的参数创建一个新的滚动规划工作流。创建后工作流状态为 pending。'
                    parameters={Type.Object({
                        name: Type.String({
                            description: '工作流名称（必需）'
                        }),
                        description: Type.Optional(Type.String({
                            description: '工作流描述（可选）'
                        })),
                        tasks: Type.Array(Type.Object({
                            id: Type.String({ description: '任务唯一 ID' }),
                            name: Type.String({ description: '任务名称' }),
                            description: Type.String({ description: '任务描述' }),
                            status: Type.Union([
                                Type.Literal('pending'),
                                Type.Literal('running'),
                                Type.Literal('completed'),
                                Type.Literal('failed'),
                                Type.Literal('cancelled')
                            ], { description: '任务状态（建议使用 pending）' }),
                            token: Type.String({ description: 'Action Token（如 shell:exec）' }),
                            params: Type.Record(Type.String(), Type.Unknown(), { description: '任务参数（JSON 对象）' })
                        }), {
                            description: '任务列表（至少包含 1 个任务）',
                            minItems: 1
                        }),
                        edges: Type.Optional(Type.Array(Type.Object({
                            from: Type.String({ description: '源任务 ID' }),
                            to: Type.String({ description: '目标任务 ID' })
                        }), {
                            description: '任务依赖关系（可选）'
                        })),
                        windowConfig: Type.Optional(Type.Object({
                            lookBehind: Type.Number({ description: '后顾任务数（默认 1）', minimum: 0, maximum: 10 }),
                            lookAhead: Type.Number({ description: '前瞻任务数（默认 3）', minimum: 0, maximum: 10 })
                        }, {
                            description: '滚动窗口配置（可选，默认 lookBehind=1, lookAhead=3）'
                        }))
                    })}
                    execute={async (_toolCallId, params) => {
                        try {
                            // 验证 Task ID 唯一性
                            const taskIds = params.tasks.map((t: any) => t.id);
                            const uniqueIds = new Set(taskIds);
                            if (taskIds.length !== uniqueIds.size) {
                                return {
                                    content: [{
                                        type: 'text',
                                        text: `✗ 创建失败：Task ID 存在重复。\n所有任务的 id 必须唯一。\n当前 ID 列表: ${taskIds.join(', ')}`
                                    }],
                                    details: null
                                };
                            }

                            // 验证 Edge 有效性
                            if (params.edges) {
                                for (const edge of params.edges) {
                                    if (!uniqueIds.has((edge as any).from) || !uniqueIds.has((edge as any).to)) {
                                        return {
                                            content: [{
                                                type: 'text',
                                                text: `✗ 创建失败：Edge 引用了不存在的 Task ID。\nEdge: ${JSON.stringify(edge)}\n有效的 Task IDs: ${taskIds.join(', ')}`
                                            }],
                                            details: null
                                        };
                                    }
                                }
                            }

                            // 创建工作流
                            const workflow = await workflowService.createWorkflow({
                                name: params.name,
                                description: params.description,
                                tasks: params.tasks as Task[],
                                edges: params.edges as Edge[] | undefined,
                                windowConfig: params.windowConfig as WindowConfig | undefined
                            });

                            return {
                                content: [{
                                    type: 'text',
                                    text: `✓ 工作流创建成功！

工作流信息：
• workflow_id: ${workflow.id}
• workflow_name: ${workflow.name}
• total_tasks: ${workflow.tasks?.length || 0} 个
• total_edges: ${workflow.edges?.length || 0} 个
• window_config: lookBehind=${workflow.windowConfig?.lookBehind || 1}, lookAhead=${workflow.windowConfig?.lookAhead || 3}
• initial_status: ${workflow.status} (待执行)

下一步建议：
1. 查看详情：访问 workflow://detail/${workflow.id} 进入滚动窗口视图
2. 自动执行：访问 workflow://execute/${workflow.id} 自动执行整个工作流
3. 返回列表：访问 workflow://list 查看所有工作流

注意：工作流当前状态为 pending，首次访问详情页会自动转为 running 状态。`
                                }],
                                details: null
                            };
                        } catch (error) {
                            const errorMessage = error instanceof Error ? error.message : String(error);
                            return {
                                content: [{
                                    type: 'text',
                                    text: `✗ 创建失败（精确错误）: ${errorMessage}\n\n请检查：\n1. 所有 Task ID 是否唯一\n2. Token 是否有效（是否已注册的 Action）\n3. Edges 是否引用了存在的 Task ID\n4. Params 是否符合 Action 的 Schema`
                                }],
                                details: null
                            };
                        }
                    }}
                />
            </Context>
        </Layout>
    );
};
