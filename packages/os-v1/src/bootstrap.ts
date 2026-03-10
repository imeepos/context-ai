import { createApplicationInjector } from "@context-ai/core"
import { ACTION_EXECUTER, APPLICATION_LOADER, APPLICATIONS, os, SHELL_SESSION_DIR, SHELL_SESSION_FILE, USER_PERMISSIONS, SYSTEM_HEARTBEAT_TOKEN, SHELL_PID_DIR, LOG_DIR, ROOT_DIR } from "./index.js"
import { join } from "path";
import { ShellSessionStore } from "./core/shell-session.js";
import { createPageFactory } from "./createPageFactory.js";
import { SchedulerService } from "./core/scheduler.js";
import { ProcessLock } from "./core/process-lock.js";


export async function bootstrap(shellSessionId: string = 'master') {
    /**
     * step1 操作系统启动
     */
    await os.init();

    // ========================================
    // 进程锁检查 - 防止重复运行
    // ========================================
    const pidDir = os.get(SHELL_PID_DIR);
    const lockFile = join(pidDir, `${shellSessionId}.pid`);
    const processLock = new ProcessLock(lockFile);

    if (!processLock.acquire(shellSessionId)) {
        console.error('[Bootstrap] Failed to acquire process lock. Another instance is running.');
        console.error('[Bootstrap] If you are sure no other instance is running, delete the lock file:');
        console.error(`[Bootstrap]   ${lockFile}`);
        process.exit(1);
    }

    // 注册清理函数
    const releaseLock = () => {
        processLock.release();
    };

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
            { provide: LOG_DIR, useFactory: (root: string) => join(root, shellSessionId, 'logs'), deps: [ROOT_DIR] },
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
                useValue: ['shell:exec', `loop:request`, `scheduler:write`, `system:monitor`] // 生产环境应从配置或认证系统获取
            },
            ...providers,
            ...pages.map(page => createPageFactory(page)),
        ])
        await application.init();

        const schedulerService = application.get(SchedulerService)
        const actionExecuter = os.get(ACTION_EXECUTER);

        // ========================================
        // 系统启动时：从持久化存储恢复调度器状态
        // 使用 application injector 恢复系统级任务（如心跳）
        // ========================================
        const recoverResult = schedulerService.recoverState(application, actionExecuter);
        if (recoverResult.recovered) {
            console.log(`[Scheduler] State recovered: ${recoverResult.restoredTasks} tasks, ${recoverResult.restoredFailures} failures`);
        }

        // ========================================
        // 系统启动时：注册心跳检测任务（每30秒执行一次）
        // 心跳任务是系统级别的，使用 application injector
        // 检查任务是否已存在，避免重复注册
        // ========================================
        const heartbeatTaskId = 'system-heartbeat';
        const existingTaskIds = schedulerService.list();
        const heartbeatExists = existingTaskIds.includes(heartbeatTaskId);

        if (!heartbeatExists) {
            schedulerService.scheduleIntervalAction(
                heartbeatTaskId,
                30000, // 30秒
                SYSTEM_HEARTBEAT_TOKEN,
                { message: 'Periodic system health check' },
                application,
                actionExecuter
            );
            console.log(`[Scheduler] Heartbeat task registered: ${heartbeatTaskId} (every 30s)`);
        } else {
            console.log(`[Scheduler] Heartbeat task already exists: ${heartbeatTaskId}`);
        }
        // ========================================
        // 注册进程退出时的状态保存钩子和资源清理
        // ========================================
        const gracefulShutdown = (signal: string, silent: boolean = false) => {
            if (!silent) {
                console.log(`\n[Scheduler] Received ${signal}, performing cleanup...`);
            }

            // 1. 取消所有活动任务（包括心跳任务）
            const activeTasks = schedulerService.list();
            if (!silent) {
                console.log(`[Scheduler] Cancelling ${activeTasks.length} active tasks...`);
            }
            activeTasks.forEach(taskId => {
                schedulerService.cancel(taskId);
            });
            // 2. 持久化状态
            const persistResult = schedulerService.persistState();
            if (!silent) {
                console.log(`[Scheduler] State saved: ${persistResult.tasks} tasks, ${persistResult.failures} failures`);
            }
            // 4. 释放进程锁
            releaseLock();
            process.exit(0);
        };
        process.on('SIGINT', () => gracefulShutdown('SIGINT', false));
        process.on('SIGTERM', () => gracefulShutdown('SIGTERM', true)); // 静默退出，因为是被新进程强制终止
        process.on('beforeExit', () => {
            releaseLock();
        });
        process.on('uncaughtException', (_err) => {
            releaseLock();
            process.exit(1);
        });
        process.on('unhandledRejection', (_reason, _promise) => {
            releaseLock();
            process.exit(1);
        });
        return application
    } catch (error) {
        throw error;
    }
}
