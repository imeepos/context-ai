import { Type, type Static } from "@sinclair/typebox";
import type { Injector } from "@context-ai/core";
import { STORE_SERVICE, type StoreService, type StoreValue } from "./store-set.action.js";

// ============================================================================
// App Permissions - 权限定义
// ============================================================================

/**
 * 应用读取权限
 */
export const APP_READ_PERMISSION = "app:read";

/**
 * 应用写入权限
 */
export const APP_WRITE_PERMISSION = "app:write";

/**
 * 应用执行权限
 */
export const APP_EXECUTE_PERMISSION = "app:execute";

// ============================================================================
// App Store Keys - 存储键名常量
// ============================================================================

/**
 * 已安装应用列表存储键
 */
export const APPS_INSTALLED_STORE_KEY = "apps:installed";

/**
 * 应用配置存储键
 */
export const APP_CONFIG_STORE_KEY = "apps:config" as const;

// ============================================================================
// App Schemas - 公共 Schema 定义
// ============================================================================

/**
 * 应用元数据 Schema
 */
export const AppMetadataSchema = Type.Object({
    /** 应用唯一标识符 */
    id: Type.String({ description: "Unique identifier for the application" }),
    /** 应用名称 */
    name: Type.String({ description: "Display name of the application" }),
    /** 应用版本 */
    version: Type.String({ description: "Semantic version of the application" }),
    /** 应用描述 */
    description: Type.Optional(Type.String({ description: "Brief description of the application" })),
    /** 应用安装路径 */
    installPath: Type.String({ description: "Directory path where the application is installed" }),
    /** 安装时间戳（ISO 8601 格式） */
    installedAt: Type.String({ description: "ISO 8601 timestamp when the application was installed" }),
});

/** 应用元数据 TypeScript 类型 */
export type AppMetadata = Static<typeof AppMetadataSchema>;

/**
 * 应用配置 Schema
 */
export const AppConfigSchema = Type.Object({
    /** 默认注册表 URL */
    registryUrl: Type.Optional(Type.String({ description: "Default registry URL for publishing apps" })),
    /** 默认输出目录 */
    defaultOutDir: Type.Optional(Type.String({ description: "Default output directory for builds" })),
});

/** 应用配置 TypeScript 类型 */
export type AppConfig = Static<typeof AppConfigSchema>;

// ============================================================================
// App Helper Functions - 辅助函数
// ============================================================================

/**
 * 获取已安装的应用列表
 *
 * @param injector - 依赖注入器
 * @returns 已安装的应用列表
 */
export async function getInstalledApps(injector: Injector): Promise<AppMetadata[]> {
    const storeService = injector.get<StoreService>(STORE_SERVICE);
    const apps = storeService.get(APPS_INSTALLED_STORE_KEY);
    return (apps as AppMetadata[] | undefined) ?? [];
}

/**
 * 注册（安装）应用
 *
 * @param injector - 依赖注入器
 * @param app - 应用元数据
 */
export async function registerApp(injector: Injector, app: AppMetadata): Promise<void> {
    const storeService = injector.get<StoreService>(STORE_SERVICE);
    const apps = await getInstalledApps(injector);

    // 检查是否已存在
    const existingIndex = apps.findIndex(a => a.id === app.id);
    if (existingIndex >= 0) {
        // 更新现有应用
        apps[existingIndex] = app;
    } else {
        // 添加新应用
        apps.push(app);
    }

    storeService.set(APPS_INSTALLED_STORE_KEY, apps as unknown as StoreValue);
    await storeService.save();
}

/**
 * 注销（卸载）应用
 *
 * @param injector - 依赖注入器
 * @param appId - 应用 ID
 * @returns 是否成功卸载（如果应用不存在则返回 false）
 */
export async function unregisterApp(injector: Injector, appId: string): Promise<boolean> {
    const storeService = injector.get<StoreService>(STORE_SERVICE);
    const apps = await getInstalledApps(injector);

    const index = apps.findIndex(a => a.id === appId);
    if (index < 0) {
        return false;
    }

    apps.splice(index, 1);
    storeService.set(APPS_INSTALLED_STORE_KEY, apps as unknown as StoreValue);
    await storeService.save();
    return true;
}

/**
 * 根据 ID 获取已安装的应用
 *
 * @param injector - 依赖注入器
 * @param appId - 应用 ID
 * @returns 应用元数据，如果不存在则返回 undefined
 */
export async function getInstalledApp(injector: Injector, appId: string): Promise<AppMetadata | undefined> {
    const apps = await getInstalledApps(injector);
    return apps.find(a => a.id === appId);
}

/**
 * 获取应用配置
 *
 * @param injector - 依赖注入器
 * @returns 应用配置
 */
export async function getAppConfig(injector: Injector): Promise<AppConfig> {
    const storeService = injector.get<StoreService>(STORE_SERVICE);
    const config = storeService.get(APP_CONFIG_STORE_KEY);
    return (config as AppConfig | undefined) ?? {
        registryUrl: "https://registry.context-ai.dev",
        defaultOutDir: "dist",
    };
}

/**
 * 验证目标目录是否在工作区根目录下（防止路径遍历攻击）
 *
 * @param targetDir - 目标目录
 * @param workspaceRoot - 工作区根目录
 * @returns 是否是有效的安全路径
 */
export function validateTargetDir(targetDir: string, workspaceRoot: string): boolean {
    const normalizedTarget = normalizePath(targetDir);
    const normalizedRoot = normalizePath(workspaceRoot);

    // 目标路径必须以工作区根目录开头
    return normalizedTarget.startsWith(normalizedRoot);
}

/**
 * 规范化路径（处理相对路径和路径分隔符）
 *
 * @param path - 原始路径
 * @returns 规范化后的路径
 */
function normalizePath(path: string): string {
    // 解析相对路径组件（如 .. 和 .)
    const parts = path.replace(/\\/g, "/").split("/");
    const normalized: string[] = [];

    for (const part of parts) {
        if (part === "..") {
            normalized.pop();
        } else if (part !== "." && part !== "") {
            normalized.push(part);
        }
    }

    return normalized.join("/");
}
