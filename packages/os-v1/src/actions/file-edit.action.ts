import { Type, type Static } from "@sinclair/typebox";
import type { Action, Token } from "../tokens.js";
import type { Injector } from "@context-ai/core";
import { readFile, writeFile, rename } from "node:fs/promises";
import { resolve, dirname, join } from "node:path";
import { FILE_WRITE_PERMISSION } from "./file-write.action.js";

// ============================================================================
// File Edit Action - 请求/响应 Schema 定义
// ============================================================================

/**
 * 文件编辑请求 Schema
 */
export const FileEditRequestSchema = Type.Object({
	/** 要编辑的文件路径（支持相对路径和绝对路径） */
	path: Type.String({ description: "The file path to edit" }),
	/** 要查找的字符串（将被替换的内容） */
	search: Type.String({ description: "The string to search for (will be replaced)" }),
	/** 替换后的字符串（替换 search 的内容） */
	replace: Type.String({ description: "The string to replace with" }),
});

/** 文件编辑请求 TypeScript 类型 */
export type FileEditRequest = Static<typeof FileEditRequestSchema>;

/**
 * 文件编辑响应 Schema
 */
export const FileEditResponseSchema = Type.Object({
	/** 是否发生了实际修改（如果文件中不包含 search 字符串则为 false） */
	changed: Type.Boolean({ description: "Whether any changes were made (false if search string not found)" }),
});

/** 文件编辑响应 TypeScript 类型 */
export type FileEditResponse = Static<typeof FileEditResponseSchema>;

// ============================================================================
// File Edit Action - Token 定义
// ============================================================================

/**
 * 文件编辑令牌
 *
 * 唯一标识文件编辑能力，用于 Action 类型识别和依赖注入。
 */
export const FILE_EDIT_TOKEN: Token<typeof FileEditRequestSchema, typeof FileEditResponseSchema> = "file.edit";

// ============================================================================
// File Edit Action - 辅助函数
// ============================================================================

/**
 * 原子写入函数
 *
 * 通过临时文件 + rename 实现原子写入，避免写入过程中断导致文件损坏。
 *
 * @param path - 目标文件路径
 * @param content - 文件内容
 */
async function atomicWrite(path: string, content: string): Promise<void> {
	const tmpPath = join(dirname(path), `.${Date.now()}-${Math.random().toString(36).slice(2)}.tmp`);
	await writeFile(tmpPath, content, "utf8");
	await rename(tmpPath, path);
}

// ============================================================================
// File Edit Action - Action 定义
// ============================================================================

/**
 * 文件编辑 Action
 *
 * 核心能力：在文件中查找并替换所有匹配的字符串。
 *
 * 参考自 packages/os/src/file-service/index.ts 中的 FileService.edit 方法。
 *
 * 设计要点：
 * - 使用 TypeBox 定义 Schema
 * - 权限控制：需要 file:write 权限
 * - 路径解析：自动将相对路径转换为绝对路径
 * - 全局替换：使用 replaceAll 替换所有匹配项
 * - 原子写入：使用临时文件 + rename 保证原子性
 * - 变更检测：如果文件中不包含 search 字符串，返回 changed: false 且不修改文件
 *
 * 使用方式:
 * const result = await actionExecuter.execute(FILE_EDIT_TOKEN, {
 *     path: './config.ts',
 *     search: 'oldValue',
 *     replace: 'newValue'
 * });
 * console.log(result.changed); // true if replacements were made
 */
export const fileEditAction: Action<typeof FileEditRequestSchema, typeof FileEditResponseSchema> = {
	type: FILE_EDIT_TOKEN,
	description: "Find and replace all occurrences of a string in a file",
	request: FileEditRequestSchema,
	response: FileEditResponseSchema,
	requiredPermissions: [FILE_WRITE_PERMISSION],
	dependencies: [],
	execute: async (params: FileEditRequest, _injector: Injector): Promise<FileEditResponse> => {
		const absolutePath = resolve(params.path);
		const content = await readFile(absolutePath, "utf8");

		// 检查是否包含要查找的字符串
		if (!content.includes(params.search)) {
			return { changed: false };
		}

		// 执行全局替换
		const newContent = content.replaceAll(params.search, params.replace);
		await atomicWrite(absolutePath, newContent);

		return { changed: true };
	},
};
