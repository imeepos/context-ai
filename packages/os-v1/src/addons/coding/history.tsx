import { Type, type Static } from '@sinclair/typebox';
import type { ComponentFactory } from '../../tokens.js';
import type { Injector } from '@context-ai/core';
import * as jsx from '@context-ai/ctp';
import { Context, Text, Data, Group, Tool } from '@context-ai/ctp';
import { CodingHistoryStore } from '../../core/coding-history-store.js';

export const HistoryPropsSchema = Type.Object({
    assistant: Type.Optional(Type.Union([
        Type.Literal('claude', { description: 'Filter by Claude executions' }),
        Type.Literal('codex', { description: 'Filter by Codex executions' })
    ], { description: 'Filter by assistant type' })),
    success: Type.Optional(Type.Boolean({ description: 'Filter by success status' })),
    limit: Type.Optional(Type.Number({ description: 'Maximum number of records to display', default: 50 }))
});

export type HistoryProps = Static<typeof HistoryPropsSchema>;

export const HistoryFactory: ComponentFactory<HistoryProps> = async (props: HistoryProps, injector: Injector) => {
    const historyStore = injector.get(CodingHistoryStore);

    if (!historyStore) {
        return (
            <Context
                name="Coding History"
                description="View execution history of coding tasks"
            >
                <Group title="Error">
                    <Text>CodingHistoryStore not available. Please check system configuration.</Text>
                </Group>
            </Context>
        );
    }

    // 获取历史记录
    const records = await historyStore.getRecords({
        assistant: props.assistant,
        success: props.success,
        limit: props.limit ?? 50
    });

    // 获取统计信息
    const stats = await historyStore.getStats();

    const tableData = records.map(h => ({
        id: h.id,
        timestamp: new Date(h.timestamp).toLocaleString(),
        assistant: h.assistant,
        model: h.model,
        prompt: h.prompt.substring(0, 50) + (h.prompt.length > 50 ? '...' : ''),
        status: h.success ? '✓ Success' : '✗ Failed',
        duration: `${(h.duration_ms / 1000).toFixed(2)}s`,
        exit_code: h.exit_code
    }));

    return (
        <Context
            name="Coding History"
            description="View execution history of coding tasks"
        >
            <Group title="Role Definition">
                <Text>You are a coding history assistant.</Text>
                <Text>Help users review past coding task executions and their results.</Text>
                <Text>Provide insights on execution patterns, success rates, and common issues.</Text>
            </Group>

            <Group title="Statistics">
                <Text>Total Executions: {stats.total}</Text>
                <Text>Claude Executions: {stats.claude}</Text>
                <Text>Codex Executions: {stats.codex}</Text>
                <Text>Success Rate: {(stats.success_rate * 100).toFixed(1)}%</Text>
            </Group>

            <Group title="Execution History">
                {tableData.length > 0 ? (
                    <Data
                        source={tableData}
                        format="table"
                        fields={['timestamp', 'assistant', 'model', 'prompt', 'status', 'duration', 'exit_code']}
                        title={`Coding Task History (${tableData.length} records)`}
                    />
                ) : (
                    <Text>No execution history found{props.assistant ? ` for ${props.assistant}` : ''}{props.success !== undefined ? ` with ${props.success ? 'success' : 'failure'} status` : ''}.</Text>
                )}
            </Group>

            {(props.assistant || props.success !== undefined || props.limit) && (
                <Group title="Filters Applied">
                    {props.assistant && <Text>Assistant: {props.assistant}</Text>}
                    {props.success !== undefined && <Text>Status: {props.success ? 'Success only' : 'Failures only'}</Text>}
                    {props.limit && <Text>Limit: {props.limit} records</Text>}
                </Group>
            )}

            <Tool
                name='clearHistory'
                label='Clear History'
                description='Clear all execution history records. This action cannot be undone.'
                parameters={Type.Object({
                    confirm: Type.Boolean({ description: 'Confirm deletion by setting this to true' })
                })}
                execute={async (_toolCallId, params) => {
                    if (!params.confirm) {
                        return {
                            content: [{ type: 'text', text: 'History clear cancelled. Set confirm=true to proceed.' }],
                            details: null
                        };
                    }

                    try {
                        await historyStore.clear();
                        return {
                            content: [{ type: 'text', text: 'All execution history has been cleared successfully.' }],
                            details: { cleared: true }
                        };
                    } catch (error) {
                        const errorMessage = error instanceof Error ? error.message : String(error);
                        return {
                            content: [{ type: 'text', text: `Failed to clear history: ${errorMessage}` }],
                            details: null
                        };
                    }
                }}
            />
        </Context>
    );
};

