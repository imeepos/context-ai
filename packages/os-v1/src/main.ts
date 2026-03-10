import { createApplicationInjector, createFeatureInjector } from "@context-ai/core"
import { ACTION_EXECUTER, APPLICATION_LOADER, APPLICATIONS, os, SESSION_ID, SHELL_SESSION_DIR, SHELL_SESSION_FILE, USER_PERMISSIONS, LOOP_REQUEST_TOKEN, SESSION_LOGGER } from "./index.js"
import { join } from "path";
import { ShellSessionStore } from "./core/shell-session.js";
import { createPageFactory } from "./createPageFactory.js";
import { SessionLogger } from "./core/session-logger.js";
import { EventBusService } from "./core/event-bus.js";
import { SCHEDULER_SCHEDULE_ONCE_TOKEN } from "./actions/scheduler-schedule-once.action.js";


export async function bootstrap(shellSessionId: string) {
    /**
     * step1 操作系统启动
     */
    await os.init();

    try {
        /**
         * step2 加载配置 从cli命令中获取 --sessionId
         * step3 加载已安装应用 系统自带应用、用户自定义应用
         * step4 await application.init() 执行初始化
         */
        const appLoaders = os.get(APPLICATION_LOADER)
        const allApplications = await Promise.all(appLoaders.map(loader => loader.load())).then(res => res.flat())

        const providers = allApplications.map(app => {
            return app.providers
        }).flat();
        const pages = allApplications.map(app => app.pages).flat()

        const application = createApplicationInjector([
            // 注册已加载的应用列表
            { provide: APPLICATIONS, useValue: allApplications },
            {
                provide: SHELL_SESSION_FILE,
                useFactory: (root: string) => {
                    return join(root, `${shellSessionId}.json`)
                },
                deps: [SHELL_SESSION_DIR]
            },
            // services
            { provide: ShellSessionStore, useFactory: (sessionFile: string) => new ShellSessionStore(sessionFile), deps: [] },
            // 用户权限注册（开发环境默认权限）
            {
                provide: USER_PERMISSIONS,
                useValue: ['shell:exec', `loop:request`, `scheduler:write`] // 生产环境应从配置或认证系统获取
            },
            ...providers,
            ...pages.map(page => createPageFactory(page)),

        ])
        await application.init();

        const eventBus = application.get(EventBusService)

        /**
         * 运行时 - 使用 SESSION_ID 作为日志文件名
         */
        const featureSessionId = crypto.randomUUID();

        const featureInjector = createFeatureInjector([
            { provide: SESSION_ID, useValue: featureSessionId },
            { provide: SESSION_LOGGER, useClass: SessionLogger },
        ], application)

        // 通过 DI 获取 SessionLogger（自动管理生命周期）
        const logger = featureInjector.get(SESSION_LOGGER);
        const actionExecuter = os.get(ACTION_EXECUTER);
        // 生成任务 ID
        const taskId = crypto.randomUUID();

        // 订阅任务完成事件
        eventBus.subscribe("scheduler.action.succeeded", (payload) => {
            const { taskId: completedTaskId, actionToken, result } = payload as { taskId: string, actionToken: string, result: unknown }
            if (completedTaskId === taskId) {
                console.log('[Action Succeeded]', { taskId, actionToken })
                console.log('Result:', JSON.stringify(result, null, 2).slice(0, 500) + '...')
                logger.info('BOOTSTRAP', 'Session completed successfully');
                logger.endSession();
                process.exit(0)
            }
        })

        eventBus.subscribe("scheduler.action.failed", (payload) => {
            const { taskId: failedTaskId, actionToken, error } = payload as { taskId: string, actionToken: string, error: string }
            if (failedTaskId === taskId) {
                console.log('[Action Failed]', { taskId, actionToken, error })
                logger.info('BOOTSTRAP', 'Session completed with error');
                logger.endSession();
                process.exit(1)
            }
        })

        // 测试动态路径参数
        const requestParams = { path: 'apps://list', prompt: '有哪些应用，分别是什么应用场景?' };
        logger.logRequest(LOOP_REQUEST_TOKEN, requestParams);

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

        logger.logResponse(LOOP_REQUEST_TOKEN, result);

        console.log(`Task ${taskId} scheduled, waiting for execution...`)

        // 保持程序运行直到回调执行
        return new Promise(() => {}) // 永不 resolve，依赖回调中的 process.exit
    } catch (error) {
        throw error;
    }
}

bootstrap('test').catch(console.error)