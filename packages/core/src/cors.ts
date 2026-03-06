import type { ServerResponse } from 'http';
import type { IncomingMessage } from 'http';

/**
 * CORS 配置选项
 */
export interface CorsOptions {
  origin: string | string[];
  allowMethods: string[];
  allowHeaders: string[];
  credentials: boolean;
  maxAge: number;
}

/**
 * 默认 CORS 配置
 * 与 main.ts 中的 Hono CORS 配置保持一致
 */
export const DEFAULT_CORS_CONFIG: CorsOptions = {
  origin: '*',
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'X-Request-ID',
    'Accept',
    'Origin'
  ],
  credentials: true,
  maxAge: 86400,
};

/**
 * 获取请求的 Origin
 * 支持 Origin 和 Expo-Origin 头
 */
export function getRequestOrigin(req: IncomingMessage): string | null {
  const origin = req.headers['origin'] as string | undefined;
  const expoOrigin = req.headers['expo-origin'] as string | undefined;
  return origin || expoOrigin || null;
}

/**
 * 检查 Origin 是否被允许
 */
export function isOriginAllowed(origin: string, allowedOrigins: string[]): boolean {
  // 如果允许所有源
  if (allowedOrigins.includes('*')) {
    return true;
  }

  // 精确匹配
  if (allowedOrigins.includes(origin)) {
    return true;
  }

  // 前缀匹配 (如 http://, https://)
  return allowedOrigins.some(allowed => origin.startsWith(allowed));
}

/**
 * 为 ServerResponse 添加 CORS 头
 *
 * @param res - Node.js ServerResponse 对象
 * @param req - Node.js IncomingMessage 对象
 * @param config - CORS 配置选项
 */
export function addCorsHeaders(
  res: ServerResponse,
  req: IncomingMessage,
  config: CorsOptions = DEFAULT_CORS_CONFIG
): void {
  const requestOrigin = getRequestOrigin(req);

  // 设置 Access-Control-Allow-Origin
  if (typeof config.origin === 'string') {
    if (config.origin === '*') {
      res.setHeader('Access-Control-Allow-Origin', '*');
    } else {
      res.setHeader('Access-Control-Allow-Origin', config.origin);
    }
  } else if (Array.isArray(config.origin)) {
    // 动态 origin 处理
    if (requestOrigin && isOriginAllowed(requestOrigin, config.origin)) {
      res.setHeader('Access-Control-Allow-Origin', requestOrigin);
      // Vary 告知缓存基于 Origin 变化
      res.setHeader('Vary', 'Origin');
    } else if (config.origin.includes('*')) {
      res.setHeader('Access-Control-Allow-Origin', '*');
    }
  }

  // 设置其他 CORS 头
  res.setHeader('Access-Control-Allow-Methods', config.allowMethods.join(', '));
  res.setHeader('Access-Control-Allow-Headers', config.allowHeaders.join(', '));
  res.setHeader('Access-Control-Allow-Credentials', String(config.credentials));
  res.setHeader('Access-Control-Max-Age', String(config.maxAge));
}
