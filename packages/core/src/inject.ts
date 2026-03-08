import type { InjectionTokenType } from './injector';
import type { InjectOptions } from './inject-options';
import {
  InternalInjectFlags,
  convertInjectOptionsToFlags,
} from './internal-inject-flags';

/**
 * 统一的注入元数据结构
 * 将令牌和标志位存储在同一个对象中，提高性能和一致性
 */
export interface InjectMetadata {
  /** 注入令牌 */
  token: any;
  /** 内部标志位（性能优化） */
  flags: InternalInjectFlags;
}

/**
 * 统一的注入元数据存储键
 * 替代原来分离的令牌和选项存储
 */
const INJECT_METADATA_KEY = Symbol('inject-unified');

/**
 * 向后兼容：旧的注入元数据存储键
 * @deprecated 使用统一的 INJECT_METADATA_KEY
 */
const LEGACY_INJECT_METADATA_KEY = Symbol('inject');

/**
 * 向后兼容：旧的注入选项元数据存储键
 * @deprecated 使用统一的 INJECT_METADATA_KEY
 */
const LEGACY_INJECT_OPTIONS_METADATA_KEY = Symbol('inject-options');

/**
 * 参数类型元数据存储键（TypeScript 自动生成）
 */
const PARAM_TYPES_KEY = 'design:paramtypes';

/**
 * @Inject 参数装饰器
 * 用于指定构造函数参数的注入令牌
 *
 * @param token 注入令牌
 * @param options 注入选项
 * @returns 参数装饰器函数
 */
export function Inject<T>(
  token: InjectionTokenType<T>,
  options?: InjectOptions,
): ParameterDecorator {
  return function (
    target: any,
    _propertyKey: string | symbol | undefined,
    parameterIndex: number,
  ) {
    // 🚀 获取现有的统一元数据数组
    const existingMetadata: InjectMetadata[] =
      Reflect.getMetadata(INJECT_METADATA_KEY, target) || [];

    // 确保数组足够大以容纳当前参数索引
    while (existingMetadata.length <= parameterIndex) {
      existingMetadata.push({
        token: undefined,
        flags: InternalInjectFlags.Default,
      });
    }

    // 🚀 设置当前参数的统一元数据
    existingMetadata[parameterIndex] = {
      token,
      flags: convertInjectOptionsToFlags(options),
    };

    // 存储更新后的统一元数据数组
    Reflect.defineMetadata(INJECT_METADATA_KEY, existingMetadata, target);
  };
}

/**
 * 获取类构造函数的注入元数据
 * 结合 @Inject 装饰器的令牌和 TypeScript 的类型信息
 *
 * @param target 目标类
 * @returns 注入令牌数组，每个元素对应构造函数的一个参数
 */
export function getInjectMetadata(target: any): any[] | undefined {
  // 🚀 优先获取新的统一元数据
  const unifiedMetadata: InjectMetadata[] | undefined = Reflect.getMetadata(
    INJECT_METADATA_KEY,
    target,
  );

  // 向后兼容：获取旧的分离元数据
  const legacyTokens: any[] | undefined = Reflect.getMetadata(
    LEGACY_INJECT_METADATA_KEY,
    target,
  );

  // 获取 TypeScript 推断的参数类型
  const paramTypes: any[] | undefined = Reflect.getMetadata(
    PARAM_TYPES_KEY,
    target,
  );

  // 如果没有任何元数据，返回 undefined
  if (!unifiedMetadata && !legacyTokens && !paramTypes) {
    return undefined;
  }

  // 确定结果数组的长度
  const maxLength = Math.max(
    unifiedMetadata?.length || 0,
    legacyTokens?.length || 0,
    paramTypes?.length || 0,
  );

  if (maxLength === 0) {
    return undefined;
  }

  // 构建结果数组
  const result: any[] = [];
  for (let i = 0; i < maxLength; i++) {
    // 🚀 优先使用新的统一元数据
    if (
      unifiedMetadata &&
      unifiedMetadata[i] &&
      unifiedMetadata[i]?.token !== undefined
    ) {
      result[i] = unifiedMetadata[i]!.token;
    }
    // 向后兼容：使用旧的分离元数据
    else if (legacyTokens && legacyTokens[i] !== undefined) {
      result[i] = legacyTokens[i];
    }
    // 最后使用 TypeScript 推断的类型
    else if (paramTypes && paramTypes[i] !== undefined) {
      result[i] = paramTypes[i];
    } else {
      result[i] = undefined;
    }
  }

  return result;
}

/**
 * 获取注入选项元数据
 *
 * @param target 目标类
 * @returns 注入选项数组
 */
export function getInjectOptionsMetadata(
  target: any,
): InjectOptions[] | undefined {
  // 🚀 优先获取新的统一元数据
  const unifiedMetadata: InjectMetadata[] | undefined = Reflect.getMetadata(
    INJECT_METADATA_KEY,
    target,
  );

  if (unifiedMetadata) {
    // 从统一元数据中提取选项
    return unifiedMetadata.map((metadata) => {
      if (!metadata || metadata.flags === InternalInjectFlags.Default) {
        return {};
      }

      // 将标志位转换回选项对象
      const options: InjectOptions = {};

      if (metadata.flags & InternalInjectFlags.Optional) {
        options.optional = true;
      }
      if (metadata.flags & InternalInjectFlags.SkipSelf) {
        options.skipSelf = true;
      }
      if (metadata.flags & InternalInjectFlags.Self) {
        options.self = true;
      }
      if (metadata.flags & InternalInjectFlags.Host) {
        options.host = true;
      }

      return options;
    });
  }

  // 向后兼容：获取旧的分离选项元数据
  return Reflect.getMetadata(LEGACY_INJECT_OPTIONS_METADATA_KEY, target);
}

/**
 * 获取统一的注入元数据（新API）
 * 返回包含令牌和标志位的完整元数据
 *
 * @param target 目标类
 * @returns 统一的注入元数据数组
 */
export function getUnifiedInjectMetadata(
  target: any,
): InjectMetadata[] | undefined {
  // 获取新的统一元数据
  const unifiedMetadata: InjectMetadata[] | undefined = Reflect.getMetadata(
    INJECT_METADATA_KEY,
    target,
  );

  if (unifiedMetadata) {
    return unifiedMetadata;
  }

  // 向后兼容：从旧的分离元数据构建统一元数据
  const legacyTokens: any[] | undefined = Reflect.getMetadata(
    LEGACY_INJECT_METADATA_KEY,
    target,
  );
  const legacyOptions: InjectOptions[] | undefined = Reflect.getMetadata(
    LEGACY_INJECT_OPTIONS_METADATA_KEY,
    target,
  );
  const paramTypes: any[] | undefined = Reflect.getMetadata(
    PARAM_TYPES_KEY,
    target,
  );

  if (!legacyTokens && !paramTypes) {
    return undefined;
  }

  const maxLength = Math.max(
    legacyTokens?.length || 0,
    legacyOptions?.length || 0,
    paramTypes?.length || 0,
  );

  if (maxLength === 0) {
    return undefined;
  }

  const result: InjectMetadata[] = [];
  for (let i = 0; i < maxLength; i++) {
    let token: any;

    // 确定令牌
    if (legacyTokens && legacyTokens[i] !== undefined) {
      token = legacyTokens[i];
    } else if (paramTypes && paramTypes[i] !== undefined) {
      token = paramTypes[i];
    } else {
      token = undefined;
    }

    // 确定标志位
    const options = legacyOptions?.[i] || {};
    const flags = convertInjectOptionsToFlags(options);

    result[i] = { token, flags };
  }

  return result;
}

/**
 * 检查类是否有注入元数据
 *
 * @param target 目标类
 * @returns 是否有注入元数据
 */
export function hasInjectMetadata(target: any): boolean {
  return (
    Reflect.hasMetadata(INJECT_METADATA_KEY, target) ||
    Reflect.hasMetadata(LEGACY_INJECT_METADATA_KEY, target) ||
    Reflect.hasMetadata(PARAM_TYPES_KEY, target)
  );
}
