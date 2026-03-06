import { InjectionToken } from './injection-token';
import { ForwardRef } from './forward-ref';
import { HostAttributeToken } from './host-attribute-token';
import { Provider } from './provider';

/**
 * 类
 */
export interface Type<T> extends Function {
  new(...args: any[]): T;
}
export function isType<T>(val: any): val is Type<T> {
  return typeof val === 'function'
}
/**
 * abstract 类
 */
// @ts-ignore - T is intentionally unused as a type parameter marker
export interface AbstractType<T = any> extends Function { }
export type StringToken<T> = string & { __type?: T };
export type SymbolToken<T> = symbol & { __type?: T };
/**
 * 注入令牌的类型定义，支持多种令牌类型
 */
export type InjectionTokenType<T> =
  | InjectionToken<T>
  | HostAttributeToken<T>
  | Type<T>
  | AbstractType<T>
  | StringToken<T>
  | SymbolToken<T>
  | Function
  | ForwardRef<InjectionTokenType<T>>;

/**
 * 抽象注入器基类，提供依赖注入的核心接口
 * 支持层次化注入器结构和类型安全的依赖获取
 */
export abstract class Injector {
  constructor(public parent?: Injector) { }

  /**
   * 获取指定令牌的依赖实例
   * @param token 注入令牌
   * @returns 依赖实例
   */
  abstract get<T>(token: InjectionTokenType<T>, def?: T): T;
  abstract set(providers: (Provider | Type<any>)[]): void;
  abstract destroy(): Promise<void>;
  abstract init(): Promise<void>;
}
