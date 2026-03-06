/**
 * 宿主属性令牌，用于从宿主元素的属性中注入值
 *
 * @template T 属性值的类型
 */
export class HostAttributeToken<T = string> {
  /**
   * 令牌标识符
   */
  public readonly __token__ = 'HostAttributeToken' as const;

  /**
   * 创建宿主属性令牌
   *
   * @param attribute 属性名称
   * @param defaultValue 默认值（当属性不存在时使用）
   */
  constructor(
    public readonly attribute: string,
    public readonly defaultValue?: T,
  ) { }

  /**
   * 返回令牌的字符串表示
   */
  toString(): string {
    return `HostAttributeToken(${this.attribute})`;
  }

  /**
   * 检查两个令牌是否相等
   *
   * @param other 其他令牌
   * @returns 是否相等
   */
  equals(other: any): boolean {
    return (
      other instanceof HostAttributeToken && other.attribute === this.attribute
    );
  }
}

/**
 * 检查给定值是否为宿主属性令牌
 *
 * @param token 要检查的值
 * @returns 是否为宿主属性令牌
 */
export function isHostAttributeToken(
  token: any,
): token is HostAttributeToken<any> {
  return token instanceof HostAttributeToken;
}

/**
 * 创建宿主属性令牌的工厂函数
 *
 * @param attribute 属性名称
 * @param defaultValue 默认值
 * @returns 宿主属性令牌
 */
export function createHostAttributeToken<T = string>(
  attribute: string,
  defaultValue?: T,
): HostAttributeToken<T> {
  return new HostAttributeToken<T>(attribute, defaultValue);
}
