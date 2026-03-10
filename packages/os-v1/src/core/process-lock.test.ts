import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ProcessLock } from './process-lock.js';
import { existsSync, unlinkSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

describe('ProcessLock', () => {
    let testDir: string;
    let lockFile: string;

    beforeEach(() => {
        // 创建临时测试目录
        testDir = join(tmpdir(), `process-lock-test-${Date.now()}`);
        mkdirSync(testDir, { recursive: true });
        lockFile = join(testDir, 'test.pid');
    });

    afterEach(() => {
        // 清理测试文件
        if (existsSync(lockFile)) {
            unlinkSync(lockFile);
        }
    });

    it('should acquire lock successfully when no lock exists', () => {
        const lock = new ProcessLock(lockFile);
        const result = lock.acquire('test-session-1', { force: false });

        expect(result).toBe(true);
        expect(existsSync(lockFile)).toBe(true);

        // 清理
        lock.release();
    });

    it('should prevent duplicate acquisition when force is false', () => {
        const lock1 = new ProcessLock(lockFile);
        const lock2 = new ProcessLock(lockFile);

        // 第一个锁应该成功
        expect(lock1.acquire('session-1', { force: false })).toBe(true);

        // 第二个锁应该失败（非强制模式）
        expect(lock2.acquire('session-2', { force: false })).toBe(false);

        // 清理
        lock1.release();
    });

    it('should clean up stale lock file', () => {
        // 创建一个无效的锁文件（使用不存在的 PID）
        const staleLock = {
            pid: 999999,
            startTime: new Date().toISOString(),
            sessionId: 'stale-session'
        };
        writeFileSync(lockFile, JSON.stringify(staleLock, null, 2), 'utf-8');

        const lock = new ProcessLock(lockFile);
        const result = lock.acquire('new-session', { force: false });

        // 应该清理旧锁并成功获取新锁
        expect(result).toBe(true);

        // 清理
        lock.release();
    });

    it('should release lock correctly', () => {
        const lock = new ProcessLock(lockFile);

        lock.acquire('test-session', { force: false });
        expect(existsSync(lockFile)).toBe(true);

        lock.release();
        expect(existsSync(lockFile)).toBe(false);
    });

    it('should get lock info correctly', () => {
        const lock = new ProcessLock(lockFile);
        const sessionId = 'test-session-info';

        lock.acquire(sessionId, { force: false });

        const info = lock.getInfo();
        expect(info).not.toBeNull();
        expect(info?.pid).toBe(process.pid);
        expect(info?.sessionId).toBe(sessionId);
        expect(info?.startTime).toBeDefined();

        // 清理
        lock.release();
    });

    it('should return null when getting info of non-existent lock', () => {
        const lock = new ProcessLock(lockFile);
        const info = lock.getInfo();

        expect(info).toBeNull();
    });

    it('should handle corrupted lock file', () => {
        // 写入损坏的 JSON
        writeFileSync(lockFile, 'invalid json content', 'utf-8');

        const lock = new ProcessLock(lockFile);
        const result = lock.acquire('new-session', { force: false });

        // 应该清理损坏的文件并成功获取锁
        expect(result).toBe(true);

        // 清理
        lock.release();
    });
});
