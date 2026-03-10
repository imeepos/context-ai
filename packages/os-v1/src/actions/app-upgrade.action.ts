import { Type, type Static } from "@sinclair/typebox";
import type { Action, Token } from "../tokens.js";
import type { Injector } from "@context-ai/core";
import { CURRENT_DIR } from "../tokens.js";
import { APP_WRITE_PERMISSION, APP_READ_PERMISSION, getAppConfig, getInstalledApp, registerApp, type AppMetadata } from "./app-common.js";
import { resolve } from "node:path";
import { readFile, writeFile } from "node:fs/promises";

// ============================================================================
// App Upgrade Action - 请求/响应 Schema 定义
// ============================================================================

/**
 * 升级来源 Schema
 */
export const UpgradeSourceSchema = Type.Union([
    Type.Literal("registry"),
    Type.Literal("local"),
]);

/** 升级来源 TypeScript 类型 */
export type UpgradeSource = Static<typeof UpgradeSourceSchema>;

/**
 * 应用升级请求 Schema
 */
export const AppUpgradeRequestSchema = Type.Object({
    /** 应用 ID（已安装的应用） */
    appId: Type.String({ description: "ID of the application to upgrade" }),
    /** 目标版本（可选，默认升级到最新版本） */
    targetVersion: Type.Optional(Type.String({ description: "Target version to upgrade to (default: latest)" })),
    /** 升级来源 */
    source: Type.Optional(UpgradeSourceSchema),
    /** 本地升级时的源路径 */
    localSourcePath: Type.Optional(Type.String({ description: "Local source path for upgrade (required if source='local')" })),
    /** 是否创建备份（默认 true） */
    createBackup: Type.Optional(Type.Boolean({ description: "Create backup before upgrade (default: true)" })),
    /** 备份 ID（用于后续回滚） */
    backupId: Type.Optional(Type.String({ description: "Backup identifier for rollback" })),
    /** 是否跳过依赖检查 */
    skipDependencyCheck: Type.Optional(Type.Boolean({ description: "Skip dependency compatibility check (default: false)" })),
});

/** 应用升级请求 TypeScript 类型 */
export type AppUpgradeRequest = Static<typeof AppUpgradeRequestSchema>;

/**
 * 应用升级响应 Schema
 */
export const AppUpgradeResponseSchema = Type.Object({
    /** 操作是否成功 */
    success: Type.Boolean({ description: "Whether the upgrade completed successfully" }),
    /** 升级前的版本 */
    previousVersion: Type.Optional(Type.String({ description: "Version before upgrade" })),
    /** 升级后的版本 */
    newVersion: Type.Optional(Type.String({ description: "Version after upgrade" })),
    /** 备份 ID（如果创建了备份） */
    backupId: Type.Optional(Type.String({ description: "Backup ID if backup was created" })),
    /** 升级变更摘要 */
    changesSummary: Type.Optional(Type.String({ description: "Summary of changes made during upgrade" })),
    /** 错误信息（如果升级失败） */
    error: Type.Optional(Type.String({ description: "Error message if upgrade failed" })),
});

/** 应用升级响应 TypeScript 类型 */
export type AppUpgradeResponse = Static<typeof AppUpgradeResponseSchema>;

// ============================================================================
// App Upgrade Action - Token 定义
// ============================================================================

/**
 * 应用升级令牌
 */
export const APP_UPGRADE_TOKEN: Token<typeof AppUpgradeRequestSchema, typeof AppUpgradeResponseSchema> = "app.upgrade";

// ============================================================================
// App Upgrade Action - Action 定义
// ============================================================================

/**
 * 应用升级 Action
 *
 * 核心能力：升级已安装的应用程序到新版本。
 *
 * 设计要点:
 * - 使用 TypeBox 定义 Schema
 * - 权限控制:需要 app:write 和 app:read 权限
 * - 支持从注册表或本地升级
 * - 支持版本回滚
 */
export const appUpgradeAction: Action<typeof AppUpgradeRequestSchema, typeof AppUpgradeResponseSchema> = {
    type: APP_UPGRADE_TOKEN,
    description: "Upgrade an installed application to a newer version",
    request: AppUpgradeRequestSchema,
    response: AppUpgradeResponseSchema,
    requiredPermissions: [APP_WRITE_PERMISSION, APP_READ_PERMISSION],
    dependencies: [],
    execute: async (params: AppUpgradeRequest, injector: Injector): Promise<AppUpgradeResponse> => {
        const source = params.source ?? "registry";
        const createBackup = params.createBackup ?? true;

        try {
            // 获取已安装的应用信息
            const app = await getInstalledApp(injector, params.appId);

            if (!app) {
                return {
                    success: false,
                    error: `Application not found: ${params.appId}`,
                };
            }

            const previousVersion = app.version;

            // 创建备份
            let backupId: string | undefined;
            if (createBackup) {
                backupId = params.backupId ?? `upgrade-${params.appId}-${Date.now()}`;
            }

            let newVersion: string;
            let changesSummary: string;

            if (source === "registry") {
                // 从注册表升级
                const config = await getAppConfig(injector);
                const registryUrl = config.registryUrl;

                // 获取最新版本信息
                const versionEndpoint = params.targetVersion
                    ? `${registryUrl}/api/v1/packages/${params.appId}/versions/${params.targetVersion}`
                    : `${registryUrl}/api/v1/packages/${params.appId}/latest`;

                const response = await fetch(versionEndpoint);

                if (!response.ok) {
                    return {
                        success: false,
                        error: `Failed to fetch version info: ${response.status}`,
                    };
                }

                const versionInfo = await response.json() as {
                    version: string;
                    changelog?: string;
                    packageJson?: string;
                };

                newVersion = versionInfo.version;
                changesSummary = versionInfo.changelog ?? `Upgraded to version ${newVersion}`;

                // 更新 package.json
                if (versionInfo.packageJson) {
                    const packageJsonPath = resolve(app.installPath, "package.json");
                    await writeFile(packageJsonPath, versionInfo.packageJson, "utf8");
                }
            } else {
                // 从本地升级
                if (!params.localSourcePath) {
                    return {
                        success: false,
                        error: "localSourcePath is required when source='local'",
                    };
                }

                const currentDir = injector.get<string>(CURRENT_DIR);
                const sourcePath = resolve(currentDir, params.localSourcePath);
                const sourcePackageJsonPath = resolve(sourcePath, "package.json");

                try {
                    const packageJsonRaw = await readFile(sourcePackageJsonPath, "utf8");
                    const packageJson = JSON.parse(packageJsonRaw) as { version?: string };

                    newVersion = packageJson.version ?? "unknown";
                    changesSummary = `Upgraded from local source: ${params.localSourcePath}`;

                    // 复制 package.json
                    const targetPackageJsonPath = resolve(app.installPath, "package.json");
                    await writeFile(targetPackageJsonPath, packageJsonRaw, "utf8");
                } catch {
                    return {
                        success: false,
                        error: `Failed to read package.json from ${params.localSourcePath}`,
                    };
                }
            }

            // 更新已安装应用记录
            const updatedApp: AppMetadata = {
                ...app,
                version: newVersion,
                installedAt: new Date().toISOString(),
            };

            await registerApp(injector, updatedApp);

            return {
                success: true,
                previousVersion,
                newVersion,
                backupId,
                changesSummary,
            };
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : String(error),
            };
        }
    },
};
