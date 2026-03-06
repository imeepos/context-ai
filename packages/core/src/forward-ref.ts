// 避免循环依赖，在此文件中不直接引入 InjectionTokenType
// import { InjectionTokenType } from './injector';

/**
 * @fileoverview forwardRef 机制实现
 * 提供循环引用解决方案，允许在定义时引用尚未定义的类型
 */

/**
 * ForwardRef 类型，用于包装延迟解析的引用
 */
export class ForwardRef<T = any> {
  /**
   * ForwardRef 的唯一标识符，用于识别这是一个ForwardRef对象
   */
  readonly __forward_ref__ = true;

  constructor(public readonly forwardRefFn: () => T) { }

  /**
   * 解析ForwardRef，执行包装的函数获取实际的令牌
   */
  resolve(): T {
    try {
      const result = this.forwardRefFn();
      if (result === undefined || result === null) {
        throw new Error(
          '无效的forwardRef: forwardRef函数返回了undefined或null',
        );
      }
      return result;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`forwardRef解析失败: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * 提供toString方法用于调试
   */
  toString(): string {
    return 'ForwardRef';
  }
}

/**
 * 创建ForwardRef的工厂函数
 * @param forwardRefFn 返回实际令牌的函数
 * @returns ForwardRef实例
 */
export function forwardRef<T>(forwardRefFn: () => T): ForwardRef<T> {
  return new ForwardRef(forwardRefFn);
}

/**
 * 检查一个值是否为ForwardRef
 * @param value 要检查的值
 * @returns 如果是ForwardRef返回true
 */
export function isForwardRef(value: any): value is ForwardRef {
  return value && typeof value === 'object' && value.__forward_ref__ === true;
}

/**
 * 解析ForwardRef或直接返回原值
 * @param tokenOrForwardRef 令牌或ForwardRef
 * @returns 解析后的实际令牌
 */
export function resolveForwardRef<T>(tokenOrForwardRef: T | ForwardRef<T>): T {
  if (isForwardRef(tokenOrForwardRef)) {
    return tokenOrForwardRef.resolve();
  }
  return tokenOrForwardRef;
}

/**
 * ForwardRef缓存，避免重复解析同一个ForwardRef
 */
const forwardRefCache = new WeakMap<ForwardRef, any>();

/**
 * 带缓存的ForwardRef解析
 * @param tokenOrForwardRef 令牌或ForwardRef
 * @returns 解析后的实际令牌
 */
export function resolveForwardRefCached<T>(
  tokenOrForwardRef: T | ForwardRef<T>,
): T {
  if (isForwardRef(tokenOrForwardRef)) {
    // 检查缓存
    if (forwardRefCache.has(tokenOrForwardRef)) {
      return forwardRefCache.get(tokenOrForwardRef);
    }

    // 解析并缓存
    const resolved = tokenOrForwardRef.resolve();
    forwardRefCache.set(tokenOrForwardRef, resolved);
    return resolved;
  }
  return tokenOrForwardRef;
}

/**
 * 递归解析数组中的所有ForwardRef
 * @param items 可能包含ForwardRef的数组
 * @returns 解析后的数组
 */
export function resolveForwardRefsInArray<T>(
  items: (T | ForwardRef<T>)[],
): T[] {
  return items.map((item) => resolveForwardRefCached(item));
}

/**
 * 解析Provider依赖数组中的ForwardRef
 * @param deps 依赖数组
 * @returns 解析后的依赖数组
 */
export function resolveForwardRefsInDeps(
  deps: any[] | undefined,
): any[] | undefined {
  if (!deps) {
    return deps;
  }
  return resolveForwardRefsInArray(deps);
}
