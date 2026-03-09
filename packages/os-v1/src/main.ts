import { createApplicationInjector } from "@context-ai/core"
import { ACTION_EXECUTER, os, SHELL_EXECUTE_TOKEN, SHELL_SESSION_DIR, SHELL_SESSION_FILE } from "./index.js"
import { join } from "path";
import { ShellSessionStore } from "./core/shell-session.js";


export async function bootstrap(sessionName: string) {
    await os.init();
    const platform = createApplicationInjector([
        {
            provide: SHELL_SESSION_FILE,
            useFactory: (root: string) => {
                return join(root, `${sessionName}.json`)
            },
            deps: [SHELL_SESSION_DIR]
        },
        // services
        { provide: ShellSessionStore, useFactory: (sessionFile: string) => new ShellSessionStore(sessionFile), deps: [] },
    ])
    await platform.init();
    const actionExecuter = os.get(ACTION_EXECUTER);
    const result = await actionExecuter.execute(
        SHELL_EXECUTE_TOKEN,
        { command: 'echo "Hello World"' },
        platform
    );
    console.log(result.stdout.trim());
    console.log(result.exitCode);
}


bootstrap('test').catch(console.error)