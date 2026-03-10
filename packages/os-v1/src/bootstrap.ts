import { createApplicationInjector } from "@context-ai/core"
import { ACTION_EXECUTER, APPLICATION_LOADER, APPLICATIONS, SHELL_SESSION_DIR, SHELL_SESSION_FILE, USER_PERMISSIONS, SHELL_PID_DIR, LOG_DIR, ROOT_DIR, SYSTEM_LOG_FILTER, SYSTEM_LOGGER, os } from "./index.js"
import { join } from "path";
import { existsSync, mkdirSync, writeFileSync } from "fs";
import { ShellSessionStore } from "./core/shell-session.js";
import { createPageFactory } from "./createPageFactory.js";
import { SchedulerService } from "./core/scheduler.js";
import { ProcessLock } from "./core/process-lock.js";
import { SystemLogger, type ISystemLogger } from "./core/system-logger.js";
import { applicationProviders, platformProviders } from './providers.js'

export async function bootstrap(shellSessionId: string = 'master', logFilter: string = "*") {
    await os.init();
    const pidDir = os.get(SHELL_PID_DIR);
    const lockFile = join(pidDir, `${shellSessionId}.pid`);
    const processLock = new ProcessLock(lockFile);

    if (!processLock.acquire(shellSessionId)) {
        console.error('[Bootstrap] Failed to acquire process lock. Another instance is running.');
        console.error('[Bootstrap] If you are sure no other instance is running, delete the lock file:');
        console.error(`[Bootstrap]   ${lockFile}`);
        process.exit(1);
    }

    const releaseLock = () => {
        processLock.release();
    };

    try {
        const appLoaders = os.get(APPLICATION_LOADER)
        const allApplications = await Promise.all(appLoaders.map(loader => loader.load())).then(res => res.flat())

        const providers = allApplications.map(app => {
            return app.providers
        }).flat();
        const pages = allApplications.map(app => app.pages).flat()

        const application = createApplicationInjector([
            ...platformProviders,
            ...applicationProviders,
            { provide: LOG_DIR, useFactory: (root: string) => join(root, shellSessionId, 'logs'), deps: [ROOT_DIR] },
            { provide: SYSTEM_LOG_FILTER, useValue: logFilter },
            { provide: SYSTEM_LOGGER, useClass: SystemLogger },
            { provide: APPLICATIONS, useValue: allApplications },
            {
                provide: SHELL_SESSION_FILE,
                useFactory: (root: string) => {
                    const filePath = join(root, `${shellSessionId}.json`);
                    if (!existsSync(root)) {
                        mkdirSync(root, { recursive: true });
                    }
                    if (!existsSync(filePath)) {
                        writeFileSync(filePath, "{}", { encoding: "utf8" });
                    }
                    return filePath;
                },
                deps: [SHELL_SESSION_DIR]
            },
            { provide: ShellSessionStore, useFactory: (sessionFile: string) => new ShellSessionStore(sessionFile), deps: [SHELL_SESSION_FILE] },
            {
                provide: USER_PERMISSIONS,
                useValue: ['shell:exec', `loop:request`, `scheduler:write`, `system:monitor`, `bowong:model:query`, `bowong:model:invoke`] // 鐢熶骇鐜搴斾粠閰嶇疆鎴栬璇佺郴缁熻幏鍙?
            },
            ...providers,
            ...pages.map(page => createPageFactory(page)),
        ])
        await application.init();
        application.get(SHELL_SESSION_FILE);
        const systemLogger = application.get(SYSTEM_LOGGER) as ISystemLogger;

        const schedulerService = application.get(SchedulerService)
        const actionExecuter = application.get(ACTION_EXECUTER);

        const recoverResult = schedulerService.recoverState(application, actionExecuter);
        if (recoverResult.recovered) {
            systemLogger.log("scheduler:recover", `State recovered: ${recoverResult.restoredTasks} tasks, ${recoverResult.restoredFailures} failures`);
        }

        systemLogger.log("scheduler:heartbeat", "Time-based heartbeat removed. Use DAG workflow dispatch instead.");
        const gracefulShutdown = (signal: string, silent: boolean = false) => {
            if (!silent) {
                systemLogger.log("scheduler:shutdown", `Received ${signal}, performing cleanup`);
            }

            const activeTasks = schedulerService.list();
            if (!silent) {
                systemLogger.log("scheduler:shutdown", `Cancelling ${activeTasks.length} active tasks`);
            }
            activeTasks.forEach(taskId => {
                schedulerService.cancel(taskId);
            });
            const persistResult = schedulerService.persistState();
            if (!silent) {
                systemLogger.log("scheduler:persist", `State saved: ${persistResult.tasks} tasks, ${persistResult.failures} failures`);
            }
            releaseLock();
            process.exit(0);
        };
        process.on('SIGINT', () => gracefulShutdown('SIGINT', false));
        process.on('SIGTERM', () => gracefulShutdown('SIGTERM', true));
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
