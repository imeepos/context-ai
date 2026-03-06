/**
 * OnDestroy 生命周期接口
 * 实现此接口的服务会在注入器销毁时被调用 ngOnDestroy 方法
 */
export interface OnDestroy {
  /**
   * 在实例销毁时调用的清理方法
   */
  onDestroy(): Promise<void> | void;
}

export function isOnDestroy(obj: any): obj is OnDestroy {
  if (!obj) return false;
  return typeof obj.onDestroy === 'function';
}

