import "reflect-metadata";

import { ShellSessionStore } from "./core/shell-session.js";
import { bootstrap } from "./bootstrap.js";
import { getCliOption } from "./getCliOption.js";
import { ACTION_EXECUTER } from "./tokens.js";
import { LOOP_REQUEST_TOKEN } from "./actions/loop.action.js";

export async function master() {
    const logPattern = getCliOption("log");
    const sessionId = getCliOption("sid") ?? "cli";
    const prompt = getCliOption("prompt") ?? "";

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
    const actionExecuter = application.get(ACTION_EXECUTER)
    const result = await actionExecuter.execute(LOOP_REQUEST_TOKEN, {
        path: `coding://bugfix`,
        prompt: prompt
    }, application)
    console.log({ result })
}

// 不要捕获错误，让全局错误处理器处理
master();
