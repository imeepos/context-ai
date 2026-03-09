import { createApplicationInjector, createFeatureInjector } from "@context-ai/core"
import { ACTION_EXECUTER, APPLICATION_LOADER, APPLICATIONS, os, SESSION_ID, SHELL_SESSION_DIR, SHELL_SESSION_FILE, USER_PERMISSIONS, LOOP_REQUEST_TOKEN, LOG_DIR, SESSION_LOGGER } from "./index.js"
import { join } from "path";
import { ShellSessionStore } from "./core/shell-session.js";
import { createPageFactory } from "./createPageFactory.js";
import { SessionLogger } from "./core/session-logger.js";


export async function bootstrap(shellSessionId: string) {
    /**
     * step1 操作系统启动
     */
    await os.init();

    const logDir = os.get(LOG_DIR);

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
                useValue: ['shell:exec', `loop:request`] // 生产环境应从配置或认证系统获取
            },
            ...providers,
            ...pages.map(page => createPageFactory(page)),

        ])
        await application.init();

        /**
         * 运行时 - 使用 SESSION_ID 作为日志文件名
         */
        const featureSessionId = crypto.randomUUID();
        const logger = new SessionLogger(logDir, featureSessionId);
        logger.info('BOOTSTRAP', `Session started: ${featureSessionId}`);
        logger.info('BOOTSTRAP', `Shell session: ${shellSessionId}`);
        logger.info('BOOTSTRAP', `Log file: ${logger.getLogFilePath()}`);
        logger.info('BOOTSTRAP', `Loaded ${allApplications.length} applications`);
        logger.info('BOOTSTRAP', `Total pages: ${pages.length}`);
        logger.info('BOOTSTRAP', 'Application injector initialized');

        const featureInjector = createFeatureInjector([
            { provide: SESSION_ID, useValue: featureSessionId },
            { provide: SESSION_LOGGER, useValue: logger }
        ], application)

        const actionExecuter = os.get(ACTION_EXECUTER);

        // 测试动态路径参数
        const requestParams = { path: 'apps://list', prompt: 'apps应用有那些页面，分别有什么用途?' };
        logger.logRequest(LOOP_REQUEST_TOKEN, requestParams);

        const result = await actionExecuter.execute(
            LOOP_REQUEST_TOKEN,
            requestParams,
            featureInjector
        );

        logger.logResponse(LOOP_REQUEST_TOKEN, result);

        logger.info('BOOTSTRAP', 'Session completed successfully');
        logger.endSession();

        console.log(result.output)
    } catch (error) {
        throw error;
    }
}

bootstrap('test').catch(console.error)