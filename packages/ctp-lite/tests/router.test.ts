import { describe, it, expect, beforeEach } from 'vitest';
import { Router } from '../src/core/router';
import { Context } from '../src/components';

describe('Router', () => {
  let router: Router;

  beforeEach(() => {
    router = new Router();
  });

  it('should register and navigate to routes', async () => {
    router.register('home', () => Context({ name: 'Home' }));
    const result = await router.navigate('home');
    expect(result.props.name).toBe('Home');
  });

  it('should throw on unknown route', async () => {
    await expect(router.navigate('unknown')).rejects.toThrow('Route not found: unknown');
  });

  it('should register multiple routes', async () => {
    router.registerRoutes({
      home: () => Context({ name: 'Home' }),
      about: () => Context({ name: 'About' })
    });

    const about = await router.navigate('about');
    expect(about.props.name).toBe('About');
  });

  it('should track current route', async () => {
    router.register('test', () => Context({ name: 'Test' }));
    await router.navigate('test');
    expect(router.currentRoute()).toBe('test');
  });

  it('should navigate back in history', async () => {
    router.registerRoutes({
      page1: () => Context({ name: 'Page 1' }),
      page2: () => Context({ name: 'Page 2' })
    });

    await router.navigate('page1');
    await router.navigate('page2');
    const back = await router.back();

    expect(back?.props.name).toBe('Page 1');
    expect(router.currentRoute()).toBe('page1');
  });

  it('should return null when no history', async () => {
    const result = await router.back();
    expect(result).toBeNull();
  });

  it('should get history', async () => {
    router.registerRoutes({
      a: () => Context({ name: 'A' }),
      b: () => Context({ name: 'B' })
    });

    await router.navigate('a');
    await router.navigate('b');

    const history = router.getHistory();
    expect(history).toContain('a');
  });

  it('should clear history', async () => {
    router.register('test', () => Context({ name: 'Test' }));
    await router.navigate('test');
    router.clearHistory();

    const result = await router.back();
    expect(result).toBeNull();
  });

  it('should navigate with params', async () => {
    router.register('user', (params) => Context({ name: `User: ${params?.id || 'unknown'}` }));
    const result = await router.navigate('user', { id: '123' });
    expect(result.props.name).toBe('User: 123');
  });
});
