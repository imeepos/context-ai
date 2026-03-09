import { Type, type Static } from "@sinclair/typebox";
import type { Action, Token } from "../tokens.js";
import type { Injector } from "@context-ai/core";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { FILE_READ_PERMISSION } from "./file-read.action.js";

// ============================================================================
// File Grep Action - 请求/响应 Schema 定义
// ============================================================================

/**
 * 文件内容搜索请求 Schema
 */
export const FileGrepRequestSchema = Type.Object({
	/** 要搜索的文件路径（支持相对路径和绝对路径） */
	path: Type.String({ description: "The file path to search in" }),
	/** 要搜索的字符串模式（简单字符串匹配，不支持正则表达式） */
	pattern: Type.String({ description: "The string pattern to search for" }),
});

/** 文件内容搜索请求 TypeScript 类型 */
export type FileGrepRequest = Static<typeof FileGrepRequestSchema>;

/**
 * 匹配行信息 Schema
 */
export const MatchLineSchema = Type.Object({
	/** 匹配行的行号（从 1 开始） */
	line: Type.Number({ description: "Line number (1-indexed)" }),
	/** 匹配行的完整文本内容 */
	text: Type.String({ description: "Full text content of the matching line" }),
});

/**
 * 文件内容搜索响应 Schema
 */
export const FileGrepResponseSchema = Type.Object({
	/** 匹配的行信息列表 */
	matches: Type.Array(MatchLineSchema, { description: "List of matching lines with line numbers" }),
});

/** 文件内容搜索响应 TypeScript 类型 */
export type FileGrepResponse = Static<typeof FileGrepResponseSchema>;

// ============================================================================
// File Grep Action - Token 定义
// ============================================================================

/**
 * 文件内容搜索令牌
 *
 * 唯一标识文件内容搜索能力，用于 Action 类型识别和依赖注入。
 */
export const FILE_GREP_TOKEN: Token<typeof FileGrepRequestSchema, typeof FileGrepResponseSchema> = "file.grep";

// ============================================================================
// File Grep Action - Action 定义
// ============================================================================

/**
 * 文件内容搜索 Action
 *
 * 核心能力：在文件中搜索包含指定字符串的所有行，返回行号和内容。
 *
 * 参考自 packages/os/src/file-service/index.ts 中的 FileService.grep 方法。
 *
 * 设计要点：
 * - 使用 TypeBox 定义 Schema
 * - 权限控制：需要 file:read 权限
 * - 路径解析：自动将相对路径转换为绝对路径
 * - 简单匹配：使用字符串包含匹配（不支持正则表达式）
 * - 行号从 1 开始：符合常见编辑器的行号约定
 * - 跨平台换行：支持 \n 和 \r\n 两种换行符
 *
 * 使用方式:
 * const result = await actionExecuter.execute(FILE_GREP_TOKEN, {
 *     path: './src/index.ts',
 *     pattern: 'export'
 * });
 * console.log(result.matches); // [{ line: 5, text: 'export const foo = ...' }, ...]
 */
export const fileGrepAction: Action<typeof FileGrepRequestSchema, typeof FileGrepResponseSchema> = {
	type: FILE_GREP_TOKEN,
	description: "Search for lines containing a pattern in a file",
	request: FileGrepRequestSchema,
	response: FileGrepResponseSchema,
	requiredPermissions: [FILE_READ_PERMISSION],
	dependencies: [],
	execute: async (params: FileGrepRequest, _injector: Injector): Promise<FileGrepResponse> => {
		const absolutePath = resolve(params.path);
		const content = await readFile(absolutePath, "utf8");
		const lines = content.split(/\r?\n/);
		const matches: Array<{ line: number; text: string }> = [];

		lines.forEach((lineText, index) => {
			if (lineText.includes(params.pattern)) {
				matches.push({ line: index + 1, text: lineText });
			}
		});

		return { matches };
	},
};
