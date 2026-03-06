import { root } from "./environment-injector";

/**
 * 注入器作用域类型
 */
export type InjectorScope =
  | 'root'
  | 'platform'
  | 'application'
  | 'feature'
  | 'auto';

/**
 * Injectable 配置选项
 */
export interface InjectableOptions {
  /**
   * 提供者作用域，决定在哪个注入器中自动注册
   * - 'auto': 在任何注入器中都可以自动注册（默认，最灵活）
   * - 'root': 在根注入器中注册（基础服务）
   * - 'platform': 在平台注入器中注册（跨应用共享）
   * - 'application': 在应用注入器中注册（应用级单例）
   * - 'feature': 在功能模块注入器中注册（模块级单例）
   * - null: 不自动注册，需要手动配置
   */
  providedIn?: InjectorScope | null;

  /**
   * 工厂函数，用于创建实例
   */
  useFactory?: (...args: any[]) => any;

  /**
   * 工厂函数的依赖
   */
  deps?: any[];
}

/**
 * Injectable 元数据
 */
export interface InjectableMetadata extends InjectableOptions { }

/**
 * 元数据存储键
 */
const INJECTABLE_METADATA_KEY = Symbol('injectable');

/**
 * @Injectable 装饰器
 * 标记类为可注入的，并存储配置元数据
 *
 * @param options 可选的配置选项
 * @returns 类装饰器函数
 */
export function Injectable(options: InjectableOptions = {}): ClassDecorator {
  return function <T extends Function>(target: T): T {
    // 存储 Injectable 元数据
    Reflect.defineMetadata(INJECTABLE_METADATA_KEY, options, target);
    const providedIn = options.providedIn || 'root'
    if (providedIn === 'root') {
      const provide = target;
      if (options.useFactory) {
        root.set([{ provide: provide, useFactory: options.useFactory as any, deps: options.deps || [] }])
      } else {
        root.set([{ provide: provide, useClass: target as any }])
      }
    }
    return target;
  };
}

/**
 * 获取类的 Injectable 元数据
 *
 * @param target 目标类
 * @returns Injectable 元数据或 undefined
 */
export function getInjectableMetadata(
  target: any,
): InjectableMetadata | undefined {
  return Reflect.getMetadata(INJECTABLE_METADATA_KEY, target);
}

/**
 * 检查类是否被 @Injectable 装饰器标记
 *
 * @param target 目标类
 * @returns 是否为可注入类
 */
export function isInjectable(target: any): boolean {
  return Reflect.hasMetadata(INJECTABLE_METADATA_KEY, target);
}
