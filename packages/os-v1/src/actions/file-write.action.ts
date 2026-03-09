import { Type, type Static } from "@sinclair/typebox";
import type { Action, Token } from "../tokens.js";
import type { Injector } from "@context-ai/core";
import { writeFile, rename } from "node:fs/promises";
import { resolve, dirname, join } from "node:path";

// ============================================================================
// File Write Action - 请求/响应 Schema 定义
// ============================================================================

/**
 * 文件写入请求 Schema
 */
export const FileWriteRequestSchema = Type.Object({
	/** 要写入的文件路径（支持相对路径和绝对路径） */
	path: Type.String({ description: "The file path to write" }),
	/** 要写入的文件内容（UTF-8 编码） */
	content: Type.String({ description: "The content to write in UTF-8 encoding" }),
});

/** 文件写入请求 TypeScript 类型 */
export type FileWriteRequest = Static<typeof FileWriteRequestSchema>;

/**
 * 文件写入响应 Schema
 */
export const FileWriteResponseSchema = Type.Object({
	/** 操作成功标识 */
	ok: Type.Literal(true, { description: "Operation success indicator" }),
});

/** 文件写入响应 TypeScript 类型 */
export type FileWriteResponse = Static<typeof FileWriteResponseSchema>;

// ============================================================================
// File Write Action - Token 定义
// ============================================================================

/**
 * 文件写入令牌
 *
 * 唯一标识文件写入能力，用于 Action 类型识别和依赖注入。
 */
export const FILE_WRITE_TOKEN: Token<typeof FileWriteRequestSchema, typeof FileWriteResponseSchema> = "file.write";

/**
 * 文件写入权限令牌
 *
 * 执行文件写入操作所需的基础权限。
 */
export const FILE_WRITE_PERMISSION: string = "file:write";

// ============================================================================
// File Write Action - 辅助函数
// ============================================================================

/**
 * 原子写入函数
 *
 * 通过临时文件 + rename 实现原子写入，避免写入过程中断导致文件损坏。
 * 参考自 packages/os/src/file-service/transaction.ts
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
// File Write Action - Action 定义
// ============================================================================

/**
 * 文件写入 Action
 *
 * 核心能力：将内容写入指定路径的文件。
 *
 * 参考自 packages/os/src/file-service/index.ts 中的 FileService.write 方法。
 *
 * 设计要点：
 * - 使用 TypeBox 定义 Schema
 * - 权限控制：需要 file:write 权限
 * - 原子写入：使用临时文件 + rename 保证原子性
 * - 路径解析：自动将相对路径转换为绝对路径
 * - UTF-8 编码：统一使用 UTF-8 写入文本文件
 *
 * 使用方式:
 * const result = await actionExecuter.execute(FILE_WRITE_TOKEN, {
 *     path: './output.txt',
 *     content: 'Hello, World!'
 * });
 */
export const fileWriteAction: Action<typeof FileWriteRequestSchema, typeof FileWriteResponseSchema> = {
	type: FILE_WRITE_TOKEN,
	description: "Write content to a file atomically",
	request: FileWriteRequestSchema,
	response: FileWriteResponseSchema,
	requiredPermissions: [FILE_WRITE_PERMISSION],
	dependencies: [],
	execute: async (params: FileWriteRequest, _injector: Injector): Promise<FileWriteResponse> => {
		const absolutePath = resolve(params.path);
		await atomicWrite(absolutePath, params.content);
		return { ok: true };
	},
};
