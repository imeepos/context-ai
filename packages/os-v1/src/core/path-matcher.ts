/**
 * 路径匹配器
 *
 * 支持类似 Express/React Router 的动态路由参数：
 * - `:param` - 命名参数（如 `app://detail/:id`）
 * - `*` - 通配符（匹配任意字符）
 *
 * @example
 * const matcher = new PathMatcher('app://detail/:id');
 * const result = matcher.match('app://detail/123');
 * // result: { params: { id: '123' } }
 */

export interface PathMatchResult {
    /** 是否匹配成功 */
    matched: boolean;
    /** 提取的路由参数 */
    params: Record<string, string>;
}

export interface PageMatchResult<T = unknown> {
    /** 匹配的页面数据 */
    page: T;
    /** 提取的路由参数 */
    params: Record<string, string>;
}

/**
 * 路径匹配器类
 *
 * 将路由模式转换为正则表达式，用于匹配实际路径并提取参数。
 */
export class PathMatcher {
    private readonly pattern: string;
    private readonly regex: RegExp;
    private readonly paramNames: string[];

    constructor(pattern: string) {
        this.pattern = pattern;
        this.paramNames = [];

        // 将路径模式转换为正则表达式
        const regexPattern = this.patternToRegex(pattern);
        this.regex = new RegExp(`^${regexPattern}$`, 'i');
    }

    /**
     * 将路径模式转换为正则表达式字符串
     */
    private patternToRegex(pattern: string): string {
        // 转义正则特殊字符（除了 : 和 *）
        let regex = pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&');

        // 处理通配符 *
        regex = regex.replace(/\*/g, '.*');

        // 处理命名参数 :param
        regex = regex.replace(/:([^/]+)/g, (_, paramName) => {
            this.paramNames.push(paramName);
            return '([^/]+)';
        });

        return regex;
    }

    /**
     * 匹配路径并提取参数
     *
     * @param path - 要匹配的实际路径
     * @returns 匹配结果
     */
    match(path: string): PathMatchResult {
        const match = path.match(this.regex);

        if (!match) {
            return { matched: false, params: {} };
        }

        // 提取参数值
        const params: Record<string, string> = {};
        this.paramNames.forEach((name, index) => {
            const value = match[index + 1];
            if (value !== undefined) {
                params[name] = decodeURIComponent(value);
            }
        });

        return { matched: true, params };
    }

    /**
     * 检查路径是否匹配
     */
    test(path: string): boolean {
        return this.regex.test(path);
    }

    /**
     * 获取原始模式
     */
    getPattern(): string {
        return this.pattern;
    }
}

/**
 * 从页面列表中查找匹配的页面
 *
 * @param pages - 页面列表，每个页面必须有 path 属性
 * @param requestPath - 请求的路径
 * @returns 匹配结果，包含页面和提取的参数
 */
export function findMatchingPage<T extends { path: string }>(
    pages: T[],
    requestPath: string
): PageMatchResult<T> | null {
    for (const page of pages) {
        const matcher = new PathMatcher(page.path);
        const result = matcher.match(requestPath);

        if (result.matched) {
            return {
                page,
                params: result.params
            };
        }
    }

    return null;
}
