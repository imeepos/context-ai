/**
 * 注入选项接口
 * 用于控制依赖注入的行为
 */
export interface InjectOptions {
  /**
   * 可选注入 - 当依赖不存在时返回 null 而不是抛出错误
   */
  optional?: boolean;

  /**
   * 跳过自身 - 跳过当前注入器，从父注入器查找
   */
  skipSelf?: boolean;

  /**
   * 仅自身 - 只在当前注入器查找，不查找父注入器
   */
  self?: boolean;

  /**
   * 宿主注入器 - 在宿主注入器中查找依赖
   */
  host?: boolean;
}
