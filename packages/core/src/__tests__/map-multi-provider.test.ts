import 'reflect-metadata';
import { describe, it, expect, beforeEach } from 'vitest';
import { EnvironmentInjector } from '../environment-injector';
import { MapInjectionToken, InjectionToken } from '../injection-token';
import { Injectable } from '../injectable';

describe('Map Multi Provider', () => {
  let injector: EnvironmentInjector;

  beforeEach(() => {
    injector = new EnvironmentInjector([]);
  });

  it('should support map multi provider with class keys', () => {
    @Injectable()
    class CacheStrategy {
      name = 'cache';
    }

    @Injectable()
    class RetryStrategy {
      name = 'retry';
    }

    const STRATEGIES = new MapInjectionToken<any, any>('strategies');

    injector.set([
      { provide: STRATEGIES, useClass: CacheStrategy, multi: 'map', mapKey: CacheStrategy },
      { provide: STRATEGIES, useClass: RetryStrategy, multi: 'map', mapKey: RetryStrategy },
    ]);

    const strategies = injector.get(STRATEGIES);

    expect(strategies).toBeInstanceOf(Map);
    expect(strategies.size).toBe(2);
    expect(strategies.get(CacheStrategy)).toBeInstanceOf(CacheStrategy);
    expect(strategies.get(RetryStrategy)).toBeInstanceOf(RetryStrategy);
    expect(strategies.get(CacheStrategy)!.name).toBe('cache');
    expect(strategies.get(RetryStrategy)!.name).toBe('retry');
  });

  it('should support map multi provider with InjectionToken keys', () => {
    const AUTH_TOKEN = new InjectionToken<string>('auth');
    const LOG_TOKEN = new InjectionToken<string>('log');
    const PLUGINS = new MapInjectionToken<InjectionToken<string>, string>('plugins');

    injector.set([
      { provide: PLUGINS, useValue: 'auth-plugin', multi: 'map', mapKey: AUTH_TOKEN },
      { provide: PLUGINS, useValue: 'log-plugin', multi: 'map', mapKey: LOG_TOKEN },
    ]);

    const plugins = injector.get(PLUGINS);

    expect(plugins).toBeInstanceOf(Map);
    expect(plugins.size).toBe(2);
    expect(plugins.get(AUTH_TOKEN)).toBe('auth-plugin');
    expect(plugins.get(LOG_TOKEN)).toBe('log-plugin');
  });

  it('should support map multi provider with symbol keys', () => {
    const AUTH_KEY = Symbol('auth');
    const LOG_KEY = Symbol('log');
    const PLUGINS = new MapInjectionToken<symbol, { enabled: boolean }>('plugins');

    injector.set([
      { provide: PLUGINS, useValue: { enabled: true }, multi: 'map', mapKey: AUTH_KEY },
      { provide: PLUGINS, useValue: { enabled: false }, multi: 'map', mapKey: LOG_KEY },
    ]);

    const plugins = injector.get(PLUGINS);

    expect(plugins).toBeInstanceOf(Map);
    expect(plugins.size).toBe(2);
    expect(plugins.get(AUTH_KEY)!.enabled).toBe(true);
    expect(plugins.get(LOG_KEY)!.enabled).toBe(false);
  });

  it('should support map multi provider with useFactory', () => {
    const KEY1 = 'key1';
    const KEY2 = 'key2';
    const PLUGINS = new MapInjectionToken<string, { id: number }>('plugins');

    injector.set([
      { provide: PLUGINS, useFactory: () => ({ id: 1 }), multi: 'map', mapKey: KEY1 },
      { provide: PLUGINS, useFactory: () => ({ id: 2 }), multi: 'map', mapKey: KEY2 },
    ]);

    const plugins = injector.get(PLUGINS);

    expect(plugins).toBeInstanceOf(Map);
    expect(plugins.get(KEY1)!.id).toBe(1);
    expect(plugins.get(KEY2)!.id).toBe(2);
  });

  it('should override when same mapKey is registered multiple times', () => {
    const KEY = 'auth';
    const PLUGINS = new MapInjectionToken<string, string>('plugins');

    injector.set([
      { provide: PLUGINS, useValue: 'first', multi: 'map', mapKey: KEY },
      { provide: PLUGINS, useValue: 'second', multi: 'map', mapKey: KEY },
    ]);

    const plugins = injector.get(PLUGINS);

    expect(plugins.size).toBe(1);
    expect(plugins.get(KEY)).toBe('second');
  });

  it('should throw error when mapKey is missing', () => {
    const PLUGINS = new MapInjectionToken<string, string>('plugins');

    expect(() => {
      injector.set([
        { provide: PLUGINS, useValue: 'value', multi: 'map' } as any,
      ]);
      injector.get(PLUGINS);
    }).toThrow(/requires a 'mapKey' field/);
  });

  it('should throw error when mixing map with array multi providers', () => {
    const PLUGINS = new MapInjectionToken<string, string>('plugins');

    expect(() => {
      injector.set([
        { provide: PLUGINS, useValue: 'array', multi: true },
        { provide: PLUGINS, useValue: 'map', multi: 'map', mapKey: 'test' },
      ]);
    }).toThrow(/Cannot mix different multi provider types/);
  });

  it('should throw error when mixing map with record multi providers', () => {
    const PLUGINS = new MapInjectionToken<string, string>('plugins');

    expect(() => {
      injector.set([
        { provide: PLUGINS, useValue: 'record', multi: 'record', key: 'test' },
        { provide: PLUGINS, useValue: 'map', multi: 'map', mapKey: 'test' },
      ]);
    }).toThrow(/Cannot mix different multi provider types/);
  });

  it('should not cache map multi provider results', () => {
    const KEY = 'counter';
    const PLUGINS = new MapInjectionToken<string, number>('plugins');
    let counter = 0;

    injector.set([
      { provide: PLUGINS, useFactory: () => ++counter, multi: 'map', mapKey: KEY },
    ]);

    const plugins1 = injector.get(PLUGINS);
    const plugins2 = injector.get(PLUGINS);

    // 每次 get 都会重新创建实例
    expect(plugins1.get(KEY)).toBe(1);
    expect(plugins2.get(KEY)).toBe(2);
  });

  it('should support Map API operations', () => {
    const KEY1 = 'key1';
    const KEY2 = 'key2';
    const PLUGINS = new MapInjectionToken<string, string>('plugins');

    injector.set([
      { provide: PLUGINS, useValue: 'value1', multi: 'map', mapKey: KEY1 },
      { provide: PLUGINS, useValue: 'value2', multi: 'map', mapKey: KEY2 },
    ]);

    const plugins = injector.get(PLUGINS);

    // Map API
    expect(plugins.has(KEY1)).toBe(true);
    expect(plugins.has(KEY2)).toBe(true);
    expect(plugins.has('nonexistent')).toBe(false);
    expect(plugins.size).toBe(2);

    // Iteration
    const keys = Array.from(plugins.keys());
    expect(keys).toEqual([KEY1, KEY2]);

    const values = Array.from(plugins.values());
    expect(values).toEqual(['value1', 'value2']);

    const entries = Array.from(plugins.entries());
    expect(entries).toEqual([
      [KEY1, 'value1'],
      [KEY2, 'value2'],
    ]);
  });

  it('should work with mixed key types', () => {
    @Injectable()
    class Strategy {}

    const TOKEN = new InjectionToken<string>('token');
    const SYMBOL = Symbol('symbol');
    const STRING = 'string';

    const MIXED = new MapInjectionToken<any, any>('mixed');

    injector.set([
      { provide: MIXED, useValue: 'class-value', multi: 'map', mapKey: Strategy },
      { provide: MIXED, useValue: 'token-value', multi: 'map', mapKey: TOKEN },
      { provide: MIXED, useValue: 'symbol-value', multi: 'map', mapKey: SYMBOL },
      { provide: MIXED, useValue: 'string-value', multi: 'map', mapKey: STRING },
    ]);

    const mixed = injector.get(MIXED);

    expect(mixed.size).toBe(4);
    expect(mixed.get(Strategy)).toBe('class-value');
    expect(mixed.get(TOKEN)).toBe('token-value');
    expect(mixed.get(SYMBOL)).toBe('symbol-value');
    expect(mixed.get(STRING)).toBe('string-value');
  });
});
