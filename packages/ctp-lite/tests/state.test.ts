import { describe, it, expect, beforeEach, vi } from 'vitest';
import { StateManager } from '../src/core/state';

describe('StateManager', () => {
  let state: StateManager;

  beforeEach(() => {
    state = new StateManager();
  });

  it('should get and set values', () => {
    state.set('key1', 'value1');
    expect(state.get('key1')).toBe('value1');
  });

  it('should return undefined for non-existent keys', () => {
    expect(state.get('nonexistent')).toBeUndefined();
  });

  it('should set and get different types', () => {
    state.set('string', 'hello');
    state.set('number', 42);
    state.set('boolean', true);
    state.set('object', { a: 1 });
    state.set('array', [1, 2, 3]);

    expect(state.get('string')).toBe('hello');
    expect(state.get('number')).toBe(42);
    expect(state.get('boolean')).toBe(true);
    expect(state.get('object')).toEqual({ a: 1 });
    expect(state.get('array')).toEqual([1, 2, 3]);
  });

  it('should remove keys', () => {
    state.set('deleteMe', 'value');
    state.remove('deleteMe');
    expect(state.get('deleteMe')).toBeUndefined();
  });

  it('should notify subscribers on change', () => {
    const callback = vi.fn();
    state.subscribe('test', callback);
    state.set('test', 'newValue');
    expect(callback).toHaveBeenCalled();
  });

  it('should return unsubscribe function', () => {
    const callback = vi.fn();
    const unsubscribe = state.subscribe('test', callback);
    unsubscribe();
    state.set('test', 'value');
    expect(callback).not.toHaveBeenCalled();
  });

  it('should batch updates', () => {
    const callback = vi.fn();
    state.subscribe('key1', callback);
    state.subscribe('key2', callback);

    state.batch(() => {
      state.set('key1', 'value1');
      state.set('key2', 'value2');
    });

    expect(callback).toHaveBeenCalled();
  });

  it('should return all state as object', () => {
    state.set('a', 1);
    state.set('b', 2);
    expect(state.all()).toEqual({ a: 1, b: 2 });
  });

  it('should clear all state', () => {
    state.set('key', 'value');
    state.clear();
    expect(state.all()).toEqual({});
  });

  it('should notify with old and new values', () => {
    let capturedNewVal: any;
    let capturedOldVal: any;

    state.set('test', 'initial');
    state.subscribe('test', (newVal, oldVal) => {
      capturedNewVal = newVal;
      capturedOldVal = oldVal;
    });

    state.set('test', 'updated');

    expect(capturedNewVal).toBe('updated');
    expect(capturedOldVal).toBe('initial');
  });

  it('should handle multiple subscribers', () => {
    const callback1 = vi.fn();
    const callback2 = vi.fn();

    state.subscribe('test', callback1);
    state.subscribe('test', callback2);

    state.set('test', 'value');

    expect(callback1).toHaveBeenCalled();
    expect(callback2).toHaveBeenCalled();
  });

  it('should not notify unsubscribed callbacks', () => {
    const callback1 = vi.fn();
    const callback2 = vi.fn();

    const unsubscribe = state.subscribe('test', callback1);
    state.subscribe('test', callback2);

    unsubscribe();
    state.set('test', 'value');

    expect(callback1).not.toHaveBeenCalled();
    expect(callback2).toHaveBeenCalled();
  });

  it('should handle batch with remove', () => {
    const callback = vi.fn();
    state.set('key1', 'value1');
    state.set('key2', 'value2');
    state.subscribe('key1', callback);

    state.batch(() => {
      state.remove('key1');
      state.set('key2', 'newvalue');
    });

    expect(callback).toHaveBeenCalled();
  });
});
