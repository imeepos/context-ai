import { Type, type Static } from "@sinclair/typebox";
import type { Action, Token } from "../tokens.js";
import type { Injector } from "@context-ai/core";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

// ============================================================================
// File Read Action - 请求/响应 Schema 定义
// ============================================================================

/**
 * 文件读取请求 Schema
 */
export const FileReadRequestSchema = Type.Object({
	/** 要读取的文件路径（支持相对路径和绝对路径） */
	path: Type.String({ description: "The file path to read" }),
});

/** 文件读取请求 TypeScript 类型 */
export type FileReadRequest = Static<typeof FileReadRequestSchema>;

/**
 * 文件读取响应 Schema
 */
export const FileReadResponseSchema = Type.Object({
	/** 文件内容（UTF-8 编码） */
	content: Type.String({ description: "The file content in UTF-8 encoding" }),
});

/** 文件读取响应 TypeScript 类型 */
export type FileReadResponse = Static<typeof FileReadResponseSchema>;

// ============================================================================
// File Read Action - Token 定义
// ============================================================================

/**
 * 文件读取令牌
 *
 * 唯一标识文件读取能力，用于 Action 类型识别和依赖注入。
 */
export const FILE_READ_TOKEN: Token<typeof FileReadRequestSchema, typeof FileReadResponseSchema> = "file.read";

/**
 * 文件读取权限令牌
 *
 * 执行文件读取操作所需的基础权限。
 */
export const FILE_READ_PERMISSION: string = "file:read";

// ============================================================================
// File Read Action - Action 定义
// ============================================================================

/**
 * 文件读取 Action
 *
 * 核心能力：读取指定路径的文件内容。
 *
 * 参考自 packages/os/src/file-service/index.ts 中的 FileService.read 方法。
 *
 * 设计要点：
 * - 使用 TypeBox 定义 Schema
 * - 权限控制：需要 file:read 权限
 * - 路径解析：自动将相对路径转换为绝对路径
 * - UTF-8 编码：统一使用 UTF-8 读取文本文件
 *
 * 使用方式:
 * const result = await actionExecuter.execute(FILE_READ_TOKEN, {
 *     path: './config.json'
 * });
 * console.log(result.content);
 */
export const fileReadAction: Action<typeof FileReadRequestSchema, typeof FileReadResponseSchema> = {
	type: FILE_READ_TOKEN,
	description: "Read the content of a file",
	request: FileReadRequestSchema,
	response: FileReadResponseSchema,
	requiredPermissions: [FILE_READ_PERMISSION],
	dependencies: [],
	execute: async (params: FileReadRequest, _injector: Injector): Promise<FileReadResponse> => {
		const absolutePath = resolve(params.path);
		const content = await readFile(absolutePath, "utf8");
		return { content };
	},
};
