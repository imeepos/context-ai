import type { Provider } from "@context-ai/core";
import {
    ACTION_EXECUTER,
    ACTIONS,
    APPLICATION_LOADER,
    CURRENT_DIR,
    SYSTEM_LOG_FILTER,
    SYSTEM_LOGGER,
    PROJECT_ROOT,
    ROOT_DIR,
    SHELL_PID_DIR,
    SHELL_SESSION_DIR,
} from "./tokens.js";
import { homedir } from "os";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
import { ActionExecuterImpl } from "./action-executer.js";
import { shellExecuteAction } from "./actions/shell-execute.action.js";
import { shellEnvSetAction } from "./actions/shell-env-set.action.js";
import { shellEnvListAction } from "./actions/shell-env-list.action.js";
import { shellEnvUnsetAction } from "./actions/shell-env-unset.action.js";
import { fileReadAction } from "./actions/file-read.action.js";
import { fileWriteAction } from "./actions/file-write.action.js";
import { fileListAction } from "./actions/file-list.action.js";
import { fileFindAction } from "./actions/file-find.action.js";
import { fileGrepAction } from "./actions/file-grep.action.js";
import { fileEditAction } from "./actions/file-edit.action.js";
import { fileSnapshotAction } from "./actions/file-snapshot.action.js";
import { fileRollbackAction } from "./actions/file-rollback.action.js";
import { EVENT_BUS, SCHEDULER_OPTIONS } from "./tokens.js";
import type { SchedulerServiceOptions } from "./tokens.js";
import { FileSchedulerStateAdapter } from "./core/scheduler-persistence.js";
import { EventBusService } from "./core/event-bus.js";
import { SystemLogger } from "./core/system-logger.js";
import { ApplicationLoaderLocal } from "./core/ApplicationLoaderLocal.js";
import { ApplicationLoaderSystem } from "./core/ApplicationLoaderSystem.js";
import { LOOP_REQUEST_TOKEN, loopRequestAction } from "./actions/loop.action.js";
import { systemHeartbeatAction } from "./actions/system-heartbeat.action.js";
import { codexAction } from "./actions/codex.action.js";
import { claudeAction } from "./actions/claude.action.js";

// App Actions
import { appBuildAction } from "./actions/app-build.action.js";
import { appDevAction } from "./actions/app-dev.action.js";
import { appInstallAction } from "./actions/app-install.action.js";
import { appPublishAction } from "./actions/app-publish.action.js";
import { appRunAction } from "./actions/app-run.action.js";
import { appSearchAction } from "./actions/app-search.action.js";
import { appTestAction } from "./actions/app-test.action.js";
import { appUninstallAction } from "./actions/app-uninstall.action.js";
import { appUpgradeAction } from "./actions/app-upgrade.action.js";
import { bowongModelActions } from "./actions/bowong/index.js";
import { TypeormFactory } from "./orm.js";
import { DataSource } from "typeorm";

export const platformProviders: Provider[] = [
    // 路径常量注册
    { provide: ROOT_DIR, useValue: join(homedir(), '.context-ai') },
    { provide: SYSTEM_LOG_FILTER, useValue: process.env.OS_LOG_FILTER ?? "*" },
    { provide: SYSTEM_LOGGER, useClass: SystemLogger },
    { provide: SHELL_SESSION_DIR, useFactory: (root: string) => join(root, 'shell', 'sessions'), deps: [ROOT_DIR] },
    { provide: SHELL_PID_DIR, useFactory: (root: string) => join(root, 'shell', 'pids'), deps: [ROOT_DIR] },
    { provide: CURRENT_DIR, useValue: process.cwd() },
    { provide: PROJECT_ROOT, useValue: join(__dirname, '../../../') },
    {
        provide: SCHEDULER_OPTIONS,
        useFactory: (root: string) => ({
            storage: new FileSchedulerStateAdapter(join(root, 'scheduler', 'state.json')),
            autoPersist: true,
            defaultTimezone: 'UTC'
        } as SchedulerServiceOptions),
        deps: [ROOT_DIR]
    },

    // EventBus 注册（基于 Node.js EventEmitter 的实现)
    {
        provide: EVENT_BUS,
        useClass: EventBusService
    },
    // Application local loader
    {
        provide: APPLICATION_LOADER,
        useFactory: (root: string) => {
            const path = join(root, 'addons')
            return new ApplicationLoaderLocal(path)
        },
        deps: [PROJECT_ROOT],
        multi: true
    },
    // application system loader
    {
        provide: APPLICATION_LOADER,
        useFactory: () => new ApplicationLoaderSystem(),
        deps: [],
        multi: true
    },
    // ActionExecuter 注册（注入 EventBus）
    {
        provide: ACTION_EXECUTER,
        useFactory: (actions, eventBus) => new ActionExecuterImpl(actions, eventBus),
        deps: [ACTIONS, EVENT_BUS]
    },

];

export const applicationProviders: Provider[] = [
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

    // File Actions 注册
    {
        provide: ACTIONS,
        useValue: fileReadAction,
        multi: true
    },
    { provide: fileReadAction.type, useValue: fileReadAction },
    {
        provide: ACTIONS,
        useValue: fileWriteAction,
        multi: true
    },
    { provide: fileWriteAction.type, useValue: fileWriteAction },
    {
        provide: ACTIONS,
        useValue: fileListAction,
        multi: true
    },
    { provide: fileListAction.type, useValue: fileListAction },
    {
        provide: ACTIONS,
        useValue: fileFindAction,
        multi: true
    },
    { provide: fileFindAction.type, useValue: fileFindAction },
    {
        provide: ACTIONS,
        useValue: fileGrepAction,
        multi: true
    },
    { provide: fileGrepAction.type, useValue: fileGrepAction },
    {
        provide: ACTIONS,
        useValue: fileEditAction,
        multi: true
    },
    { provide: fileEditAction.type, useValue: fileEditAction },
    {
        provide: ACTIONS,
        useValue: fileSnapshotAction,
        multi: true
    },
    { provide: fileSnapshotAction.type, useValue: fileSnapshotAction },
    {
        provide: ACTIONS,
        useValue: fileRollbackAction,
        multi: true
    },
    { provide: fileRollbackAction.type, useValue: fileRollbackAction },
    { provide: LOOP_REQUEST_TOKEN, useValue: loopRequestAction },
    { provide: ACTIONS, useValue: loopRequestAction, multi: true },
    // System Heartbeat Action 注册
    {
        provide: ACTIONS,
        useValue: systemHeartbeatAction,
        multi: true
    },
    { provide: systemHeartbeatAction.type, useValue: systemHeartbeatAction },
    // Codex Action 注册
    {
        provide: ACTIONS,
        useValue: codexAction,
        multi: true
    },
    { provide: codexAction.type, useValue: codexAction },
    // Claude Action 注册
    {
        provide: ACTIONS,
        useValue: claudeAction,
        multi: true
    },
    { provide: claudeAction.type, useValue: claudeAction },
    // App Actions 注册
    {
        provide: ACTIONS,
        useValue: appBuildAction,
        multi: true
    },
    { provide: appBuildAction.type, useValue: appBuildAction },
    {
        provide: ACTIONS,
        useValue: appDevAction,
        multi: true
    },
    { provide: appDevAction.type, useValue: appDevAction },
    {
        provide: ACTIONS,
        useValue: appInstallAction,
        multi: true
    },
    { provide: appInstallAction.type, useValue: appInstallAction },
    {
        provide: ACTIONS,
        useValue: appPublishAction,
        multi: true
    },
    { provide: appPublishAction.type, useValue: appPublishAction },
    {
        provide: ACTIONS,
        useValue: appRunAction,
        multi: true
    },
    { provide: appRunAction.type, useValue: appRunAction },
    {
        provide: ACTIONS,
        useValue: appSearchAction,
        multi: true
    },
    { provide: appSearchAction.type, useValue: appSearchAction },
    {
        provide: ACTIONS,
        useValue: appTestAction,
        multi: true
    },
    { provide: appTestAction.type, useValue: appTestAction },
    {
        provide: ACTIONS,
        useValue: appUninstallAction,
        multi: true
    },
    { provide: appUninstallAction.type, useValue: appUninstallAction },
    {
        provide: ACTIONS,
        useValue: appUpgradeAction,
        multi: true
    },
    { provide: appUpgradeAction.type, useValue: appUpgradeAction },
    // Bowong model actions
    ...bowongModelActions.flatMap((action) => ([
        { provide: ACTIONS, useValue: action, multi: true },
        { provide: action.type, useValue: action },
    ])),
    { provide: TypeormFactory, useClass: TypeormFactory },
    { provide: DataSource, useFactory: (factory: TypeormFactory) => factory.create(), deps: [TypeormFactory] }
]
