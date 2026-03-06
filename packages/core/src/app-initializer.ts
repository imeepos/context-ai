import { InjectionToken } from './injection-token';

export interface Initializer {
  provide?: InjectionToken<any>;
  deps?: InjectionToken<any>[];
  init(): Promise<void> | void;
}

export const APP_INITIALIZER = new InjectionToken<Initializer[]>('APP_INITIALIZER');