import { Type, type Static } from '@sinclair/typebox';
import type { ComponentFactory } from '../../tokens.js';
import type { Injector } from '@context-ai/core';
import * as jsx from '@context-ai/ctp';
import { Context, Text, Data, Group, Tool } from '@context-ai/ctp';
import { SCHEDULER_SERVICE, ACTION_EXECUTER } from '../../tokens.js';
import { SchedulerService } from '../../core/scheduler.js';

export const ListPropsSchema = Type.Object({
    type: Type.Optional(Type.Union([
        Type.Literal('once', { description: 'One-time scheduled tasks' }),
        Type.Literal('interval', { description: 'Interval-based recurring tasks' }),
        Type.Literal('cron', { description: 'Cron expression based tasks' })
    ], { description: 'Filter by task type' }))
});

export type ListProps = Static<typeof ListPropsSchema>;

export const ListFactory: ComponentFactory<ListProps> = async (props: ListProps, injector: Injector) => {
    const scheduler = injector.get(SCHEDULER_SERVICE) ?? injector.get(SchedulerService);
    const actionExecuter = injector.get(ACTION_EXECUTER);

    if (!scheduler) {
        return (
            <Context
                name="Scheduler Manager"
                description="Manage scheduled tasks"
            >
                <Group title="Error">
                    <Text>SchedulerService not available. Please check system configuration.</Text>
                </Group>
            </Context>
        );
    }

    const state = scheduler.exportState();
    const tasks = props.type
        ? state.tasks.filter(task => task.type === props.type)
        : state.tasks;

    const tableData = tasks.map(task => ({
        id: task.id,
        type: task.type,
        actionToken: task.actionToken,
        nextRunAt: task.nextRunAt ?? task.runAt ?? '-',
        status: 'active'
    }));

    return (
        <Context
            name="Scheduler Manager"
            description="Manage scheduled tasks in the system"
        >
            <Group title="Role Definition">
                <Text>You are a scheduled task management assistant.</Text>
                <Text>Help users view, create, and cancel scheduled tasks.</Text>
                <Text>Task types include: once (one-time), interval (recurring), and cron (expression-based).</Text>
                <Text>IMPORTANT: After using tools, you MUST provide a clear, helpful response to the user based on the tool results.</Text>
            </Group>

            <Group title="Active Tasks">
                {tableData.length > 0 ? (
                    <Data
                        source={tableData}
                        format="table"
                        fields={['id', 'type', 'actionToken', 'nextRunAt', 'status']}
                        title={`Scheduled Tasks (${tableData.length})`}
                    />
                ) : (
                    <Text>No scheduled tasks found{props.type ? ` of type "${props.type}"` : ''}.</Text>
                )}
            </Group>

            {props.type && (
                <Group title="Filter Applied">
                    <Text>Filtered by type: {props.type}</Text>
                </Group>
            )}

            <Tool
                name='createTask'
                label='Create Scheduled Task'
                description='Create a new scheduled task. Choose task type and provide required parameters.'
                parameters={Type.Object({
                    id: Type.String({ description: 'Unique task identifier' }),
                    type: Type.Union([
                        Type.Literal('once'),
                        Type.Literal('interval'),
                        Type.Literal('cron')
                    ], { description: 'Task type: once, interval, or cron' }),
                    topic: Type.String({ description: 'Event topic to publish when task executes' }),
                    payload: Type.Optional(Type.String({ description: 'Optional JSON payload to send with the event' })),
                    delayMs: Type.Optional(Type.Number({ description: 'Delay in milliseconds (required for "once" type)' })),
                    intervalMs: Type.Optional(Type.Number({ description: 'Interval in milliseconds (required for "interval" type)' })),
                    maxRuns: Type.Optional(Type.Number({ description: 'Maximum number of runs (optional for "interval" type)' })),
                    cronExpression: Type.Optional(Type.String({ description: 'Cron expression (required for "cron" type), e.g., "0 0 * * *" for daily at midnight' })),
                    timezone: Type.Optional(Type.String({ description: 'Timezone for cron tasks (optional), e.g., "UTC", "Asia/Shanghai"' }))
                })}
                execute={async (_toolCallId, params) => {
                    try {
                        const parsedPayload = params.payload ? JSON.parse(params.payload) : undefined;

                        switch (params.type) {
                            case 'once':
                                if (!params.delayMs) {
                                    return {
                                        content: [{ type: 'text', text: 'Error: delayMs is required for "once" type tasks' }],
                                        details: null
                                    };
                                }
                                scheduler.scheduleOnceAction(params.id, params.delayMs, params.topic, parsedPayload, injector, actionExecuter);
                                break;

                            case 'interval':
                                if (!params.intervalMs) {
                                    return {
                                        content: [{ type: 'text', text: 'Error: intervalMs is required for "interval" type tasks' }],
                                        details: null
                                    };
                                }
                                scheduler.scheduleIntervalAction(
                                    params.id,
                                    params.intervalMs,
                                    params.topic,
                                    parsedPayload,
                                    injector,
                                    actionExecuter,
                                    params.maxRuns ? { maxRuns: params.maxRuns } : undefined
                                );
                                break;

                            case 'cron':
                                if (!params.cronExpression) {
                                    return {
                                        content: [{ type: 'text', text: 'Error: cronExpression is required for "cron" type tasks' }],
                                        details: null
                                    };
                                }
                                scheduler.scheduleCronAction(
                                    params.id,
                                    params.cronExpression,
                                    params.topic,
                                    parsedPayload,
                                    injector,
                                    actionExecuter,
                                    params.timezone
                                );
                                break;
                        }

                        return {
                            content: [{ type: 'text', text: `Task "${params.id}" created successfully as ${params.type} type.` }],
                            details: { taskId: params.id, type: params.type }
                        };
                    } catch (error) {
                        const errorMessage = error instanceof Error ? error.message : String(error);
                        return {
                            content: [{ type: 'text', text: `Failed to create task: ${errorMessage}` }],
                            details: null
                        };
                    }
                }}
            />

            <Tool
                name='cancelTask'
                label='Cancel Scheduled Task'
                description='Cancel an existing scheduled task by its ID.'
                parameters={Type.Object({
                    taskId: Type.String({ description: 'The ID of the task to cancel' })
                })}
                execute={async (_toolCallId, params) => {
                    try {
                        const cancelled = scheduler.cancel(params.taskId);
                        if (cancelled) {
                            return {
                                content: [{ type: 'text', text: `Task "${params.taskId}" has been cancelled successfully.` }],
                                details: { taskId: params.taskId, cancelled: true }
                            };
                        } else {
                            return {
                                content: [{ type: 'text', text: `Task "${params.taskId}" not found or already completed.` }],
                                details: { taskId: params.taskId, cancelled: false }
                            };
                        }
                    } catch (error) {
                        const errorMessage = error instanceof Error ? error.message : String(error);
                        return {
                            content: [{ type: 'text', text: `Failed to cancel task: ${errorMessage}` }],
                            details: null
                        };
                    }
                }}
            />
        </Context>
    );
};
