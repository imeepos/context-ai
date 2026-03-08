import { Inject } from './inject';
import type { InjectionTokenType } from './injector';

/**
 * 验证参数装饰器的参数
 *
 * @param token 注入令牌
 * @param target 目标类
 * @param propertyKey 属性键
 * @param parameterIndex 参数索引
 * @param decoratorName 装饰器名称（用于错误信息）
 */
function validateParameterDecoratorArgs<T>(
  token: InjectionTokenType<T>,
  target: any,
  propertyKey: string | symbol | undefined,
  parameterIndex: number,
  decoratorName: string,
): void {
  // 验证令牌
  if (token === null || token === undefined) {
    throw new Error(
      `@${decoratorName}: 注入令牌不能为 null 或 undefined。` +
        `请提供有效的注入令牌。`,
    );
  }

  // 验证参数索引
  if (
    typeof parameterIndex !== 'number' ||
    parameterIndex < 0 ||
    !Number.isInteger(parameterIndex)
  ) {
    throw new Error(
      `@${decoratorName}: 无效的参数索引 ${parameterIndex}。` +
        `参数索引必须是非负整数。`,
    );
  }

  // 验证目标对象（应该是类构造函数）
  if (!target || (typeof target !== 'function' && typeof target !== 'object')) {
    throw new Error(
      `@${decoratorName}: 无效的目标对象。` +
        `装饰器只能应用于类的构造函数参数。`,
    );
  }

  // 验证这是构造函数参数（propertyKey 应该是 undefined）
  if (propertyKey !== undefined) {
    throw new Error(
      `@${decoratorName}: 此装饰器只能用于构造函数参数，不能用于方法参数。` +
        `检测到的属性键: ${String(propertyKey)}`,
    );
  }

  // 验证参数索引不超过构造函数参数数量
  if (target.length !== undefined && parameterIndex >= target.length) {
    console.warn(
      `@${decoratorName}: 参数索引 ${parameterIndex} 可能超出构造函数参数范围 (${target.length})。` +
        `请确认构造函数参数数量是否正确。`,
    );
  }
}

/**
 * @Optional 参数装饰器
 * 标记参数为可选的，注入失败时返回 null 而不是抛出错误
 *
 * @param token 注入令牌
 * @returns 参数装饰器函数
 * @throws {Error} 当参数无效时抛出错误
 */
export function Optional<T>(token: InjectionTokenType<T>): ParameterDecorator {
  return function (
    target: any,
    propertyKey: string | symbol | undefined,
    parameterIndex: number,
  ) {
    // 🔍 验证参数
    validateParameterDecoratorArgs(
      token,
      target,
      propertyKey,
      parameterIndex,
      'Optional',
    );

    // 使用 @Inject 装饰器注册令牌，并设置 optional: true 选项
    return Inject(token, { optional: true })(
      target,
      propertyKey,
      parameterIndex,
    );
  };
}

/**
 * @Self 参数装饰器
 * 只在当前注入器中查找依赖，不向上查找父级注入器
 *
 * @param token 注入令牌
 * @returns 参数装饰器函数
 * @throws {Error} 当参数无效时抛出错误
 */
export function Self<T>(token: InjectionTokenType<T>): ParameterDecorator {
  return function (
    target: any,
    propertyKey: string | symbol | undefined,
    parameterIndex: number,
  ) {
    // 🔍 验证参数
    validateParameterDecoratorArgs(
      token,
      target,
      propertyKey,
      parameterIndex,
      'Self',
    );

    // 使用 @Inject 装饰器注册令牌，并设置 self: true 选项
    return Inject(token, { self: true })(target, propertyKey, parameterIndex);
  };
}

/**
 * @SkipSelf 参数装饰器
 * 跳过当前注入器，从父级注入器开始查找依赖
 *
 * @param token 注入令牌
 * @returns 参数装饰器函数
 * @throws {Error} 当参数无效时抛出错误
 */
export function SkipSelf<T>(token: InjectionTokenType<T>): ParameterDecorator {
  return function (
    target: any,
    propertyKey: string | symbol | undefined,
    parameterIndex: number,
  ) {
    // 🔍 验证参数
    validateParameterDecoratorArgs(
      token,
      target,
      propertyKey,
      parameterIndex,
      'SkipSelf',
    );

    // 使用 @Inject 装饰器注册令牌，并设置 skipSelf: true 选项
    return Inject(token, { skipSelf: true })(
      target,
      propertyKey,
      parameterIndex,
    );
  };
}

/**
 * @Host 参数装饰器
 * 在宿主注入器中查找依赖
 *
 * @param token 注入令牌
 * @returns 参数装饰器函数
 * @throws {Error} 当参数无效时抛出错误
 */
export function Host<T>(token: InjectionTokenType<T>): ParameterDecorator {
  return function (
    target: any,
    propertyKey: string | symbol | undefined,
    parameterIndex: number,
  ) {
    // 🔍 验证参数
    validateParameterDecoratorArgs(
      token,
      target,
      propertyKey,
      parameterIndex,
      'Host',
    );

    // 使用 @Inject 装饰器注册令牌，并设置 host: true 选项
    return Inject(token, { host: true })(target, propertyKey, parameterIndex);
  };
}
