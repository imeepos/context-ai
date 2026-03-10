import { Type, type Static } from '@sinclair/typebox';
import type { ComponentFactory } from '../../tokens.js';
import type { Injector } from '@context-ai/core';
import * as jsx from '@context-ai/ctp';
import { Context, Text, Data, Group } from '@context-ai/ctp';
import { SCHEDULER_SERVICE } from '../../tokens.js';
import { SchedulerService } from '../../core/scheduler.js';

export const DetailPropsSchema = Type.Object({
    taskId: Type.String({ description: 'The unique identifier of the task to query' })
});

export type DetailProps = Static<typeof DetailPropsSchema>;

export const ListFactory: ComponentFactory<DetailProps> = async (props: DetailProps, injector: Injector) => {
    const scheduler = injector.get(SCHEDULER_SERVICE) ?? injector.get(SchedulerService);

    if (!scheduler) {
        return (
            <Context
                name="Task Detail"
                description="View scheduled task details"
            >
                <Group title="Error">
                    <Text>SchedulerService not available. Please check system configuration.</Text>
                </Group>
            </Context>
        );
    }

    const state = scheduler.exportState();
    const task = state.tasks.find(t => t.id === props.taskId);

    if (!task) {
        return (
            <Context
                name="Task Detail"
                description="View scheduled task details"
            >
                <Group title="Error">
                    <Text>Task not found: {props.taskId}</Text>
                    <Text>The task may have been completed, cancelled, or never existed.</Text>
                </Group>
            </Context>
        );
    }

    // Build task detail based on type
    const basicInfo = {
        id: task.id,
        type: task.type,
        actionToken: task.actionToken,
        status: 'active'
    };

    const scheduleInfo: Record<string, unknown> = {};

    switch (task.type) {
        case 'once':
            scheduleInfo.scheduledTime = task.runAt ?? '-';
            break;

        case 'interval':
            scheduleInfo.intervalMs = task.intervalMs ?? '-';
            scheduleInfo.maxRuns = task.maxRuns ?? 'unlimited';
            scheduleInfo.completedRuns = task.runs ?? 0;
            break;

        case 'cron':
            scheduleInfo.cronExpression = task.cronExpression ?? '-';
            scheduleInfo.timezone = task.timezone ?? 'system default';
            scheduleInfo.lastRunAt = task.lastRunAt ?? 'never';
            scheduleInfo.nextRunAt = task.nextRunAt ?? '-';
            break;
    }

    const actionParamsInfo = task.actionParams
        ? (typeof task.actionParams === 'string' ? task.actionParams : JSON.stringify(task.actionParams, null, 2))
        : 'No parameters';

    return (
        <Context
            name="Task Detail"
            description="View detailed information about a scheduled task"
        >
            <Group title="Role Definition">
                <Text>You are a task detail assistant.</Text>
                <Text>Help users understand specific scheduled task configuration and status.</Text>
            </Group>

            <Group title="Basic Information">
                <Data
                    source={[basicInfo]}
                    format="table"
                    fields={['id', 'type', 'actionToken', 'status']}
                    title="Task Basic Info"
                />
            </Group>

            <Group title="Schedule Configuration">
                <Data
                    source={[scheduleInfo]}
                    format="table"
                    fields={Object.keys(scheduleInfo) as (keyof typeof scheduleInfo)[]}
                    title="Schedule Settings"
                />
            </Group>

            <Group title="Action Parameters">
                <Text>{actionParamsInfo}</Text>
            </Group>
        </Context>
    );
};

export const DetailFactory = ListFactory;
