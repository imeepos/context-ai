import { Type, type Static } from "@sinclair/typebox";
import type { Action, Token } from "../tokens.js";
import type { Injector } from "@context-ai/core";
import { APP_WRITE_PERMISSION, APP_READ_PERMISSION, getAppConfig } from "./app-common.js";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { readFile } from "node:fs/promises";

// ============================================================================
// App Publish Action - 请求/响应 Schema 定义
// ============================================================================

/**
 * 应用发布请求 Schema
 */
export const AppPublishRequestSchema = Type.Object({
    /** 应用路径（工作区内的相对路径或绝对路径） */
    appPath: Type.String({ description: "Path to the application to publish" }),
    /** 目标注册表 URL（可选，默认使用配置中的 URL） */
    registryUrl: Type.Optional(Type.String({ description: "Target registry URL (overrides config)" })),
    /** 发布访问级别 */
    access: Type.Optional(Type.Union([
        Type.Literal("public"),
        Type.Literal("restricted"),
    ], { description: "Access level for the published package (default: public)" })),
    /** 是否打标签（如 beta, next) */
    tag: Type.Optional(Type.String({ description: "Dist-tag for the publish (e.g., beta, next)" })),
    /** 是否进行干运行（不实际发布） */
    dryRun: Type.Optional(Type.Boolean({ description: "Perform a dry run without actually publishing" })),
});
/** 应用发布请求 TypeScript 类型 */
export type AppPublishRequest = Static<typeof AppPublishRequestSchema>;

/**
 * 应用发布响应 Schema
 */
export const AppPublishResponseSchema = Type.Object({
    /** 操作是否成功 */
    success: Type.Boolean({ description: "Whether the publish completed successfully" }),
    /** 发布的包名 */
    packageName: Type.Optional(Type.String({ description: "Name of the published package" })),
    /** 发布的版本 */
    publishedVersion: Type.Optional(Type.String({ description: "Version that was published" })),
    /** 发布 URL */
    publishUrl: Type.Optional(Type.String({ description: "URL to the published package" })),
    /** 错误信息（如果发布失败） */
    error: Type.Optional(Type.String({ description: "Error message if publish failed" })),
});
/** 应用发布响应 TypeScript 类型 */
export type AppPublishResponse = Static<typeof AppPublishResponseSchema>;

// ============================================================================
// App Publish Action - Token 定义
// ============================================================================

/**
 * 应用发布令牌
 */
export const APP_PUBLISH_TOKEN: Token<typeof AppPublishRequestSchema, typeof AppPublishResponseSchema> = "app.publish";

// ============================================================================
// App Publish Action - Action 定义
// ============================================================================

/**
 * 应用发布 Action
 *
 * 核心能力：将应用程序发布到注册表。
 *
 * 设计要点:
 * - 使用 TypeBox 定义 Schema
 * - 权限控制:需要 app:write 和 app:read 权限
 * - 注册表 URL 从配置获取，可被参数覆盖
 * - 支持干运行模式
 */
export const appPublishAction: Action<typeof AppPublishRequestSchema, typeof AppPublishResponseSchema> = {
    type: APP_PUBLISH_TOKEN,
    description: "Publish an application to the registry",
    request: AppPublishRequestSchema,
    response: AppPublishResponseSchema,
    requiredPermissions: [APP_WRITE_PERMISSION, APP_READ_PERMISSION],
    dependencies: [],
    execute: async (params: AppPublishRequest, injector: Injector): Promise<AppPublishResponse> => {
        const access = params.access ?? "public";
        const dryRun = params.dryRun ?? false;

        try {
            // 获取应用配置
            const config = await getAppConfig(injector);
            const registryUrl = params.registryUrl ?? config.registryUrl;

            // 解析应用路径
            const absoluteAppPath = resolve(params.appPath);
            const packageJsonPath = resolve(absoluteAppPath, "package.json");

            // 验证 package.json 存在
            if (!existsSync(packageJsonPath)) {
                return {
                    success: false,
                    error: `package.json not found at ${absoluteAppPath}`,
                };
            }

            // 读取 package.json
            const packageJsonRaw = await readFile(packageJsonPath, "utf8");
            const packageJson = JSON.parse(packageJsonRaw) as { name?: string; version?: string };

            if (!packageJson.name || !packageJson.version) {
                return {
                    success: false,
                    error: "package.json must contain 'name' and 'version' fields",
                };
            }

            // 干运行模式：只验证，不实际发布
            if (dryRun) {
                return {
                    success: true,
                    packageName: packageJson.name,
                    publishedVersion: packageJson.version,
                    publishUrl: `${registryUrl}/${packageJson.name}`,
                };
            }

            // 通过 fetch 发送发布请求
            const publishEndpoint = `${registryUrl}/api/v1/packages`;

            const response = await fetch(publishEndpoint, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    name: packageJson.name,
                    version: packageJson.version,
                    access,
                    tag: params.tag,
                    packageJson: packageJsonRaw,
                }),
            });

            if (response.ok) {
                return {
                    success: true,
                    packageName: packageJson.name,
                    publishedVersion: packageJson.version,
                    publishUrl: `${registryUrl}/${packageJson.name}@${packageJson.version}`,
                };
            } else {
                const errorBody = await response.text();
                return {
                    success: false,
                    error: `Publish failed with status ${response.status}: ${errorBody}`,
                };
            }
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : String(error),
            };
        }
    },
};
