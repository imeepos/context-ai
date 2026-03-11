import "reflect-metadata";

import { ShellSessionStore } from "./core/shell-session.js";
import { bootstrap } from "./bootstrap.js";
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
}

master().catch(console.error);
