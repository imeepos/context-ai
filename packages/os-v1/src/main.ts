import { createFeatureInjector } from "@context-ai/core"
import { ACTION_EXECUTER, SESSION_ID, LOOP_REQUEST_TOKEN, SESSION_LOGGER } from "./index.js"
import { SessionLogger } from "./core/session-logger.js";
import { EventBusService } from "./core/event-bus.js";
import { SCHEDULER_SCHEDULE_ONCE_TOKEN } from "./actions/scheduler-schedule-once.action.js";
import { SchedulerService } from "./core/scheduler.js";
import { bootstrap } from "./bootstrap.js";

export async function master() {
    try {
        const application = await bootstrap()
        const eventBus = application.get(EventBusService)
        const actionExecuter = application.get(ACTION_EXECUTER);
        const schedulerService = application.get(SchedulerService);
        // 生成任务 ID
        const taskId = crypto.randomUUID();
        const featureInjector = createFeatureInjector([
            { provide: SESSION_ID, useValue: taskId },
            { provide: SESSION_LOGGER, useClass: SessionLogger }
        ], application)
        const logger = featureInjector.get(SESSION_LOGGER);

        // 订阅任务完成事件
        eventBus.subscribe("scheduler.action.succeeded", (payload) => {
            const { taskId: completedTaskId, actionToken, result } = payload as { taskId: string, actionToken: string, result: unknown }
            if (completedTaskId === taskId) {
                console.log('[Action Succeeded]', { taskId, actionToken })
                console.log('Result:', JSON.stringify(result, null, 2).slice(0, 500) + '...')
                logger.info('BOOTSTRAP', 'Session completed successfully');

                // 执行清理工作
                console.log('[Scheduler] Performing cleanup before exit...');
                const activeTasks = schedulerService.list();
                console.log(`[Scheduler] Cancelling ${activeTasks.length} active tasks...`);
                activeTasks.forEach(tid => {
                    schedulerService.cancel(tid);
                });

                // 持久化状态
                const persistResult = schedulerService.persistState();
                console.log(`[Scheduler] State saved: ${persistResult.tasks} tasks, ${persistResult.failures} failures`);

                logger.endSession();
            }
        })

        eventBus.subscribe("scheduler.action.failed", (payload) => {
            const { taskId: failedTaskId, actionToken, error } = payload as { taskId: string, actionToken: string, error: string }
            if (failedTaskId === taskId) {
                console.log('[Action Failed]', { taskId, actionToken, error })
                logger.info('BOOTSTRAP', 'Session completed with error');
                // 执行清理工作
                console.log('[Scheduler] Performing cleanup before exit...');
                const activeTasks = schedulerService.list();
                console.log(`[Scheduler] Cancelling ${activeTasks.length} active tasks...`);
                activeTasks.forEach(tid => {
                    schedulerService.cancel(tid);
                });
                // 持久化状态
                const persistResult = schedulerService.persistState();
                console.log(`[Scheduler] State saved: ${persistResult.tasks} tasks, ${persistResult.failures} failures`);
                logger.endSession();
            }
        })

        // 测试动态路径参数
        const requestParams = { path: 'apps://list', prompt: '有哪些应用，分别是什么应用场景?' };

        const result = await actionExecuter.execute(
            SCHEDULER_SCHEDULE_ONCE_TOKEN,
            {
                id: taskId,
                delayMs: 5000,
                actionToken: LOOP_REQUEST_TOKEN,
                actionParams: requestParams
            },
            featureInjector
        );
        console.log(JSON.stringify(result, null, 2))
    } catch (error) {
        throw error;
    }
}

master().catch(console.error)