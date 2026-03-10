import { Type, type Static } from '@sinclair/typebox';
import type { ComponentFactory } from '../../tokens.js';
import type { Injector } from '@context-ai/core';
import * as jsx from '@context-ai/ctp';
import { Context, Text, Data, Group, Tool } from '@context-ai/ctp';
import { SCHEDULER_SERVICE } from '../../tokens.js';
import { SchedulerService } from '../../core/scheduler.js';

export const FailuresPropsSchema = Type.Object({
    limit: Type.Optional(Type.Number({ description: 'Maximum number of failure records to display' }))
});

export type FailuresProps = Static<typeof FailuresPropsSchema>;

export const FailuresFactory: ComponentFactory<FailuresProps> = async (props: FailuresProps, injector: Injector) => {
    const scheduler = injector.get(SCHEDULER_SERVICE) ?? injector.get(SchedulerService);

    if (!scheduler) {
        return (
            <Context
                name="Task Failures"
                description="View and manage failed tasks"
            >
                <Group title="Error">
                    <Text>SchedulerService not available. Please check system configuration.</Text>
                </Group>
            </Context>
        );
    }

    const failures = scheduler.listFailures(props.limit);
    const tableData = failures.map(failure => ({
        id: failure.id,
        attempt: failure.attempt,
        error: failure.error.length > 100 ? failure.error.substring(0, 100) + '...' : failure.error,
        timestamp: failure.timestamp
    }));

    return (
        <Context
            name="Task Failures"
            description="View and manage failed scheduled tasks"
        >
            <Group title="Role Definition">
                <Text>You are a task failure management assistant.</Text>
                <Text>Help users view failed task records, understand errors, and manage failure recovery.</Text>
                <Text>You can replay failed tasks to retry them, or clear failure records when no longer needed.</Text>
                <Text>IMPORTANT: After using tools, you MUST provide a clear, helpful response to the user based on the tool results.</Text>
            </Group>

            <Group title="Failure Records">
                {tableData.length > 0 ? (
                    <Data
                        source={tableData}
                        format="table"
                        fields={['id', 'attempt', 'error', 'timestamp']}
                        title={`Failed Tasks (${tableData.length})`}
                    />
                ) : (
                    <Text>No failure records found. All tasks are running normally.</Text>
                )}
            </Group>

            {props.limit && (
                <Group title="Display Limit">
                    <Text>Showing up to {props.limit} most recent failure records.</Text>
                </Group>
            )}

            <Tool
                name='replayFailure'
                label='Replay Failed Task'
                description='Retry a failed task by replaying it. This will attempt to execute the task again.'
                parameters={Type.Object({
                    taskId: Type.String({ description: 'The ID of the failed task to replay' })
                })}
                execute={async (_toolCallId, params) => {
                    try {
                        const replayed = scheduler.replayFailure(params.taskId);
                        if (replayed) {
                            return {
                                content: [{ type: 'text', text: `Task "${params.taskId}" has been replayed successfully. It will be executed again.` }],
                                details: { taskId: params.taskId, replayed: true }
                            };
                        } else {
                            return {
                                content: [{ type: 'text', text: `Failed to replay task "${params.taskId}". The task may not have a retryable definition or is already running.` }],
                                details: { taskId: params.taskId, replayed: false }
                            };
                        }
                    } catch (error) {
                        const errorMessage = error instanceof Error ? error.message : String(error);
                        return {
                            content: [{ type: 'text', text: `Failed to replay task: ${errorMessage}` }],
                            details: null
                        };
                    }
                }}
            />

            <Tool
                name='clearFailures'
                label='Clear Failure Records'
                description="Clear failure records. Can clear a specific task's records or all records if no taskId is provided."
                parameters={Type.Object({
                    taskId: Type.Optional(Type.String({ description: 'The ID of the task whose failure records to clear. If not provided, all failure records will be cleared.' }))
                })}
                execute={async (_toolCallId, params) => {
                    try {
                        const count = scheduler.clearFailures(params.taskId);
                        if (params.taskId) {
                            return {
                                content: [{ type: 'text', text: `Cleared ${count} failure record(s) for task "${params.taskId}".` }],
                                details: { taskId: params.taskId, clearedCount: count, clearedAll: false }
                            };
                        } else {
                            return {
                                content: [{ type: 'text', text: `Cleared all ${count} failure record(s).` }],
                                details: { taskId: '', clearedCount: count, clearedAll: true }
                            };
                        }
                    } catch (error) {
                        const errorMessage = error instanceof Error ? error.message : String(error);
                        return {
                            content: [{ type: 'text', text: `Failed to clear failure records: ${errorMessage}` }],
                            details: null
                        };
                    }
                }}
            />
        </Context>
    );
};
