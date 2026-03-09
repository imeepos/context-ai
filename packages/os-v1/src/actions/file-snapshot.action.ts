import { Type, type Static } from "@sinclair/typebox";
import type { Action, Token } from "../tokens.js";
import type { Injector } from "@context-ai/core";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { FILE_READ_PERMISSION } from "./file-read.action.js";
import { STORE_SERVICE, type StoreService, type StoreValue } from "./store-set.action.js";

// ============================================================================
// File Snapshot Action - 请求/响应 Schema 定义
// ============================================================================

/**
 * 文件快照请求 Schema
 */
export const FileSnapshotRequestSchema = Type.Object({
	/** 快照唯一标识符（用于后续回滚操作） */
	snapshotId: Type.String({ description: "Unique identifier for the snapshot (used for rollback)" }),
	/** 要创建快照的文件路径（支持相对路径和绝对路径） */
	path: Type.String({ description: "The file path to create a snapshot of" }),
});

/** 文件快照请求 TypeScript 类型 */
export type FileSnapshotRequest = Static<typeof FileSnapshotRequestSchema>;

/**
 * 文件快照响应 Schema
 */
export const FileSnapshotResponseSchema = Type.Object({
	/** 操作成功标识 */
	ok: Type.Literal(true, { description: "Operation success indicator" }),
});

/** 文件快照响应 TypeScript 类型 */
export type FileSnapshotResponse = Static<typeof FileSnapshotResponseSchema>;

// ============================================================================
// File Snapshot Action - Token 定义
// ============================================================================

/**
 * 文件快照令牌
 *
 * 唯一标识文件快照能力，用于 Action 类型识别和依赖注入。
 */
export const FILE_SNAPSHOT_TOKEN: Token<typeof FileSnapshotRequestSchema, typeof FileSnapshotResponseSchema> =
	"file.snapshot";

// ============================================================================
// File Snapshot Action - 快照存储
// ============================================================================

/**
 * 快照条目接口
 */
export interface SnapshotEntry {
	/** 文件路径 */
	path: string;
	/** 文件内容 */
	content: string;
}

/**
 * 快照存储键名常量
 */
const SNAPSHOTS_STORE_KEY = "file.snapshots";

// ============================================================================
// File Snapshot Action - Action 定义
// ============================================================================

/**
 * 文件快照 Action
 *
 * 核心能力：创建文件的持久化快照，用于后续回滚操作。
 *
 * 参考自 packages/os/src/file-service/index.ts 中的 FileService.snapshot 方法。
 *
 * 设计要点：
 * - 使用 TypeBox 定义 Schema
 * - 权限控制：需要 file:read 权限（读取文件内容）
 * - 路径解析：自动将相对路径转换为绝对路径
 * - 持久化存储：快照存储在 StoreService 中，进程重启后仍可恢复
 * - 配合回滚：与 file-rollback.action.ts 配合使用
 *
 * 使用方式:
 * // 创建快照
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
export const fileSnapshotAction: Action<typeof FileSnapshotRequestSchema, typeof FileSnapshotResponseSchema> = {
	type: FILE_SNAPSHOT_TOKEN,
	description: "Create a persistent snapshot of a file for later rollback",
	request: FileSnapshotRequestSchema,
	response: FileSnapshotResponseSchema,
	requiredPermissions: [FILE_READ_PERMISSION],
	dependencies: [],
	execute: async (params: FileSnapshotRequest, injector: Injector): Promise<FileSnapshotResponse> => {
		// 通过 Injector 获取 StoreService 依赖
		const storeService = injector.get<StoreService>(STORE_SERVICE);

		// 读取文件内容
		const absolutePath = resolve(params.path);
		const content = await readFile(absolutePath, "utf8");

		// 获取现有快照记录
		const snapshots = (storeService.get(SNAPSHOTS_STORE_KEY) as unknown as Record<string, SnapshotEntry>) || {};

		// 保存新快照
		snapshots[params.snapshotId] = { path: absolutePath, content };
		storeService.set(SNAPSHOTS_STORE_KEY, snapshots as unknown as StoreValue);

		// 持久化到文件
		await storeService.save();

		return { ok: true };
	},
};
