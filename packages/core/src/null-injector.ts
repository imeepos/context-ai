import { Injector, InjectionTokenType, Type } from './injector';
import type { Provider } from './provider';

/**
 * 空注入器，作为注入器链的终点
 * 对于任何请求都会抛出"未找到提供者"的错误
 */
export class NullInjector extends Injector {
  constructor() {
    super();
  }

  /**
   * 获取依赖实例，但总是抛出错误
   * @param token 注入令牌
   * @throws Error 总是抛出未找到提供者的错误
   */
  get<T>(token: InjectionTokenType<T>, def?: T): T {
    if (def) return def;

    // 首先检查是否为内置类型
    this.validateToken(token);

    // 生成更友好的 token 名称
    let tokenName: string;
    if (typeof token === 'function') {
      // 对于类或构造函数，使用类名
      tokenName = token.name || JSON.stringify(token);
    } else if (token && typeof token === 'object' && 'toString' in token) {
      // InjectionToken 或其他对象
      tokenName = token.toString();
    } else {
      tokenName = JSON.stringify(token)
    }

    console.error(`NullInjector: No Provider for "${tokenName}"`, {
      token,
      tokenType: typeof token,
      isBuiltIn: token === Object || token === Array || token === String || token === Number || token === Boolean
    });

    throw new Error(`NullInjector: 未找到 Provider for "${tokenName}"\n\n可能的原因：\n1. 忘记在模块中注册该服务\n2. 服务未使用 @Injectable() 装饰器\n3. 使用了内置类型（Object/Array 等）而非具体的类或 InjectionToken`);
  }

  /**
   * 验证注入令牌是否合法
   * 阻止使用 Object 作为注入令牌（因为无法序列化成可读字符串）
   *
   * 允许的类型：
   * - 有 name 属性的（类、函数）- 可通过 name 定位
   * - string, symbol - 本身就是可读的
   * - InjectionToken - 有 toString() 方法
   */
  private validateToken(token: any): void {
    // 只禁止 Object，因为它打印出来是 [object Object]，无法定位
    if (token === Object) {
      throw new Error(
        `不允许使用内置类型 "Object" 作为注入令牌！\n\n` +
        `Object 无法序列化成可读的调试信息。请使用以下方式之一：\n` +
        `1. 创建具体的类或接口，如 class MyService {}\n` +
        `2. 使用 InjectionToken，如 new InjectionToken<object>('my-config')\n` +
        `3. 使用字符串令牌，如 'MY_CONFIG'\n` +
        `4. 使用 Symbol 令牌，如 Symbol('MY_CONFIG')`
      );
    }
  }

  set(_providers: Provider[]): void {
    throw new Error(`NullInjector: No set method`)
  }

  async init(): Promise<void> {
    // NullInjector 无需初始化
  }

  async destroy(): Promise<void> {
    // NullInjector 无需销毁
  }
}
