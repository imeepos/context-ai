import { Type, type Static } from "@sinclair/typebox";
import type { Action, Token } from "../tokens.js";
import type { Injector } from "@context-ai/core";
import { writeFile } from "node:fs/promises";
import type { SnapshotEntry } from "./file-snapshot.action.js";
import { FILE_WRITE_PERMISSION } from "./file-write.action.js";
import { STORE_SERVICE, type StoreService } from "./store-set.action.js";

// ============================================================================
// File Rollback Action - 请求/响应 Schema 定义
// ============================================================================

/**
 * 文件回滚请求 Schema
 */
export const FileRollbackRequestSchema = Type.Object({
	/** 快照唯一标识符（由 file.snapshot 创建） */
	snapshotId: Type.String({ description: "Unique identifier of the snapshot to rollback to" }),
});

/** 文件回滚请求 TypeScript 类型 */
export type FileRollbackRequest = Static<typeof FileRollbackRequestSchema>;

/**
 * 文件回滚响应 Schema
 */
export const FileRollbackResponseSchema = Type.Object({
	/** 操作成功标识 */
	ok: Type.Literal(true, { description: "Operation success indicator" }),
});

/** 文件回滚响应 TypeScript 类型 */
export type FileRollbackResponse = Static<typeof FileRollbackResponseSchema>;

// ============================================================================
// File Rollback Action - Token 定义
// ============================================================================

/**
 * 文件回滚令牌
 *
 * 唯一标识文件回滚能力，用于 Action 类型识别和依赖注入。
 */
export const FILE_ROLLBACK_TOKEN: Token<typeof FileRollbackRequestSchema, typeof FileRollbackResponseSchema> =
	"file.rollback";

/**
 * 快照存储键名常量
 */
const SNAPSHOTS_STORE_KEY = "file.snapshots";

// ============================================================================
// File Rollback Action - Action 定义
// ============================================================================

/**
 * 文件回滚 Action
 *
 * 核心能力：将文件恢复到之前创建的快照状态。
 *
 * 参考自 packages/os/src/file-service/index.ts 中的 FileService.rollback 方法。
 *
 * 设计要点：
 * - 使用 TypeBox 定义 Schema
 * - 权限控制：需要 file:write 权限（写入文件内容）
 * - 快照查找：从持久化存储中查找指定的快照
 * - 错误处理：如果快照不存在，抛出详细错误信息
 * - 配合快照：与 file-snapshot.action.ts 配合使用
 *
 * 使用方式:
 * // 先创建快照
 * await actionExecuter.execute(FILE_SNAPSHOT_TOKEN, {
 *     snapshotId: 'backup-1',
 *     path: './config.json'
 * });
 *
 * // 修改文件...
 *
 * // 回滚到快照
 * await actionExecuter.execute(FILE_ROLLBACK_TOKEN, {
 *     snapshotId: 'backup-1'
 * });
 */
export const fileRollbackAction: Action<typeof FileRollbackRequestSchema, typeof FileRollbackResponseSchema> = {
	type: FILE_ROLLBACK_TOKEN,
	description: "Rollback a file to a previously created snapshot",
	request: FileRollbackRequestSchema,
	response: FileRollbackResponseSchema,
	requiredPermissions: [FILE_WRITE_PERMISSION],
	dependencies: [],
	execute: async (params: FileRollbackRequest, injector: Injector): Promise<FileRollbackResponse> => {
		// 通过 Injector 获取 StoreService 依赖
		const storeService = injector.get<StoreService>(STORE_SERVICE);

		// 获取所有快照
		const snapshots = (storeService.get(SNAPSHOTS_STORE_KEY) as unknown as Record<string, SnapshotEntry>) || {};
		const snapshot = snapshots[params.snapshotId];

		if (!snapshot) {
			const availableIds = Object.keys(snapshots);
			throw new Error(
				`Snapshot not found: ${params.snapshotId}. ` +
				`Available snapshots: ${availableIds.length > 0 ? availableIds.join(', ') : 'none'}`
			);
		}

		await writeFile(snapshot.path, snapshot.content, "utf8");
		return { ok: true };
	},
};
