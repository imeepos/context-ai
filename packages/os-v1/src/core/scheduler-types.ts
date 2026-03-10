/**
 * Scheduler Types
 * 调度器核心类型定义
 */

/**
 * 任务句柄 - 用于停止任务
 */
export interface TaskHandle {
	stop: () => void;
}

/**
 * 调度失败记录
 */
export interface SchedulerFailureRecord {
	/** 任务 ID */
	id: string;
	/** 重试次数 */
	attempt: number;
	/** 错误信息 */
	error: string;
	/** 失败时间戳 (ISO 8601) */
	timestamp: string;
}

/**
 * 可重试任务定义
 */
export interface RetryableTaskDefinition {
	/** 任务执行函数 */
	task: () => Promise<void>;
	/** 重试选项 */
	options: {
		/** 最大重试次数 */
		maxRetries: number;
		/** 退避时间（毫秒） */
		backoffMs: number;
	};
}

/**
 * 持久化任务类型
 */
export type PersistedTaskType = "once" | "interval" | "cron";

/**
 * 持久化任务数据（仅支持 Action 任务）
 */
export interface SchedulerPersistedTask {
	/** 任务 ID */
	id: string;
	/** 任务类型 */
	type: PersistedTaskType;

	// Action 执行相关字段
	/** 要执行的 Action token */
	actionToken: string;
	/** Action 请求参数 */
	actionParams: unknown;

	// 一次性任务字段
	/** 执行时间 (ISO 8601) - 用于 "once" 类型 */
	runAt?: string;

	// 间隔任务字段
	/** 间隔时间（毫秒）- 用于 "interval" 类型 */
	intervalMs?: number;
	/** 最大执行次数 - 用于 "interval" 类型 */
	maxRuns?: number;
	/** 已执行次数 - 用于 "interval" 类型 */
	runs?: number;

	// Cron 任务字段
	/** Cron 表达式 - 用于 "cron" 类型 */
	cronExpression?: string;
	/** 时区 - 用于 "cron" 类型 */
	timezone?: string;
	/** 上次执行时间 (ISO 8601) - 用于 "cron" 类型 */
	lastRunAt?: string;
	/** 下次执行时间 (ISO 8601) - 用于 "cron" 类型 */
	nextRunAt?: string;
}

/**
 * 调度器状态快照
 */
export interface SchedulerStateSnapshot {
	/** 持久化任务列表 */
	tasks: SchedulerPersistedTask[];
	/** 失败记录列表 */
	failures: SchedulerFailureRecord[];
}

/**
 * 调度器存储适配器接口
 */
export interface SchedulerStateStorageAdapter {
	/** 加载状态快照 */
	load(): SchedulerStateSnapshot | undefined;
	/** 保存状态快照 */
	save(snapshot: SchedulerStateSnapshot): void;
}

/**
 * 调度器服务选项
 */
export interface SchedulerServiceOptions {
	/** 存储适配器 */
	storage?: SchedulerStateStorageAdapter;
	/** 是否自动持久化 */
	autoPersist?: boolean;
	/** 默认时区（用于 cron 任务） */
	defaultTimezone?: string;
}

/**
 * 事件总线接口（可选依赖）
 */
export interface EventBus {
	/** 发布事件 */
	publish(topic: string, payload: unknown): void;
}
