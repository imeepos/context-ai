import { Type, type Static } from "@sinclair/typebox";
import type { Action, Token } from "../tokens.js";
import type { Injector } from "@context-ai/core";
import { NET_REQUEST_TOKEN, type NetRequestRequest } from "./net-request.action.js";
import { APP_READ_PERMISSION, getAppConfig, getInstalledApps } from "./app-common.js";

// ============================================================================
// App Search Action - 请求/响应 Schema 定义
// ============================================================================

/**
 * 搜索范围 Schema
 */
export const SearchScopeSchema = Type.Union([
    Type.Literal("local"),
    Type.Literal("registry"),
    Type.Literal("all"),
]);

/** 搜索范围 TypeScript 类型 */
export type SearchScope = Static<typeof SearchScopeSchema>;

/**
 * 应用搜索请求 Schema
 */
export const AppSearchRequestSchema = Type.Object({
    /** 搜索关键词 */
    query: Type.String({ description: "Search query string" }),
    /** 搜索范围：本地已安装、注册表、或全部 */
    scope: Type.Optional(SearchScopeSchema),
    /** 结果数量限制 */
    limit: Type.Optional(Type.Number({ description: "Maximum number of results (default: 20)" })),
    /** 是否只搜索特定标签 */
    tags: Type.Optional(Type.Array(Type.String({ description: "Filter by tags" }))),
});

/** 应用搜索请求 TypeScript 类型 */
export type AppSearchRequest = Static<typeof AppSearchRequestSchema>;

/**
 * 搜索结果应用 Schema
 */
export const SearchResultAppSchema = Type.Object({
    /** 应用 ID */
    id: Type.String({ description: "Application ID" }),
    /** 应用名称 */
    name: Type.String({ description: "Application name" }),
    /** 应用描述 */
    description: Type.Optional(Type.String({ description: "Application description" })),
    /** 版本 */
    version: Type.String({ description: "Application version" }),
    /** 是否已安装 */
    installed: Type.Boolean({ description: "Whether the application is installed locally" }),
    /** 来源 */
    source: Type.Union([Type.Literal("local"), Type.Literal("registry")], { description: "Where the result came from" }),
});

/** 搜索结果应用 TypeScript 类型 */
export type SearchResultApp = Static<typeof SearchResultAppSchema>;

/**
 * 应用搜索响应 Schema
 */
export const AppSearchResponseSchema = Type.Object({
    /** 搜索结果列表 */
    results: Type.Array(SearchResultAppSchema, { description: "Search results" }),
    /** 结果总数 */
    total: Type.Number({ description: "Total number of matching results" }),
    /** 是否有更多结果 */
    hasMore: Type.Boolean({ description: "Whether more results are available" }),
});

/** 应用搜索响应 TypeScript 类型 */
export type AppSearchResponse = Static<typeof AppSearchResponseSchema>;

// ============================================================================
// App Search Action - Token 定义
// ============================================================================

/**
 * 应用搜索令牌
 */
export const APP_SEARCH_TOKEN: Token<typeof AppSearchRequestSchema, typeof AppSearchResponseSchema> = "app.search";

// ============================================================================
// App Search Action - Action 定义
// ============================================================================

/**
 * 应用搜索 Action
 *
 * 核心能力：搜索本地已安装的应用或注册表中的应用。
 *
 * 设计要点：
 * - 使用 TypeBox 定义 Schema
 * - 权限控制：需要 app:read 权限
 * - 依赖 net.request 搜索注册表
 * - 支持本地、注册表或全部搜索
 * - 支持标签过滤
 */
export const appSearchAction: Action<typeof AppSearchRequestSchema, typeof AppSearchResponseSchema> = {
    type: APP_SEARCH_TOKEN,
    description: "Search for applications in local installation or registry",
    request: AppSearchRequestSchema,
    response: AppSearchResponseSchema,
    requiredPermissions: [APP_READ_PERMISSION],
    dependencies: [NET_REQUEST_TOKEN],
    execute: async (params: AppSearchRequest, injector: Injector): Promise<AppSearchResponse> => {
        const scope = params.scope ?? "all";
        const limit = params.limit ?? 20;
        const query = params.query.toLowerCase();

        const results: SearchResultApp[] = [];

        try {
            // 搜索本地已安装的应用
            if (scope === "local" || scope === "all") {
                const installedApps = await getInstalledApps(injector);

                const localMatches = installedApps
                    .filter(app =>
                        app.name.toLowerCase().includes(query) ||
                        app.id.toLowerCase().includes(query)
                    )
                    .map(app => ({
                        id: app.id,
                        name: app.name,
                        description: app.description,
                        version: app.version,
                        installed: true,
                        source: "local" as const,
                    }));

                results.push(...localMatches);
            }

            // 搜索注册表
            if (scope === "registry" || scope === "all") {
                const config = await getAppConfig(injector);
                const registryUrl = config.registryUrl;

                try {
                    const netRequest = injector.get<(params: NetRequestRequest) => Promise<Response>>(
                        NET_REQUEST_TOKEN
                    );

                    // 构建搜索 URL
                    const searchUrl = new URL(`${registryUrl}/api/v1/search`);
                    searchUrl.searchParams.set("q", query);
                    searchUrl.searchParams.set("limit", String(limit - results.length));
                    if (params.tags && params.tags.length > 0) {
                        searchUrl.searchParams.set("tags", params.tags.join(","));
                    }

                    const response = await netRequest({
                        url: searchUrl.toString(),
                        method: "GET",
                        timeoutMs: 30000,
                    });

                    if (response.status >= 200 && response.status < 300) {
                        const body = await response.text();
                        const registryResults = JSON.parse(body) as Array<{
                            id: string;
                            name: string;
                            description?: string;
                            version: string;
                        }>;

                        // 获取已安装应用 ID 列表
                        const installedApps = await getInstalledApps(injector);
                        const installedIds = new Set(installedApps.map(a => a.id));

                        const registryMatches = registryResults
                            .filter(app => !results.some(r => r.id === app.id))
                            .map(app => ({
                                id: app.id,
                                name: app.name,
                                description: app.description,
                                version: app.version,
                                installed: installedIds.has(app.id),
                                source: "registry" as const,
                            }));

                        results.push(...registryMatches);
                    }
                } catch {
                    // 注册表搜索失败时继续返回本地结果
                }
            }

            // 应用限制
            const limitedResults = results.slice(0, limit);

            return {
                results: limitedResults,
                total: results.length,
                hasMore: results.length > limit,
            };
        } catch (error) {
            return {
                results: [],
                total: 0,
                hasMore: false,
            };
        }
    },
};
