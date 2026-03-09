import { createApplicationInjector, createFeatureInjector } from "@context-ai/core"
import { ACTION_EXECUTER, APPLICATION_LOADER, os, PAGES, SESSION_ID, SHELL_EXECUTE_TOKEN, SHELL_SESSION_DIR, SHELL_SESSION_FILE, USER_PERMISSIONS, USER_PROMPT } from "./index.js"
import { join } from "path";
import { ShellSessionStore } from "./core/shell-session.js";
import { createPageFactory } from "./createPageFactory.js";


export async function bootstrap(sessionId: string) {
    /**
     * step1 操作系统启动
     */
    await os.init();
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
        {
            provide: SHELL_SESSION_FILE,
            useFactory: (root: string) => {
                return join(root, `${sessionId}.json`)
            },
            deps: [SHELL_SESSION_DIR]
        },
        // services
        { provide: ShellSessionStore, useFactory: (sessionFile: string) => new ShellSessionStore(sessionFile), deps: [] },
        // 用户权限注册（开发环境默认权限）
        {
            provide: USER_PERMISSIONS,
            useValue: ['shell:exec'] // 生产环境应从配置或认证系统获取
        },
        ...providers,
        ...pages.map(page => createPageFactory(page)),

    ])
    await application.init();
    /**
     * 运行时
     */
    const prompt = `帮我查询一下定时任务列表`
    const featureInjector = createFeatureInjector([
        { provide: USER_PROMPT, useValue: prompt },
        { provide: SESSION_ID, useValue: crypto.randomUUID() },
        { provide: PAGES, useFactory: () => { }, deps: [] }
    ], application)
    const actionExecuter = os.get(ACTION_EXECUTER);
    const result = await actionExecuter.execute(
        SHELL_EXECUTE_TOKEN,
        { command: 'ls' },
        featureInjector
    );
    console.log(result);
}

bootstrap('test').catch(console.error)