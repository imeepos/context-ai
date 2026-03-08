import type { InjectOptions } from './inject-options';

/**
 * 内部注入标志位，使用位运算优化性能
 * 每个标志占用一个位，可以高效地组合和检测
 */
export enum InternalInjectFlags {
  /**
   * 默认标志：无特殊选项
   */
  Default = 0,

  /**
   * 可选注入：找不到时返回 null 而不抛出错误
   */
  Optional = 1 << 0, // 1

  /**
   * 跳过当前注入器：从父级注入器开始查找
   */
  SkipSelf = 1 << 1, // 2

  /**
   * 仅在当前注入器查找：不向上查找父级
   */
  Self = 1 << 2, // 4

  /**
   * 在宿主注入器中查找
   */
  Host = 1 << 3, // 8
}

/**
 * 组合多个注入标志
 *
 * @param flags 要组合的标志数组
 * @returns 组合后的标志值
 */
export function combineInjectFlags(
  ...flags: InternalInjectFlags[]
): InternalInjectFlags {
  return flags.reduce(
    (combined, flag) => combined | flag,
    InternalInjectFlags.Default,
  );
}

/**
 * 检查标志是否包含指定的标志位
 *
 * @param flags 要检查的标志值
 * @param targetFlag 要检测的目标标志
 * @returns 是否包含目标标志
 */
export function hasFlag(
  flags: InternalInjectFlags,
  targetFlag: InternalInjectFlags,
): boolean {
  // 对于 Default 标志的特殊处理
  if (targetFlag === InternalInjectFlags.Default) {
    return flags === InternalInjectFlags.Default;
  }

  // 使用位与运算检查标志
  return (flags & targetFlag) === targetFlag;
}

/**
 * 将 InjectOptions 转换为内部标志位
 *
 * @param options 注入选项对象
 * @returns 对应的内部标志位
 * @throws {Error} 当选项组合冲突时抛出错误
 */
export function convertInjectOptionsToFlags(
  options?: InjectOptions,
): InternalInjectFlags {
  if (!options) {
    return InternalInjectFlags.Default;
  }

  // 🔍 检测冲突的选项组合
  validateInjectOptionsConflicts(options);

  let flags = InternalInjectFlags.Default;

  if (options.optional) {
    flags |= InternalInjectFlags.Optional;
  }

  if (options.skipSelf) {
    flags |= InternalInjectFlags.SkipSelf;
  }

  if (options.self) {
    flags |= InternalInjectFlags.Self;
  }

  if (options.host) {
    flags |= InternalInjectFlags.Host;
  }

  return flags;
}

/**
 * 验证注入选项是否存在冲突
 *
 * @param options 注入选项对象
 * @throws {Error} 当选项组合冲突时抛出错误
 */
export function validateInjectOptionsConflicts(options: InjectOptions): void {
  const conflicts: Array<{ options: string[]; reason: string }> = [];

  // self 和 skipSelf 冲突
  if (options.self && options.skipSelf) {
    conflicts.push({
      options: ['self', 'skipSelf'],
      reason:
        '"self" 只在当前注入器查找，而 "skipSelf" 跳过当前注入器，两者互相矛盾',
    });
  }

  // self 和 host 冲突
  if (options.self && options.host) {
    conflicts.push({
      options: ['self', 'host'],
      reason:
        '"self" 只在当前注入器查找，而 "host" 在宿主注入器查找，两者互相矛盾',
    });
  }

  // skipSelf 和 host 的组合需要警告（虽然不是严格冲突，但可能不是预期行为）
  if (options.skipSelf && options.host) {
    // 这个组合在技术上是可能的，但通常不是预期的行为
    // 暂时不抛出错误，但可以在调试模式下给出警告
    if (typeof console !== 'undefined' && console.warn) {
      console.warn(
        'InjectOptions 警告: 同时使用 "skipSelf" 和 "host" 可能不是预期的行为。' +
        '"skipSelf" 会被 "host" 的行为覆盖。',
      );
    }
  }

  // 如果有冲突，抛出详细的错误信息
  if (conflicts.length > 0) {
    const errorMessages = conflicts
      .map(
        (conflict) => `- ${conflict.options.join(' + ')}: ${conflict.reason}`,
      )
      .join('\n');

    throw new Error(
      `InjectOptions 选项冲突:\n${errorMessages}\n\n` +
      '请检查注入选项的组合是否正确。',
    );
  }
}

/**
 * 将内部标志位转换回 InjectOptions 对象
 * 主要用于调试和测试
 *
 * @param flags 内部标志位
 * @returns 对应的注入选项对象
 */
export function convertFlagsToInjectOptions(
  flags: InternalInjectFlags,
): InjectOptions {
  const options: InjectOptions = {};

  if (hasFlag(flags, InternalInjectFlags.Optional)) {
    options.optional = true;
  }

  if (hasFlag(flags, InternalInjectFlags.SkipSelf)) {
    options.skipSelf = true;
  }

  if (hasFlag(flags, InternalInjectFlags.Self)) {
    options.self = true;
  }

  if (hasFlag(flags, InternalInjectFlags.Host)) {
    options.host = true;
  }

  return options;
}

/**
 * 获取标志位的可读字符串表示
 * 主要用于调试
 *
 * @param flags 标志位值
 * @returns 可读的字符串表示
 */
export function flagsToString(flags: InternalInjectFlags): string {
  if (flags === InternalInjectFlags.Default) {
    return 'Default';
  }

  const flagNames: string[] = [];

  if (hasFlag(flags, InternalInjectFlags.Optional)) {
    flagNames.push('Optional');
  }

  if (hasFlag(flags, InternalInjectFlags.SkipSelf)) {
    flagNames.push('SkipSelf');
  }

  if (hasFlag(flags, InternalInjectFlags.Self)) {
    flagNames.push('Self');
  }

  if (hasFlag(flags, InternalInjectFlags.Host)) {
    flagNames.push('Host');
  }

  return flagNames.join(' | ');
}
