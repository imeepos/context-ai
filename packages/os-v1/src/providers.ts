import type { Provider } from "@context-ai/core";
import {
    ACTION_EXECUTER,
    ACTIONS,
    CURRENT_DIR,
    ROOT_DIR,
    SHELL_LOG_DIR,
    SHELL_PID_DIR,
    SHELL_SESSION_DIR,
    USER_PERMISSIONS
} from "./tokens.js";
import { homedir } from "os";
import { join } from "path";
import { ActionExecuterImpl } from "./action-executer.js";
import { shellExecuteAction } from "./actions/shell-execute.action.js";
import { shellEnvSetAction } from "./actions/shell-env-set.action.js";
import { shellEnvListAction } from "./actions/shell-env-list.action.js";
import { shellEnvUnsetAction } from "./actions/shell-env-unset.action.js";

export const providers: Provider[] = [
    // 路径常量注册
    { provide: ROOT_DIR, useValue: join(homedir(), '.context-ai') },
    { provide: SHELL_SESSION_DIR, useFactory: (root: string) => join(root, 'shell', 'sessions'), deps: [ROOT_DIR] },
    { provide: SHELL_PID_DIR, useFactory: (root: string) => join(root, 'shell', 'pids'), deps: [ROOT_DIR] },
    { provide: SHELL_LOG_DIR, useFactory: (root: string) => join(root, 'shell', 'logs'), deps: [ROOT_DIR] },
    { provide: CURRENT_DIR, useValue: process.cwd() },

    // Action 注册
    {
        provide: ACTIONS,
        useValue: shellExecuteAction,
        multi: true
    },
    { provide: shellExecuteAction.type, useValue: shellExecuteAction },
    {
        provide: ACTIONS,
        useValue: shellEnvSetAction,
        multi: true
    },
    { provide: shellEnvSetAction.type, useValue: shellEnvSetAction },
    {
        provide: ACTIONS,
        useValue: shellEnvListAction,
        multi: true
    },
    { provide: shellEnvListAction.type, useValue: shellEnvListAction },
    {
        provide: ACTIONS,
        useValue: shellEnvUnsetAction,
        multi: true
    },
    { provide: shellEnvUnsetAction.type, useValue: shellEnvUnsetAction },
    // ActionExecuter 注册
    {
        provide: ACTION_EXECUTER,
        useFactory: (actions) => new ActionExecuterImpl(actions),
        deps: [ACTIONS]
    },

    // 用户权限注册（开发环境默认权限）
    {
        provide: USER_PERMISSIONS,
        useValue: ['shell:exec'] // 生产环境应从配置或认证系统获取
    }
]