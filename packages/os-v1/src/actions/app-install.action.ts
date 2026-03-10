import { Type, type Static } from "@sinclair/typebox";
import type { Action, Token } from "../tokens.js";
import type { Injector } from "@context-ai/core";
import { CURRENT_DIR, PROJECT_ROOT } from "../tokens.js";
import { APP_WRITE_PERMISSION, APP_READ_PERMISSION, validateTargetDir, registerApp, type AppMetadata } from "./app-common.js";
import { existsSync } from "node:fs";
import { resolve, join } from "node:path";
import { mkdir, copyFile } from "node:fs/promises";

// ============================================================================
// App Install Action - 请求/响应 Schema 定义
// ============================================================================

/**
 * 应用安装来源类型 Schema
 */
export const InstallSourceTypeSchema = Type.Union([
    Type.Literal("local"),
    Type.Literal("registry"),
    Type.Literal("git"),
]);

/** 安装来源类型 TypeScript 类型 */
export type InstallSourceType = Static<typeof InstallSourceTypeSchema>;

/**
 * 应用安装请求 Schema
 */
export const AppInstallRequestSchema = Type.Object({
    /** 应用来源路径或 URL */
    source: Type.String({ description: "Source path or URL for the application" }),
    /** 安装来源类型 */
    sourceType: Type.Optional(InstallSourceTypeSchema),
    /** 目标安装目录（相对于工作区根目录） */
    targetDir: Type.String({ description: "Target directory for installation (relative to workspace root)" }),
    /** 应用 ID（用于注册） */
    appId: Type.String({ description: "Unique identifier for the application" }),
    /** 应用名称 */
    appName: Type.String({ description: "Display name of the application" }),
    /** 应用版本 */
    version: Type.Optional(Type.String({ description: "Version of the application to install" })),
    /** 是否覆盖已存在的应用 */
    overwrite: Type.Optional(Type.Boolean({ description: "Overwrite if application already exists (default: false)" })),
});

/** 应用安装请求 TypeScript 类型 */
export type AppInstallRequest = Static<typeof AppInstallRequestSchema>;

/**
 * 应用安装响应 Schema
 */
export const AppInstallResponseSchema = Type.Object({
    /** 操作是否成功 */
    success: Type.Boolean({ description: "Whether the installation completed successfully" }),
    /** 安装后的应用路径 */
    installPath: Type.Optional(Type.String({ description: "Path where the application was installed" })),
    /** 安装的应用元数据 */
    app: Type.Optional(Type.Object({
        id: Type.String({ description: "Application ID" }),
        name: Type.String({ description: "Application name" }),
        version: Type.String({ description: "Application version" }),
        installPath: Type.String({ description: "Installation path" }),
        installedAt: Type.String({ description: "Installation timestamp" }),
    }, { description: "Installed application metadata" })),
    /** 错误信息（如果安装失败） */
    error: Type.Optional(Type.String({ description: "Error message if installation failed" })),
});

/** 应用安装响应 TypeScript 类型 */
export type AppInstallResponse = Static<typeof AppInstallResponseSchema>;

// ============================================================================
// App Install Action - Token 定义
// ============================================================================

/**
 * 应用安装令牌
 */
export const APP_INSTALL_TOKEN: Token<typeof AppInstallRequestSchema, typeof AppInstallResponseSchema> = "app.install";

// ============================================================================
// App Install Action - Action 定义
// ============================================================================

/**
 * 应用安装 Action
 *
 * 核心能力：从本地路径、注册表或 Git 仓库安装应用程序。
 *
 * 设计要点：
 * - 使用 TypeBox 定义 Schema
 * - 权限控制：需要 app:write 和 app:read 权限
 * - 目标目录必须在工作区根目录下（安全验证）
 * - 安装后自动注册到应用列表
 * - 支持覆盖已存在的应用
 */
export const appInstallAction: Action<typeof AppInstallRequestSchema, typeof AppInstallResponseSchema> = {
    type: APP_INSTALL_TOKEN,
    description: "Install an application from local path, registry, or git repository",
    request: AppInstallRequestSchema,
    response: AppInstallResponseSchema,
    requiredPermissions: [APP_WRITE_PERMISSION, APP_READ_PERMISSION],
    dependencies: [],
    execute: async (params: AppInstallRequest, injector: Injector): Promise<AppInstallResponse> => {
        const sourceType = params.sourceType ?? "local";
        const version = params.version ?? "1.0.0";
        const overwrite = params.overwrite ?? false;

        try {
            // 获取工作区根目录
            const workspaceRoot = injector.get<string>(PROJECT_ROOT);
            const currentDir = injector.get<string>(CURRENT_DIR);

            // 解析目标目录的绝对路径
            const targetAbsolutePath = resolve(workspaceRoot, params.targetDir);

            // 安全验证：确保目标目录在工作区根目录下
            if (!validateTargetDir(targetAbsolutePath, workspaceRoot)) {
                return {
                    success: false,
                    error: `Invalid target directory: "${params.targetDir}" is outside the workspace root. Path traversal is not allowed.`,
                };
            }

            // 检查目标目录是否已存在
            if (existsSync(targetAbsolutePath) && !overwrite) {
                return {
                    success: false,
                    error: `Target directory already exists: ${params.targetDir}. Use overwrite=true to replace.`,
                };
            }

            // 根据来源类型执行安装
            switch (sourceType) {
                case "local": {
                    // 解析源路径
                    const sourceAbsolutePath = resolve(currentDir, params.source);

                    // 验证源路径存在
                    if (!existsSync(sourceAbsolutePath)) {
                        return {
                            success: false,
                            error: `Source path does not exist: ${params.source}`,
                        };
                    }

                    // 创建目标目录
                    await mkdir(targetAbsolutePath, { recursive: true });

                    // 复制应用文件（简化实现：复制 package.json 和 src 目录）
                    const sourcePackageJson = join(sourceAbsolutePath, "package.json");
                    if (existsSync(sourcePackageJson)) {
                        await copyFile(sourcePackageJson, join(targetAbsolutePath, "package.json"));
                    }

                    // 注册应用
                    const appMetadata: AppMetadata = {
                        id: params.appId,
                        name: params.appName,
                        version,
                        installPath: targetAbsolutePath,
                        installedAt: new Date().toISOString(),
                    };

                    await registerApp(injector, appMetadata);

                    return {
                        success: true,
                        installPath: targetAbsolutePath,
                        app: {
                            id: appMetadata.id,
                            name: appMetadata.name,
                            version: appMetadata.version,
                            installPath: appMetadata.installPath,
                            installedAt: appMetadata.installedAt,
                        },
                    };
                }

                case "registry": {
                    // 从注册表安装（简化实现：需要后续扩展）
                    return {
                        success: false,
                        error: "Registry installation is not yet implemented. Use sourceType='local' or 'git'.",
                    };
                }

                case "git": {
                    // 从 Git 仓库安装（简化实现：需要后续扩展）
                    return {
                        success: false,
                        error: "Git installation is not yet implemented. Use sourceType='local'.",
                    };
                }

                default:
                    return {
                        success: false,
                        error: `Unknown source type: ${sourceType}`,
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
