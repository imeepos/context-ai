import { Type, type Static } from "@sinclair/typebox";
import type { Action, Token } from "../tokens.js";
import type { Injector } from "@context-ai/core";
import { readdir } from "node:fs/promises";
import { resolve, join, basename } from "node:path";
import { FILE_READ_PERMISSION } from "./file-read.action.js";

// ============================================================================
// File Find Action - 请求/响应 Schema 定义
// ============================================================================

/**
 * 文件查找请求 Schema
 */
export const FileFindRequestSchema = Type.Object({
	/** 搜索的根目录路径（支持相对路径和绝对路径） */
	path: Type.String({ description: "The root directory path to search from" }),
	/** 文件名包含的字符串（用于过滤匹配的文件） */
	nameContains: Type.String({ description: "String that the filename must contain" }),
});

/** 文件查找请求 TypeScript 类型 */
export type FileFindRequest = Static<typeof FileFindRequestSchema>;

/**
 * 文件查找响应 Schema
 */
export const FileFindResponseSchema = Type.Object({
	/** 匹配的文件完整路径列表 */
	paths: Type.Array(Type.String(), { description: "List of full paths to matching files" }),
});

/** 文件查找响应 TypeScript 类型 */
export type FileFindResponse = Static<typeof FileFindResponseSchema>;

// ============================================================================
// File Find Action - Token 定义
// ============================================================================

/**
 * 文件查找令牌
 *
 * 唯一标识文件查找能力，用于 Action 类型识别和依赖注入。
 */
export const FILE_FIND_TOKEN: Token<typeof FileFindRequestSchema, typeof FileFindResponseSchema> = "file.find";

// ============================================================================
// File Find Action - Action 定义
// ============================================================================

/**
 * 文件查找 Action
 *
 * 核心能力：递归搜索目录树，查找文件名包含指定字符串的所有文件。
 *
 * 参考自 packages/os/src/file-service/index.ts 中的 FileService.find 方法。
 *
 * 设计要点：
 * - 使用 TypeBox 定义 Schema
 * - 权限控制：需要 file:read 权限
 * - 递归搜索：遍历所有子目录
 * - 路径解析：自动将相对路径转换为绝对路径
 * - 名称匹配：使用简单的字符串包含匹配（不支持正则表达式）
 *
 * 使用方式:
 * const result = await actionExecuter.execute(FILE_FIND_TOKEN, {
 *     path: './src',
 *     nameContains: '.test.ts'
 * });
 * console.log(result.paths); // ['/abs/path/src/utils.test.ts', ...]
 */
export const fileFindAction: Action<typeof FileFindRequestSchema, typeof FileFindResponseSchema> = {
	type: FILE_FIND_TOKEN,
	description: "Recursively find files by name pattern",
	request: FileFindRequestSchema,
	response: FileFindResponseSchema,
	requiredPermissions: [FILE_READ_PERMISSION],
	dependencies: [],
	execute: async (params: FileFindRequest, _injector: Injector): Promise<FileFindResponse> => {
		const root = resolve(params.path);
		const results: string[] = [];

		// 递归访问目录树
		const visit = async (dir: string): Promise<void> => {
			const entries = await readdir(dir, { withFileTypes: true });
			for (const entry of entries) {
				const fullPath = join(dir, entry.name);
				if (entry.isDirectory()) {
					await visit(fullPath);
				} else if (basename(fullPath).includes(params.nameContains)) {
					results.push(fullPath);
				}
			}
		};

		await visit(root);
		return { paths: results };
	},
};
