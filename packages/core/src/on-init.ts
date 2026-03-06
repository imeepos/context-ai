/**
 * OnInit 元数据键
 */
const ON_INIT_METADATA_KEY = Symbol('onInit');

/**
 * @OnInit() 装饰器
 *
 * 标记类需要在注入器初始化时调用 onModelInit() 方法
 * 避免过早实例化，仅在 init() 扫描时按需创建实例
 *
 * @example
 * ```typescript
 * @Injectable()
 * @OnInit()
 * class DatabaseService implements onModelInit {
 *   async onModelInit() {
 *     await this.connect();
 *   }
 * }
 * ```
 */
export function OnInit(): ClassDecorator {
  return function <T extends Function>(target: T): T {
    Reflect.defineMetadata(ON_INIT_METADATA_KEY, true, target);
    return target;
  };
}

/**
 * 检查类是否标记了 @OnInit() 装饰器
 *
 * @param target 目标类
 * @returns 是否需要初始化
 */
export function hasOnInitMetadata(target: any): boolean {
  if (!target || typeof target !== 'function') {
    return false;
  }
  return Reflect.getMetadata(ON_INIT_METADATA_KEY, target) === true;
}


export interface OnInit {
  onInit(): Promise<void>;
}

export function isOnInit(obj: any): obj is OnInit {
  if (!obj) return false;
  return typeof obj.onInit === 'function';
}