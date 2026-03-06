import 'reflect-metadata';
import { describe, it, expect, beforeEach } from 'vitest';
import { EnvironmentInjector } from '../environment-injector';
import { RecordInjectionToken } from '../injection-token';
import { Injectable } from '../injectable';

describe('Record Multi Provider', () => {
  let injector: EnvironmentInjector;

  beforeEach(() => {
    injector = new EnvironmentInjector([]);
  });

  it('should support record multi provider with useValue', () => {
    const PLUGINS = new RecordInjectionToken<{ name: string }>('plugins');

    injector.set([
      { provide: PLUGINS, useValue: { name: 'auth' }, multi: 'record', key: 'auth' },
      { provide: PLUGINS, useValue: { name: 'log' }, multi: 'record', key: 'log' },
      { provide: PLUGINS, useValue: { name: 'cache' }, multi: 'record', key: 'cache' },
    ]);

    const plugins = injector.get(PLUGINS);

    expect(plugins).toEqual({
      auth: { name: 'auth' },
      log: { name: 'log' },
      cache: { name: 'cache' },
    });
  });

  it('should support record multi provider with useClass', () => {
    @Injectable()
    class AuthPlugin {
      name = 'auth';
    }

    @Injectable()
    class LogPlugin {
      name = 'log';
    }

    const PLUGINS = new RecordInjectionToken<any>('plugins');

    injector.set([
      { provide: PLUGINS, useClass: AuthPlugin, multi: 'record', key: 'auth' },
      { provide: PLUGINS, useClass: LogPlugin, multi: 'record', key: 'log' },
    ]);

    const plugins = injector.get(PLUGINS);

    expect(plugins.auth).toBeInstanceOf(AuthPlugin);
    expect(plugins.log).toBeInstanceOf(LogPlugin);
    expect(plugins.auth.name).toBe('auth');
    expect(plugins.log.name).toBe('log');
  });

  it('should support record multi provider with useFactory', () => {
    const PLUGINS = new RecordInjectionToken<{ id: number }>('plugins');

    injector.set([
      { provide: PLUGINS, useFactory: () => ({ id: 1 }), multi: 'record', key: 'plugin1' },
      { provide: PLUGINS, useFactory: () => ({ id: 2 }), multi: 'record', key: 'plugin2' },
    ]);

    const plugins = injector.get(PLUGINS);

    expect(plugins).toEqual({
      plugin1: { id: 1 },
      plugin2: { id: 2 },
    });
  });

  it('should override when same key is registered multiple times', () => {
    const PLUGINS = new RecordInjectionToken<string>('plugins');

    injector.set([
      { provide: PLUGINS, useValue: 'first', multi: 'record', key: 'auth' },
      { provide: PLUGINS, useValue: 'second', multi: 'record', key: 'auth' },
    ]);

    const plugins = injector.get(PLUGINS);

    expect(plugins.auth).toBe('second');
  });

  it('should throw error when key is missing', () => {
    const PLUGINS = new RecordInjectionToken<string>('plugins');

    expect(() => {
      injector.set([
        { provide: PLUGINS, useValue: 'value', multi: 'record' } as any,
      ]);
      injector.get(PLUGINS);
    }).toThrow(/requires a 'key' field/);
  });

  it('should throw error when mixing array and record multi providers', () => {
    const PLUGINS = new RecordInjectionToken<string>('plugins');

    expect(() => {
      injector.set([
        { provide: PLUGINS, useValue: 'array', multi: true },
        { provide: PLUGINS, useValue: 'record', multi: 'record', key: 'test' },
      ]);
    }).toThrow(/Cannot mix different multi provider types/);
  });

  it('should allow direct key access', () => {
    const PLUGINS = new RecordInjectionToken<{ enabled: boolean }>('plugins');

    injector.set([
      { provide: PLUGINS, useValue: { enabled: true }, multi: 'record', key: 'auth' },
      { provide: PLUGINS, useValue: { enabled: false }, multi: 'record', key: 'log' },
    ]);

    const plugins = injector.get(PLUGINS);

    expect(plugins.auth!.enabled).toBe(true);
    expect(plugins.log!.enabled).toBe(false);
  });

  it('should not cache record multi provider results', () => {
    const PLUGINS = new RecordInjectionToken<number>('plugins');
    let counter = 0;

    injector.set([
      { provide: PLUGINS, useFactory: () => ++counter, multi: 'record', key: 'counter' },
    ]);

    const plugins1 = injector.get(PLUGINS);
    const plugins2 = injector.get(PLUGINS);

    // 每次 get 都会重新创建实例
    expect(plugins1.counter).toBe(1);
    expect(plugins2.counter).toBe(2);
  });

  it('should work with complex types', () => {
    interface Plugin {
      name: string;
      version: string;
      enable(): void;
    }

    @Injectable()
    class AuthPlugin implements Plugin {
      name = 'auth';
      version = '1.0.0';
      enable() {
        console.log('Auth enabled');
      }
    }

    const PLUGINS = new RecordInjectionToken<Plugin>('plugins');

    injector.set([
      { provide: PLUGINS, useClass: AuthPlugin, multi: 'record', key: 'auth' },
    ]);

    const plugins = injector.get(PLUGINS);

    expect(plugins.auth!.name).toBe('auth');
    expect(plugins.auth!.version).toBe('1.0.0');
    expect(typeof plugins.auth!.enable).toBe('function');
  });
});
