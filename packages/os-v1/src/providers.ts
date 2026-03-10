import type { Provider } from "@context-ai/core";
import {
    ACTION_EXECUTER,
    ACTIONS,
    APPLICATION_LOADER,
    CURRENT_DIR,
    LOG_DIR,
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
import { SchedulerService } from "./core/scheduler.js";
import { schedulerScheduleOnceAction } from "./actions/scheduler-schedule-once.action.js";
import { schedulerScheduleIntervalAction } from "./actions/scheduler-schedule-interval.action.js";
import { schedulerScheduleCronAction } from "./actions/scheduler-schedule-cron.action.js";
import { schedulerCancelAction } from "./actions/scheduler-cancel.action.js";
import { schedulerListAction } from "./actions/scheduler-list.action.js";
import { schedulerFailuresClearAction } from "./actions/scheduler-failures-clear.action.js";
import { schedulerFailuresReplayAction } from "./actions/scheduler-failures-replay.action.js";
import { schedulerStateExportAction } from "./actions/scheduler-state-export.action.js";
import { schedulerStateImportAction } from "./actions/scheduler-state-import.action.js";
import { schedulerStatePersistAction } from "./actions/scheduler-state-persist.action.js";
import { schedulerStateRecoverAction } from "./actions/scheduler-state-recover.action.js";
import { EVENT_BUS, SCHEDULER_OPTIONS, SCHEDULER_SERVICE } from "./tokens.js";
import type { SchedulerServiceOptions } from "./tokens.js";
import { FileSchedulerStateAdapter } from "./core/scheduler-persistence.js";
import { EventBusService } from "./core/event-bus.js";
import { ApplicationLoaderLocal } from "./core/ApplicationLoaderLocal.js";
import { ApplicationLoaderSystem } from "./core/ApplicationLoaderSystem.js";
import { LOOP_REQUEST_TOKEN, loopRequestAction } from "./actions/loop.action.js";

export const providers: Provider[] = [
    // 路径常量注册
    { provide: ROOT_DIR, useValue: join(homedir(), '.context-ai') },
    { provide: SHELL_SESSION_DIR, useFactory: (root: string) => join(root, 'shell', 'sessions'), deps: [ROOT_DIR] },
    { provide: SHELL_PID_DIR, useFactory: (root: string) => join(root, 'shell', 'pids'), deps: [ROOT_DIR] },
    { provide: LOG_DIR, useFactory: (root: string) => join(root, 'logs'), deps: [ROOT_DIR] },
    { provide: CURRENT_DIR, useValue: process.cwd() },
    { provide: PROJECT_ROOT, useValue: join(__dirname, '../../../') },
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

    // EventBus 注册（基于 Node.js EventEmitter 的实现）
    {
        provide: EVENT_BUS,
        useClass: EventBusService
    },

    // SchedulerServiceOptions 注册（可选配置）
    {
        provide: SCHEDULER_OPTIONS,
        useFactory: (root: string) => ({
            storage: new FileSchedulerStateAdapter(join(root, 'scheduler', 'state.json')),
            autoPersist: true,
            defaultTimezone: 'UTC'
        } as SchedulerServiceOptions),
        deps: [ROOT_DIR]
    },

    // SchedulerService 注册（单例，通过 DI 注入依赖）
    {
        provide: SchedulerService,
        useClass: SchedulerService
    },
    {
        provide: SCHEDULER_SERVICE,
        useClass: SchedulerService
    },

    // Scheduler Actions 注册
    {
        provide: ACTIONS,
        useValue: schedulerScheduleOnceAction,
        multi: true
    },
    { provide: schedulerScheduleOnceAction.type, useValue: schedulerScheduleOnceAction },
    {
        provide: ACTIONS,
        useValue: schedulerScheduleIntervalAction,
        multi: true
    },
    { provide: schedulerScheduleIntervalAction.type, useValue: schedulerScheduleIntervalAction },
    {
        provide: ACTIONS,
        useValue: schedulerScheduleCronAction,
        multi: true
    },
    { provide: schedulerScheduleCronAction.type, useValue: schedulerScheduleCronAction },
    {
        provide: ACTIONS,
        useValue: schedulerCancelAction,
        multi: true
    },
    { provide: schedulerCancelAction.type, useValue: schedulerCancelAction },
    {
        provide: ACTIONS,
        useValue: schedulerListAction,
        multi: true
    },
    { provide: schedulerListAction.type, useValue: schedulerListAction },
    {
        provide: ACTIONS,
        useValue: schedulerFailuresClearAction,
        multi: true
    },
    { provide: schedulerFailuresClearAction.type, useValue: schedulerFailuresClearAction },
    {
        provide: ACTIONS,
        useValue: schedulerFailuresReplayAction,
        multi: true
    },
    { provide: schedulerFailuresReplayAction.type, useValue: schedulerFailuresReplayAction },
    {
        provide: ACTIONS,
        useValue: schedulerStateExportAction,
        multi: true
    },
    { provide: schedulerStateExportAction.type, useValue: schedulerStateExportAction },
    {
        provide: ACTIONS,
        useValue: schedulerStateImportAction,
        multi: true
    },
    { provide: schedulerStateImportAction.type, useValue: schedulerStateImportAction },
    {
        provide: ACTIONS,
        useValue: schedulerStatePersistAction,
        multi: true
    },
    { provide: schedulerStatePersistAction.type, useValue: schedulerStatePersistAction },
    {
        provide: ACTIONS,
        useValue: schedulerStateRecoverAction,
        multi: true
    },
    { provide: schedulerStateRecoverAction.type, useValue: schedulerStateRecoverAction },

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
    // ActionExecuter 注册
    {
        provide: ACTION_EXECUTER,
        useFactory: (actions) => new ActionExecuterImpl(actions),
        deps: [ACTIONS]
    },
    { provide: LOOP_REQUEST_TOKEN, useValue: loopRequestAction },
    { provide: ACTIONS, useValue: loopRequestAction, multi: true }
]