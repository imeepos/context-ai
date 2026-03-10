import {
    LOOP_REQUEST_TOKEN,
} from "./index.js";
import { ShellSessionStore } from "./core/shell-session.js";
import { bootstrap } from "./bootstrap.js";
import { createSchedulerInjector, type Task, type Workflow } from "./core/scheduler.injector.js";
import { getCliOption } from "./getCliOption.js";


export async function master() {
    const logPattern = getCliOption("log");
    const sessionId = getCliOption("sid") ?? "master";

    const application = await bootstrap(sessionId, logPattern ?? "*");
    const shellSessionStore = application.get(ShellSessionStore);
    const shellEnv = shellSessionStore.getEnv();
    const hasApiKey = Boolean(shellEnv.BOWONG_API_KEY ?? shellEnv.AI_VIDEO_API_KEY ?? shellEnv.API_KEY);
    if (!hasApiKey) {
        throw new Error(
            `Startup validation failed: missing API key in shell session file. ` +
            `Required one of [BOWONG_API_KEY, AI_VIDEO_API_KEY, API_KEY]. ` +
            `sessionId=${sessionId} sessionFile=${shellSessionStore.sessionFile}`,
        );
    }
    const task: Task = {
        id: crypto.randomUUID() as string,
        name: "Create a novel",
        description: "Create a novel based on a prompt.",
        status: "pending",
        token: LOOP_REQUEST_TOKEN,
        params: {
            prompt: "你是一个作家，正在创作《重生之我在异界开挂》。",
        },
        result: undefined,
        output: undefined,
    }

    const workflow: Workflow = {
        id: crypto.randomUUID() as string,
        name: "Create a novel",
        description: "Create a novel based on a prompt.",
        tasks: [task],
        edges: []
    }
    // 一个任务 一个工作流 创世
    const injector = createSchedulerInjector(task.id, workflow, application)


}

master().catch(console.error);
