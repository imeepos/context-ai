import { InjectionTokenType } from './injector';
import { ForwardRef } from './forward-ref';

/**
 * 多值注入类型
 * - true: 数组模式 T[]
 * - 'record': Record 模式 Record<string, T>
 * - 'map': Map 模式 Map<K, T>
 * - 'set': Set 模式 Set<T>
 */
export type MultiType = boolean | 'record' | 'map' | 'set';

/**
 * 基础提供者接口，定义所有提供者的共同属性
 * @template T 提供的值的类型
 */
export interface BaseProvider<T> {
  provide: InjectionTokenType<T>;
  multi?: MultiType;
  key?: string; // 仅当 multi: 'record' 时有效
  mapKey?: any; // 仅当 multi: 'map' 时有效
}

/**
 * 值提供者，直接提供一个值
 * @template T 提供的值的类型
 */
export interface ValueProvider<T> extends BaseProvider<T> {
  useValue: T;
}

/**
 * 类提供者，通过类构造函数创建实例
 * @template T 提供的实例类型
 */
export interface ClassProvider<T> extends BaseProvider<T> {
  useClass: (new (...args: any[]) => T) | ForwardRef<new (...args: any[]) => T>;
}

/**
 * 工厂提供者，通过工厂函数创建实例
 * @template T 提供的实例类型
 */
export interface FactoryProvider<T> extends BaseProvider<T> {
  useFactory: (...deps: any[]) => T;
  deps?: InjectionTokenType<any>[];
}

/**
 * 别名提供者，将一个令牌映射到另一个令牌
 * @template T 提供的值的类型
 */
export interface ExistingProvider<T> extends BaseProvider<T> {
  useExisting: InjectionTokenType<T>;
}

/**
 * 构造函数提供者，使用类本身作为令牌和实现
 * @template T 提供的实例类型
 */
export interface ConstructorProvider<T> extends BaseProvider<T> {
  provide: new (...args: any[]) => T;
}

/**
 * 延迟类提供者，延迟到首次获取时才实例化类
 * @template T 提供的实例类型
 */
export interface LazyClassProvider<T> extends BaseProvider<T> {
  useLazyClass: new (...args: any[]) => T;
}

/**
 * 延迟工厂提供者，延迟到首次获取时才调用工厂函数
 * @template T 提供的实例类型
 */
export interface LazyFactoryProvider<T> extends BaseProvider<T> {
  useLazyFactory: (...deps: any[]) => T;
  deps?: InjectionTokenType<any>[];
}

/**
 * 提供者联合类型，包含所有可能的提供者类型
 * @template T 提供的值的类型，默认为 any
 */
export type Provider<T = any> =
  | ValueProvider<T>
  | ClassProvider<T>
  | FactoryProvider<T>
  | ExistingProvider<T>
  | ConstructorProvider<T>
  | LazyClassProvider<T>
  | LazyFactoryProvider<T>;
