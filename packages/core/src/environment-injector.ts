import { Injector, isType } from './injector';
import type { InjectionTokenType, Type } from './injector';
import { NullInjector } from './null-injector';
import type { Provider } from './provider';
import { getInjectableMetadata } from './injectable';
import type { InjectorScope } from './injectable';
import { getInjectMetadata, getInjectOptionsMetadata } from './inject';
import type { InjectOptions } from './inject-options';
import {
  InternalInjectFlags,
  convertInjectOptionsToFlags,
  hasFlag,
} from './internal-inject-flags';
import { isOnDestroy } from './lifecycle';
import {
  resolveForwardRefCached,
  resolveForwardRefsInDeps,
} from './forward-ref';
import { hasOnInitMetadata, isOnInit } from './on-init';
import { APP_INITIALIZER } from './app-initializer';
import type { Initializer } from './app-initializer';
import { InitializerGraph } from './initializer-graph';

import { EnvironmentInjectorUtils } from './environment-injector-utils';

/**
 * 环境注入器，提供全局作用域的依赖管理
 * 支持多种提供者类型、实例缓存和多值注入
 */
export class EnvironmentInjector extends Injector {
  private readonly instances = new Map<any, any>();
  private readonly providers = new Map<any, Provider[]>();
  private readonly autoResolvedClasses = new Set<any>();
  private readonly resolvingTokens = new Set<any>();
  private readonly dependencyPath: any[] = [];
  private isDestroyed = false;

  /**
   * 注入器作用域，决定如何处理 providedIn 服务
   */
  public readonly scope: InjectorScope;

  constructor(
    providers: Provider[],
    parent?: Injector,
    scope: InjectorScope = 'root',
  ) {
    super(parent || new NullInjector());
    this.scope = scope;
    this.setupProviders([...providers, { provide: Injector, useValue: this }]);
  }

  /**
   * 创建支持自动提供者解析的环境注入器
   *
   * 这个静态方法会自动解析标记为 @Injectable({ providedIn: 'auto' }) 等的服务，
   * 无需手动在 providers 数组中注册这些服务。
   *
   * @param manualProviders 手动注册的提供者数组
   * @param parent 可选的父注入器
   * @param scope 注入器作用域，默认为 'auto'
   * @returns 新的环境注入器实例
   */
  static createWithAutoProviders(
    manualProviders: Provider[],
    parent?: Injector,
    scope: InjectorScope = 'auto',
  ): EnvironmentInjector {
    return new EnvironmentInjector(manualProviders, parent, scope);
  }

  /**
   * 全局根注入器实例（单例）
   */
  private static rootInjectorInstance: EnvironmentInjector | null = null;

  /**
   * 全局平台注入器实例（单例）
   */
  private static platformInjectorInstance: EnvironmentInjector | null = null;

  /**
   * 创建根注入器（全局单例）
   *
   * 根注入器是基础层注入器，全局唯一，通常作为平台注入器的父级。
   * 标记为 @Injectable({ providedIn: 'root' }) 的服务会在此注入器中注册。
   *
   * @param providers 根级提供者数组
   * @returns 全局唯一的根注入器实例
   * @throws Error 如果根注入器已经存在
   */
  static createRootInjector(providers: Provider[] = []): EnvironmentInjector {
    if (this.rootInjectorInstance) {
      throw new Error(
        'Root injector already exists! Root injector must be globally unique.',
      );
    }
    this.rootInjectorInstance = new EnvironmentInjector(
      providers,
      new NullInjector(),
      'root',
    );
    return this.rootInjectorInstance;
  }

  /**
   * 获取全局根注入器实例
   *
   * @returns 根注入器实例，如果不存在则返回 null
   */
  static getRootInjector(): EnvironmentInjector | null {
    return this.rootInjectorInstance;
  }

  /**
   * 重置平台注入器（主要用于测试）
   *
   * @internal 仅供内部使用
   */
  static resetPlatformInjector(): void {
    if (this.platformInjectorInstance) {
      this.platformInjectorInstance.destroy();
      this.platformInjectorInstance = null;
    }
  }

  /**
   * 重置根注入器和平台注入器（主要用于测试）
   *
   * @internal 仅供内部使用
   */
  static resetRootInjector(): void {
    // 先重置平台注入器（因为它依赖根注入器）
    this.resetPlatformInjector();

    if (this.rootInjectorInstance) {
      this.rootInjectorInstance.destroy();
      this.rootInjectorInstance = null;
    }
  }

  /**
   * 创建平台注入器（全局单例）
   *
   * 平台注入器用于存储跨应用共享的服务，全局唯一，自动使用全局根注入器作为父级。
   * 标记为 @Injectable({ providedIn: 'platform' }) 的服务会在此注入器中注册。
   *
   * @param providers 平台级提供者数组
   * @returns 全局唯一的平台注入器实例
   * @throws Error 如果平台注入器已经存在或全局根注入器不存在
   */
  static createPlatformInjector(
    providers: Provider[] = [],
  ): EnvironmentInjector {
    if (this.platformInjectorInstance) {
      throw new Error(
        'Platform injector already exists! Platform injector must be globally unique.',
      );
    }

    // 检查是否存在全局根注入器
    const globalRootInjector = this.getRootInjector();
    if (!globalRootInjector) {
      throw new Error(
        'Root injector not found! Please create a root injector first using createRootInjector() before creating platform injector.',
      );
    }

    this.platformInjectorInstance = new EnvironmentInjector(
      providers,
      globalRootInjector,
      'platform',
    );
    return this.platformInjectorInstance;
  }

  /**
   * 获取全局平台注入器实例
   *
   * @returns 平台注入器实例，如果不存在则返回 null
   */
  static getPlatformInjector(): EnvironmentInjector | null {
    return this.platformInjectorInstance;
  }

  /**
   * 创建应用注入器
   *
   * 应用注入器以全局平台注入器为父级，用于存储应用级的服务。
   * 标记为 @Injectable({ providedIn: 'application' }) 的服务会在此注入器中注册。
   *
   * @param providers 应用级提供者数组
   * @returns 新的应用注入器实例
   * @throws Error 如果全局平台注入器不存在
   */
  static createApplicationInjector(
    providers: Provider[] = [],
  ): EnvironmentInjector {
    // 检查是否存在全局平台注入器
    const globalPlatformInjector = this.getPlatformInjector();
    if (!globalPlatformInjector) {
      throw new Error(
        'Platform injector not found! Please create a platform injector first using createPlatformInjector() before creating application injector.',
      );
    }
    return new EnvironmentInjector(
      providers,
      globalPlatformInjector,
      'application',
    );
  }

  /**
   * 创建功能模块注入器
   *
   * 功能注入器通常以应用注入器为父级，用于存储功能模块级的服务。
   *
   * @param providers 功能模块级提供者数组
   * @param parentInjector 父注入器（通常是应用注入器）
   * @returns 新的功能注入器实例
   */
  static createFeatureInjector(
    providers: Provider[],
    parentInjector: Injector,
  ): EnvironmentInjector {
    return new EnvironmentInjector(providers, parentInjector, 'feature');
  }

  /**
   * 获取指定令牌的依赖实例
   * @param token 注入令牌
   * @returns 依赖实例
   */
  get<T>(token: InjectionTokenType<T>, def?: T): T {
    // 解析ForwardRef
    const resolvedToken = resolveForwardRefCached(token);
    this.validateToken(resolvedToken);
    const tokenName = this.getTokenName(resolvedToken);
    // 检查注入器是否已销毁
    if (this.isDestroyed) {
      throw new Error('注入器已销毁');
    }
    // 检查缓存
    if (this.instances.has(resolvedToken)) {
      const instance = this.instances.get(resolvedToken);
      return instance;
    }

    // 检查循环依赖
    if (this.resolvingTokens.has(resolvedToken)) {
      const pathStr = this.dependencyPath
        .map((t) => this.getTokenName(t))
        .join(' -> ');
      const errorMessage = `检测到循环依赖: ${pathStr} -> ${tokenName}`;
      throw new Error(errorMessage);
    }

    // 开始解析此令牌
    this.resolvingTokens.add(resolvedToken);
    this.dependencyPath.push(resolvedToken);

    try {
      let result: T;

      // 查找提供者
      const tokenProviders = this.providers.get(resolvedToken);
      if (tokenProviders) {
        result = this.createInstance(resolvedToken, tokenProviders);
        // 非多值提供者才缓存实例
        if (!EnvironmentInjectorUtils.isMultiProvider(tokenProviders)) {
          this.instances.set(resolvedToken, result);
        }
      } else {
        // 尝试自动解析 providedIn 服务
        const autoProvider = this.tryAutoResolveProvider(resolvedToken);
        if (autoProvider) {
          this.providers.set(resolvedToken, [autoProvider]);
          result = this.createInstance(resolvedToken, [autoProvider]);
          this.instances.set(resolvedToken, result);
        } else {
          // 委托给父注入器
          result = this.parent!.get(resolvedToken, def);
        }
      }

      return result;
    } finally {
      // 清理解析状态
      this.resolvingTokens.delete(resolvedToken);
      this.dependencyPath.pop();
    }
  }

  /**
   * 设置提供者映射
   */
  private setupProviders(providers: Provider[]): void {
    providers.forEach((provider) => {
      this.validateToken(provider.provide);
      const existing = this.providers.get(provider.provide) || [];
      const updated = [...existing, provider];
      // 验证 Provider 一致性
      EnvironmentInjectorUtils.validateProviderConsistency(updated);
      this.providers.set(provider.provide, updated);
    });
  }

  set(providers: (Provider | Type<any>)[]): void {
    const list = providers.map(it => {
      if (isType(it)) {
        return { provide: it, useClass: it } as Provider
      }
      return it as Provider;
    })
    this.setupProviders(list)
  }

  /**
   * 根据提供者创建实例
   */
  private createInstance<T>(
    _token: InjectionTokenType<T>,
    providers: Provider[],
  ): T {
    // Set 模式
    if (EnvironmentInjectorUtils.isSetProvider(providers)) {
      const set = new Set<any>();
      for (const p of providers) {
        if (p.multi !== 'set') continue;
        set.add(this.createSingleInstance(p));
      }
      return set as T;
    }

    // Map 模式
    if (EnvironmentInjectorUtils.isMapProvider(providers)) {
      const map = new Map<any, any>();
      for (const p of providers) {
        if (p.multi !== 'map') continue;
        EnvironmentInjectorUtils.validateMapProvider(p);
        // 后注册的覆盖先注册的（与单值行为一致）
        map.set(p.mapKey, this.createSingleInstance(p));
      }
      return map as T;
    }

    // Record 模式
    if (EnvironmentInjectorUtils.isRecordProvider(providers)) {
      const record: Record<string, any> = {};
      for (const p of providers) {
        if (p.multi !== 'record') continue;
        EnvironmentInjectorUtils.validateRecordProvider(p);
        // 后注册的覆盖先注册的（与单值行为一致）
        record[p.key!] = this.createSingleInstance(p);
      }
      return record as T;
    }

    // 数组模式（原有逻辑）
    if (EnvironmentInjectorUtils.isArrayProvider(providers)) {
      return providers
        .filter(p => p.multi === true)
        .map((p) => this.createSingleInstance(p)) as any;
    }

    // 对于非多值注入，使用最后注册的提供者（后面的覆盖前面的）
    const lastProvider = providers[providers.length - 1];
    if (!lastProvider) {
      throw new Error(`No provider found for token: ${String(_token)}`);
    }
    return this.createSingleInstance(lastProvider);
  }

  /**
   * 根据单个提供者创建实例
   */
  private createSingleInstance<T>(provider: Provider): T {
    if ('useValue' in provider) {
      return provider.useValue;
    }

    if ('useClass' in provider) {
      const resolvedClass = resolveForwardRefCached(provider.useClass);
      return this.createInstanceWithDI(resolvedClass);
    }

    if ('useFactory' in provider) {
      const resolvedDeps = resolveForwardRefsInDeps(provider.deps);
      const deps = (resolvedDeps || []).map((dep) => this.get(dep));
      return provider.useFactory(...deps);
    }

    if ('useExisting' in provider) {
      const resolvedExisting = resolveForwardRefCached(provider.useExisting);
      return this.get(resolvedExisting);
    }

    // ConstructorProvider
    return this.createInstanceWithDI(provider.provide as any);
  }

  /**
   * 使用依赖注入创建类实例
   */
  private createInstanceWithDI<T>(
    ClassConstructor: new (...args: any[]) => T,
  ): T {
    // 获取注入元数据
    const injectMetadata = getInjectMetadata(ClassConstructor);
    const injectOptions = getInjectOptionsMetadata(ClassConstructor);

    if (!injectMetadata || injectMetadata.length === 0) {
      // 没有依赖，直接创建
      const instance = new ClassConstructor();
      return instance;
    }

    // 解析所有依赖
    const dependencies = injectMetadata.map((token, index) => {
      if (token === undefined) {
        throw new Error(
          `Cannot resolve dependency at index ${index} for ${ClassConstructor.name}. Make sure to use @Inject() decorator.`,
        );
      }

      const options = injectOptions?.[index] || {};
      const resolvedToken = resolveForwardRefCached(token);
      return this.resolveDependency(resolvedToken, options);
    });

    const instance = new ClassConstructor(...dependencies);
    return instance;
  }

  /**
   * 根据注入选项解析依赖
   * 支持 optional, skipSelf, self, host 选项
   * 🚀 使用位标志优化性能
   */
  private resolveDependency<T>(
    token: InjectionTokenType<T>,
    options: InjectOptions,
  ): T;

  /**
   * 根据内部标志位解析依赖 (性能优化版本)
   * 🚀 直接使用位标志，避免对象属性检查和转换开销
   */
  private resolveDependency<T>(
    token: InjectionTokenType<T>,
    flags: InternalInjectFlags,
  ): T;

  /**
   * 实际的依赖解析实现
   */
  private resolveDependency<T>(
    token: InjectionTokenType<T>,
    optionsOrFlags: InjectOptions | InternalInjectFlags,
  ): T {
    // 🚀 性能优化：统一处理为位标志
    let flags: InternalInjectFlags;

    if (typeof optionsOrFlags === 'number') {
      // 已经是位标志，直接使用
      flags = optionsOrFlags;
    } else {
      // 是选项对象，需要验证和转换
      EnvironmentInjectorUtils.validateInjectOptions(optionsOrFlags);
      flags = convertInjectOptionsToFlags(optionsOrFlags);
    }

    try {
      // 🚀 使用位运算代替对象属性检查，提高性能
      if (hasFlag(flags, InternalInjectFlags.SkipSelf)) {
        // skipSelf: 跳过当前注入器，从父注入器开始查找
        return this.parent!.get(token);
      }

      if (hasFlag(flags, InternalInjectFlags.Self)) {
        // self: 只在当前注入器查找，不查找父注入器
        return this.getSelf(token);
      }

      if (hasFlag(flags, InternalInjectFlags.Host)) {
        // host: 在宿主注入器（根注入器）中查找
        return this.getFromHost(token);
      }

      // 默认行为：正常的层次化查找
      return this.get(token);
    } catch (error) {
      // 🚀 使用位运算检查可选标志
      if (hasFlag(flags, InternalInjectFlags.Optional)) {
        return null as any;
      }
      throw error;
    }
  }

  /**
   * 只在当前注入器中查找，不查找父注入器
   */
  private getSelf<T>(token: InjectionTokenType<T>): T {
    // 检查注入器是否已销毁
    if (this.isDestroyed) {
      throw new Error('注入器已销毁');
    }

    // 检查缓存
    if (this.instances.has(token)) {
      return this.instances.get(token);
    }

    // 检查循环依赖
    if (this.resolvingTokens.has(token)) {
      const tokenName = this.getTokenName(token);
      const pathStr = this.dependencyPath
        .map((t) => this.getTokenName(t))
        .join(' -> ');
      throw new Error(`检测到循环依赖: ${pathStr} -> ${tokenName}`);
    }

    // 开始解析此令牌
    this.resolvingTokens.add(token);
    this.dependencyPath.push(token);

    try {
      // 只查找当前注入器的提供者，不查找父注入器
      const tokenProviders = this.providers.get(token);
      if (tokenProviders) {
        const result = this.createInstance(token, tokenProviders);
        // 非多值提供者才缓存实例
        if (!EnvironmentInjectorUtils.isMultiProvider(tokenProviders)) {
          this.instances.set(token, result);
        }
        return result;
      }

      // 尝试自动解析 providedIn 服务
      const autoProvider = this.tryAutoResolveProvider(token);
      if (autoProvider) {
        this.providers.set(token, [autoProvider]);
        const result = this.createInstance(token, [autoProvider]);
        this.instances.set(token, result);
        return result;
      }

      // self 选项不允许查找父注入器，直接抛出错误
      const tokenName = this.getTokenName(token);
      throw new Error(`No provider for ${tokenName}!`);
    } finally {
      // 清理解析状态
      this.resolvingTokens.delete(token);
      this.dependencyPath.pop();
    }
  }

  /**
   * 在宿主注入器（根注入器）中查找依赖
   * host 选项查找最顶层的父注入器，如果没有父注入器，则查找不到
   */
  private getFromHost<T>(token: InjectionTokenType<T>): T {
    // 找到根注入器（宿主注入器）
    let hostInjector: Injector = this;
    while (
      hostInjector.parent &&
      !(hostInjector.parent instanceof NullInjector)
    ) {
      hostInjector = hostInjector.parent;
    }

    // 如果宿主注入器就是当前注入器（即没有父注入器），
    // 那么 host 应该查找不到，直接抛出错误
    if (hostInjector === this) {
      const tokenName = this.getTokenName(token);
      throw new Error(`No provider for ${tokenName}!`);
    }

    // 如果宿主注入器是其他 EnvironmentInjector，使用其 get 方法
    if (hostInjector instanceof EnvironmentInjector) {
      return hostInjector.get(token);
    }

    // 如果宿主注入器不是 EnvironmentInjector，委托给其 get 方法
    return hostInjector.get(token);
  }
  /**
   * 初始化注入器，调用所有标记 @OnInit() 的服务的 onModelInit() 方法
   *
   * 策略：
   * 1. 执行所有 APP_INITIALIZER（按依赖顺序）
   * 2. 初始化所有 @OnInit 服务
   *
   * 优势：
   * - 支持初始化顺序控制
   * - 严格的错误处理
   * - 避免过早实例化：只创建标记 @OnInit() 的服务
   * - 零运行时开销：基于编译时元数据
   */
  async init(): Promise<void> {
    await this.runAppInitializers();
    await this.runOnInitServices();
  }

  private async runAppInitializers(): Promise<void> {
    const initializers: Initializer[] = this.get(APP_INITIALIZER, []) || [];
    if (initializers.length === 0) {
      return;
    }

    const graph = new InitializerGraph();

    for (const initializer of initializers) {
      const token = initializer.provide || initializer;
      const initFn = () => initializer.init();
      const dependencies = new Set(initializer.deps || []);

      graph.addNode(token, initFn, { dependencies });
    }

    await graph.execute();
  }

  private async runOnInitServices(): Promise<void> {
    const initializedInstances = new Set<any>();

    for (const instance of this.instances.values()) {
      if (isOnInit(instance)) {
        await this.initInstance(instance);
        initializedInstances.add(instance);
      }
    }

    for (const [token, providers] of this.providers.entries()) {
      for (const provider of providers) {
        const targetClass = this.extractClassFromProvider(provider);
        if (targetClass && hasOnInitMetadata(targetClass)) {
          const instance = this.get(token);

          if (!initializedInstances.has(instance) && isOnInit(instance)) {
            await this.initInstance(instance);
            initializedInstances.add(instance);
          }
        }
      }
    }
  }

  /**
   * 从 Provider 中提取类定义
   */
  private extractClassFromProvider(provider: Provider): any {
    if ('useClass' in provider) {
      return resolveForwardRefCached(provider.useClass);
    }

    // useFactory: 检查 provider.provide 本身是否是带有 @OnInit() 元数据的类
    if ('useFactory' in provider && typeof provider.provide === 'function') {
      return provider.provide;
    }

    // ConstructorProvider（直接使用 provide 作为类）
    if (
      !('useValue' in provider) &&
      !('useFactory' in provider) &&
      !('useExisting' in provider) &&
      typeof provider.provide === 'function'
    ) {
      return provider.provide;
    }

    return null;
  }

  /**
   * 初始化单个实例（严格模式）
   */
  private async initInstance(instance: any): Promise<void> {
    try {
      await instance.onInit();
    } catch (error) {
      const instanceName = instance.constructor?.name || 'Unknown';
      const errorMsg = error instanceof Error ? error.message : String(error);
      throw new Error(
        `@OnInit 服务初始化失败 [${instanceName}]: ${errorMsg}`
      );
    }
  }

  /**
   * 销毁注入器，清理所有实例并调用 OnDestroy 生命周期钩子
   */
  async destroy(): Promise<void> {
    if (this.isDestroyed) {
      return; // 防止重复销毁
    }

    this.isDestroyed = true;

    // 销毁所有普通实例
    for (const instance of this.instances.values()) {
      await this.destroyInstance(instance);
    }
    // 清理所有数据结构
    this.instances.clear();
    this.resolvingTokens.clear();
    this.dependencyPath.length = 0;
  }

  /**
   * 销毁单个实例
   */
  private async destroyInstance(instance: any): Promise<void> {
    try {
      // 检查是否实现了 OnDestroy 接口
      if (isOnDestroy(instance)) {
        await instance.onDestroy();
      }
    } catch (error) {
      // 吞没销毁过程中的错误，不影响其他实例的销毁
      // 在生产环境中可以考虑记录日志
    }
  }

  /**
   * 获取令牌的可读名称，用于错误消息
   */
  private getTokenName(token: any): string {
    return EnvironmentInjectorUtils.getTokenName(token);
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

  /**
   * 尝试自动解析 providedIn 服务
   */
  private tryAutoResolveProvider(token: any): Provider | null {
    // 处理 InjectionToken（检查是否有 factory）
    if (token && typeof token === 'object' && 'factory' in token) {
      const factory = token.factory;

      // 如果有 factory，使用 factory 作为默认值
      if (factory && typeof factory === 'function') {
        // 避免重复解析
        if (this.autoResolvedClasses.has(token)) {
          return null;
        }

        this.autoResolvedClasses.add(token);

        return {
          provide: token,
          useFactory: factory,
          deps: [],
        };
      }

      return null;
    }

    // 处理函数/类类型的令牌
    if (typeof token !== 'function') {
      return null;
    }

    // 避免重复解析同一个类
    if (this.autoResolvedClasses.has(token)) {
      return null;
    }

    // 获取 Injectable 元数据
    const metadata = getInjectableMetadata(token);
    if (!metadata || metadata.providedIn === null) {
      return null;
    }

    // 检查作用域匹配
    if (!this.shouldAutoResolve(metadata.providedIn)) {
      return null;
    }

    // 标记为已解析，避免循环
    this.autoResolvedClasses.add(token);

    // 创建提供者
    if (metadata.useFactory) {
      return {
        provide: token,
        useFactory: metadata.useFactory,
        deps: metadata.deps || [],
      };
    } else {
      return {
        provide: token,
        useClass: token,
      };
    }
  }

  /**
   * 判断是否应该在当前注入器中自动解析指定作用域的服务
   */
  private shouldAutoResolve(
    providedIn: InjectorScope | null | undefined,
  ): boolean {
    if (providedIn === null) {
      return false;
    }
    return providedIn === 'auto' || this.scope === providedIn;
  }
}


export const root = EnvironmentInjector.createRootInjector([]);
