/**
 * Scheduler Persistence
 * 调度器持久化逻辑
 */

import * as fs from "node:fs";
import * as path from "node:path";
import type {
	SchedulerStateSnapshot,
	SchedulerStateStorageAdapter,
	SchedulerPersistedTask,
	SchedulerFailureRecord,
} from "./scheduler-types.js";

/**
 * 默认文件存储适配器
 * 将调度器状态持久化到文件系统
 */
export class FileSchedulerStateAdapter implements SchedulerStateStorageAdapter {
	constructor(private readonly filePath: string) {
		// 确保目录存在
		const dir = path.dirname(filePath);
		if (!fs.existsSync(dir)) {
			fs.mkdirSync(dir, { recursive: true });
		}
	}

	load(): SchedulerStateSnapshot | undefined {
		try {
			if (!fs.existsSync(this.filePath)) {
				return undefined;
			}

			const content = fs.readFileSync(this.filePath, "utf-8");
			const snapshot = JSON.parse(content) as Partial<SchedulerStateSnapshot>;

			if (!Array.isArray(snapshot.tasks) || !Array.isArray(snapshot.failures)) {
				return undefined;
			}

			return {
				tasks: snapshot.tasks as SchedulerPersistedTask[],
				failures: snapshot.failures as SchedulerFailureRecord[],
			};
		} catch (error) {
			console.error(`Failed to load scheduler state from ${this.filePath}:`, error);
			return undefined;
		}
	}

	save(snapshot: SchedulerStateSnapshot): void {
		try {
			const content = JSON.stringify(snapshot, null, 2);
			fs.writeFileSync(this.filePath, content, "utf-8");
		} catch (error) {
			console.error(`Failed to save scheduler state to ${this.filePath}:`, error);
		}
	}
}

/**
 * 通用 store 接口适配器（用于兼容其他存储后端）
 */
export class StoreSchedulerStateAdapter implements SchedulerStateStorageAdapter {
	constructor(
		private readonly store: {
			get(key: string): unknown;
			set(key: string, value: unknown): void;
		},
		private readonly key = "scheduler.state",
	) {}

	load(): SchedulerStateSnapshot | undefined {
		const value = this.store.get(this.key);
		if (!value || typeof value !== "object") return undefined;

		const snapshot = value as Partial<SchedulerStateSnapshot>;
		if (!Array.isArray(snapshot.tasks) || !Array.isArray(snapshot.failures)) {
			return undefined;
		}

		return {
			tasks: snapshot.tasks as SchedulerPersistedTask[],
			failures: snapshot.failures as SchedulerFailureRecord[],
		};
	}

	save(snapshot: SchedulerStateSnapshot): void {
		this.store.set(this.key, snapshot);
	}
}

/**
 * 导出调度器状态为快照
 */
export function exportSchedulerState(
	persistedTasks: Map<string, SchedulerPersistedTask>,
	failures: SchedulerFailureRecord[],
): SchedulerStateSnapshot {
	return {
		tasks: [...persistedTasks.values()].map((task) => ({ ...task })),
		failures: [...failures],
	};
}

/**
 * 内存存储适配器（用于单元测试）
 *
 * 将调度器状态存储在内存中，不依赖文件系统。
 * 提供测试辅助方法用于验证状态。
 */
export class MemorySchedulerStateAdapter implements SchedulerStateStorageAdapter {
	private snapshot: SchedulerStateSnapshot | undefined;

	/**
	 * 创建内存存储适配器
	 *
	 * @param initialSnapshot - 可选的初始状态
	 */
	constructor(initialSnapshot?: SchedulerStateSnapshot) {
		if (initialSnapshot) {
			this.snapshot = {
				tasks: [...initialSnapshot.tasks],
				failures: [...initialSnapshot.failures],
			};
		}
	}

	load(): SchedulerStateSnapshot | undefined {
		if (!this.snapshot) {
			return undefined;
		}
		return {
			tasks: [...this.snapshot.tasks],
			failures: [...this.snapshot.failures],
		};
	}

	save(snapshot: SchedulerStateSnapshot): void {
		this.snapshot = {
			tasks: [...snapshot.tasks],
			failures: [...snapshot.failures],
		};
	}

	/**
	 * 获取当前存储的任务数量
	 */
	getTaskCount(): number {
		return this.snapshot?.tasks.length ?? 0;
	}

	/**
	 * 获取当前存储的失败记录数量
	 */
	getFailureCount(): number {
		return this.snapshot?.failures.length ?? 0;
	}

	/**
	 * 检查是否为空
	 */
	isEmpty(): boolean {
		return !this.snapshot || (this.snapshot.tasks.length === 0 && this.snapshot.failures.length === 0);
	}

	/**
	 * 清空存储
	 */
	clear(): void {
		this.snapshot = undefined;
	}

	/**
	 * 获取当前快照的副本
	 */
	getSnapshot(): SchedulerStateSnapshot | undefined {
		return this.snapshot ? {
			tasks: [...this.snapshot.tasks],
			failures: [...this.snapshot.failures],
		} : undefined;
	}
}
