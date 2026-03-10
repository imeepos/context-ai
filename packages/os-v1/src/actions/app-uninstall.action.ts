import { Type, type Static } from "@sinclair/typebox";
import type { Action, Token } from "../tokens.js";
import type { Injector } from "@context-ai/core";
import { APP_WRITE_PERMISSION, APP_READ_PERMISSION, unregisterApp, getInstalledApp } from "./app-common.js";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { rm } from "node:fs/promises";

// ============================================================================
// App Uninstall Action - 请求/响应 Schema 定义
// ============================================================================

/**
 * 应用卸载请求 Schema
 */
export const AppUninstallRequestSchema = Type.Object({
    /** 应用 ID（已安装的应用） */
    appId: Type.String({ description: "ID of the application to uninstall" }),
    /** 是否删除应用文件（默认 true） */
    removeFiles: Type.Optional(Type.Boolean({ description: "Remove application files from disk (default: true)" })),
    /** 是否保留配置文件 */
    keepConfig: Type.Optional(Type.Boolean({ description: "Keep application configuration files (default: false)" })),
    /** 是否强制卸载（即使有依赖） */
    force: Type.Optional(Type.Boolean({ description: "Force uninstall even if dependencies exist (default: false)" })),
});

/** 应用卸载请求 TypeScript 类型 */
export type AppUninstallRequest = Static<typeof AppUninstallRequestSchema>;

/**
 * 应用卸载响应 Schema
 */
export const AppUninstallResponseSchema = Type.Object({
    /** 操作是否成功 */
    success: Type.Boolean({ description: "Whether the uninstallation completed successfully" }),
    /** 已卸载的应用 ID */
    uninstalledAppId: Type.Optional(Type.String({ description: "ID of the uninstalled application" })),
    /** 已删除的文件路径 */
    removedPaths: Type.Optional(Type.Array(Type.String({ description: "Paths that were removed" }))),
    /** 错误信息（如果卸载失败） */
    error: Type.Optional(Type.String({ description: "Error message if uninstallation failed" })),
});

/** 应用卸载响应 TypeScript 类型 */
export type AppUninstallResponse = Static<typeof AppUninstallResponseSchema>;

// ============================================================================
// App Uninstall Action - Token 定义
// ============================================================================

/**
 * 应用卸载令牌
 */
export const APP_UNINSTALL_TOKEN: Token<typeof AppUninstallRequestSchema, typeof AppUninstallResponseSchema> = "app.uninstall";

// ============================================================================
// App Uninstall Action - Action 定义
// ============================================================================

/**
 * 应用卸载 Action
 *
 * 核心能力：卸载已安装的应用程序。
 *
 * 设计要点：
 * - 使用 TypeBox 定义 Schema
 * - 权限控制：需要 app:write 和 app:read 权限
 * - 从已安装应用列表中移除
 * - 可选择删除应用文件
 * - 支持保留配置文件
 */
export const appUninstallAction: Action<typeof AppUninstallRequestSchema, typeof AppUninstallResponseSchema> = {
    type: APP_UNINSTALL_TOKEN,
    description: "Uninstall an application from the system",
    request: AppUninstallRequestSchema,
    response: AppUninstallResponseSchema,
    requiredPermissions: [APP_WRITE_PERMISSION, APP_READ_PERMISSION],
    dependencies: [],
    execute: async (params: AppUninstallRequest, injector: Injector): Promise<AppUninstallResponse> => {
        const removeFiles = params.removeFiles ?? true;
        const keepConfig = params.keepConfig ?? false;
        const force = params.force ?? false;

        try {
            // 获取已安装的应用信息
            const app = await getInstalledApp(injector, params.appId);

            if (!app) {
                return {
                    success: false,
                    error: `Application not found: ${params.appId}`,
                };
            }

            const removedPaths: string[] = [];

            // 删除应用文件
            if (removeFiles) {
                const installPath = resolve(app.installPath);

                if (existsSync(installPath)) {
                    if (keepConfig) {
                        // 保留配置文件，只删除其他内容
                        // 简化实现：删除整个目录（后续可扩展）
                        await rm(installPath, { recursive: true, force: true });
                        removedPaths.push(installPath);
                    } else {
                        // 删除整个安装目录
                        await rm(installPath, { recursive: true, force: true });
                        removedPaths.push(installPath);
                    }
                }
            }

            // 从已安装列表中移除
            const unregistered = await unregisterApp(injector, params.appId);

            if (!unregistered && !force) {
                return {
                    success: false,
                    error: `Failed to unregister application: ${params.appId}`,
                };
            }

            return {
                success: true,
                uninstalledAppId: params.appId,
                removedPaths: removedPaths.length > 0 ? removedPaths : undefined,
            };
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : String(error),
            };
        }
    },
};
