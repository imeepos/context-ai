import { Type, type Static } from "@sinclair/typebox";
import type { Action, Token } from "../tokens.js";
import type { Injector } from "@context-ai/core";
import { readdir } from "node:fs/promises";
import { resolve } from "node:path";
import { FILE_READ_PERMISSION } from "./file-read.action.js";

// ============================================================================
// File List Action - 请求/响应 Schema 定义
// ============================================================================

/**
 * 目录列表请求 Schema
 */
export const FileListRequestSchema = Type.Object({
	/** 要列出的目录路径（支持相对路径和绝对路径） */
	path: Type.String({ description: "The directory path to list" }),
});

/** 目录列表请求 TypeScript 类型 */
export type FileListRequest = Static<typeof FileListRequestSchema>;

/**
 * 目录列表响应 Schema
 */
export const FileListResponseSchema = Type.Object({
	/** 目录中的文件和子目录名称列表 */
	entries: Type.Array(Type.String(), { description: "List of file and directory names in the directory" }),
});

/** 目录列表响应 TypeScript 类型 */
export type FileListResponse = Static<typeof FileListResponseSchema>;

// ============================================================================
// File List Action - Token 定义
// ============================================================================

/**
 * 目录列表令牌
 *
 * 唯一标识目录列表能力，用于 Action 类型识别和依赖注入。
 */
export const FILE_LIST_TOKEN: Token<typeof FileListRequestSchema, typeof FileListResponseSchema> = "file.list";

// ============================================================================
// File List Action - Action 定义
// ============================================================================

/**
 * 目录列表 Action
 *
 * 核心能力：列出指定目录中的所有文件和子目录。
 *
 * 参考自 packages/os/src/file-service/index.ts 中的 FileService.list 方法。
 *
 * 设计要点：
 * - 使用 TypeBox 定义 Schema
 * - 权限控制：需要 file:read 权限
 * - 路径解析：自动将相对路径转换为绝对路径
 * - 返回名称列表：仅返回文件/目录名称，不包含完整路径
 *
 * 使用方式:
 * const result = await actionExecuter.execute(FILE_LIST_TOKEN, {
 *     path: './src'
 * });
 * console.log(result.entries); // ['index.ts', 'utils.ts', 'components']
 */
export const fileListAction: Action<typeof FileListRequestSchema, typeof FileListResponseSchema> = {
	type: FILE_LIST_TOKEN,
	description: "List all files and directories in a directory",
	request: FileListRequestSchema,
	response: FileListResponseSchema,
	requiredPermissions: [FILE_READ_PERMISSION],
	dependencies: [],
	execute: async (params: FileListRequest, _injector: Injector): Promise<FileListResponse> => {
		const absolutePath = resolve(params.path);
		const entries = await readdir(absolutePath);
		return { entries };
	},
};
