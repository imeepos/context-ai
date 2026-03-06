import 'reflect-metadata';
import { describe, it, expect, beforeEach } from 'vitest';
import { EnvironmentInjector } from '../environment-injector';
import { SetInjectionToken } from '../injection-token';
import { Injectable } from '../injectable';

describe('Set Multi Provider', () => {
  let injector: EnvironmentInjector;

  beforeEach(() => {
    injector = new EnvironmentInjector([]);
  });

  it('should support set multi provider with useValue', () => {
    const PLUGINS = new SetInjectionToken<string>('plugins');

    injector.set([
      { provide: PLUGINS, useValue: 'auth', multi: 'set' },
      { provide: PLUGINS, useValue: 'log', multi: 'set' },
      { provide: PLUGINS, useValue: 'cache', multi: 'set' },
    ]);

    const plugins = injector.get(PLUGINS);

    expect(plugins).toBeInstanceOf(Set);
    expect(plugins.size).toBe(3);
    expect(plugins.has('auth')).toBe(true);
    expect(plugins.has('log')).toBe(true);
    expect(plugins.has('cache')).toBe(true);
  });

  it('should support set multi provider with useClass', () => {
    @Injectable()
    class AuthPlugin {
      name = 'auth';
    }

    @Injectable()
    class LogPlugin {
      name = 'log';
    }

    const PLUGINS = new SetInjectionToken<any>('plugins');

    injector.set([
      { provide: PLUGINS, useClass: AuthPlugin, multi: 'set' },
      { provide: PLUGINS, useClass: LogPlugin, multi: 'set' },
    ]);

    const plugins = injector.get(PLUGINS);

    expect(plugins).toBeInstanceOf(Set);
    expect(plugins.size).toBe(2);

    const pluginsArray = Array.from(plugins);
    expect(pluginsArray[0]).toBeInstanceOf(AuthPlugin);
    expect(pluginsArray[1]).toBeInstanceOf(LogPlugin);
  });

  it('should support set multi provider with useFactory', () => {
    const PLUGINS = new SetInjectionToken<{ id: number }>('plugins');

    injector.set([
      { provide: PLUGINS, useFactory: () => ({ id: 1 }), multi: 'set' },
      { provide: PLUGINS, useFactory: () => ({ id: 2 }), multi: 'set' },
    ]);

    const plugins = injector.get(PLUGINS);

    expect(plugins).toBeInstanceOf(Set);
    expect(plugins.size).toBe(2);
  });

  it('should deduplicate primitive values automatically', () => {
    const PLUGINS = new SetInjectionToken<string>('plugins');

    injector.set([
      { provide: PLUGINS, useValue: 'auth', multi: 'set' },
      { provide: PLUGINS, useValue: 'log', multi: 'set' },
      { provide: PLUGINS, useValue: 'auth', multi: 'set' }, // 重复
      { provide: PLUGINS, useValue: 'cache', multi: 'set' },
    ]);

    const plugins = injector.get(PLUGINS);

    expect(plugins.size).toBe(3); // 不是 4
    expect(plugins.has('auth')).toBe(true);
    expect(plugins.has('log')).toBe(true);
    expect(plugins.has('cache')).toBe(true);
  });

  it('should deduplicate same object reference', () => {
    const PLUGINS = new SetInjectionToken<{ name: string }>('plugins');
    const authPlugin = { name: 'auth' };

    injector.set([
      { provide: PLUGINS, useValue: authPlugin, multi: 'set' },
      { provide: PLUGINS, useValue: { name: 'log' }, multi: 'set' },
      { provide: PLUGINS, useValue: authPlugin, multi: 'set' }, // 相同引用
    ]);

    const plugins = injector.get(PLUGINS);

    expect(plugins.size).toBe(2); // 相同引用被去重
  });

  it('should not deduplicate different object instances', () => {
    const PLUGINS = new SetInjectionToken<{ name: string }>('plugins');

    injector.set([
      { provide: PLUGINS, useValue: { name: 'auth' }, multi: 'set' },
      { provide: PLUGINS, useValue: { name: 'auth' }, multi: 'set' }, // 不同实例
    ]);

    const plugins = injector.get(PLUGINS);

    expect(plugins.size).toBe(2); // 不同对象实例不会去重
  });

  it('should throw error when mixing set with array multi providers', () => {
    const PLUGINS = new SetInjectionToken<string>('plugins');

    expect(() => {
      injector.set([
        { provide: PLUGINS, useValue: 'array', multi: true },
        { provide: PLUGINS, useValue: 'set', multi: 'set' },
      ]);
    }).toThrow(/Cannot mix different multi provider types/);
  });

  it('should throw error when mixing set with record multi providers', () => {
    const PLUGINS = new SetInjectionToken<string>('plugins');

    expect(() => {
      injector.set([
        { provide: PLUGINS, useValue: 'record', multi: 'record', key: 'test' },
        { provide: PLUGINS, useValue: 'set', multi: 'set' },
      ]);
    }).toThrow(/Cannot mix different multi provider types/);
  });

  it('should throw error when mixing set with map multi providers', () => {
    const PLUGINS = new SetInjectionToken<string>('plugins');

    expect(() => {
      injector.set([
        { provide: PLUGINS, useValue: 'map', multi: 'map', mapKey: 'test' },
        { provide: PLUGINS, useValue: 'set', multi: 'set' },
      ]);
    }).toThrow(/Cannot mix different multi provider types/);
  });

  it('should not cache set multi provider results', () => {
    const PLUGINS = new SetInjectionToken<number>('plugins');
    let counter = 0;

    injector.set([
      { provide: PLUGINS, useFactory: () => ++counter, multi: 'set' },
    ]);

    const plugins1 = injector.get(PLUGINS);
    const plugins2 = injector.get(PLUGINS);

    // 每次 get 都会重新创建实例
    expect(Array.from(plugins1)[0]).toBe(1);
    expect(Array.from(plugins2)[0]).toBe(2);
  });

  it('should support Set API operations', () => {
    const PLUGINS = new SetInjectionToken<string>('plugins');

    injector.set([
      { provide: PLUGINS, useValue: 'auth', multi: 'set' },
      { provide: PLUGINS, useValue: 'log', multi: 'set' },
      { provide: PLUGINS, useValue: 'cache', multi: 'set' },
    ]);

    const plugins = injector.get(PLUGINS);

    // Set API
    expect(plugins.has('auth')).toBe(true);
    expect(plugins.has('log')).toBe(true);
    expect(plugins.has('nonexistent')).toBe(false);
    expect(plugins.size).toBe(3);

    // Iteration
    const values = Array.from(plugins.values());
    expect(values).toEqual(['auth', 'log', 'cache']);

    // forEach
    const collected: string[] = [];
    plugins.forEach((value) => collected.push(value));
    expect(collected).toEqual(['auth', 'log', 'cache']);

    // for...of
    const iterated: string[] = [];
    for (const plugin of plugins) {
      iterated.push(plugin);
    }
    expect(iterated).toEqual(['auth', 'log', 'cache']);
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

    const PLUGINS = new SetInjectionToken<Plugin>('plugins');

    injector.set([
      { provide: PLUGINS, useClass: AuthPlugin, multi: 'set' },
    ]);

    const plugins = injector.get(PLUGINS);

    expect(plugins.size).toBe(1);
    const plugin = Array.from(plugins)[0]!;
    expect(plugin.name).toBe('auth');
    expect(plugin.version).toBe('1.0.0');
    expect(typeof plugin.enable).toBe('function');
  });
});
