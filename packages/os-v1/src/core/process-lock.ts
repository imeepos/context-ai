import { readFileSync, writeFileSync, unlinkSync, existsSync, mkdirSync } from 'fs';
import { dirname } from 'path';

/**
 * 进程锁信息
 */
export interface ProcessLockInfo {
    /** 进程 PID */
    pid: number;
    /** 启动时间 */
    startTime: string;
    /** 会话 ID */
    sessionId: string;
}

/**
 * 进程锁管理器
 *
 * 使用 PID 文件实现进程单例，防止多个实例同时运行。
 *
 * 功能：
 * - 检测并清理僵尸进程的锁文件
 * - 防止重复启动
 * - 优雅退出时自动清理
 */
export class ProcessLock {
    constructor(private lockFile: string) {}

    /**
     * 检查进程是否存在
     *
     * 使用 process.kill(pid, 0) 检测进程是否存在，
     * 不会真正发送信号，只是检查权限。
     */
    private isProcessRunning(pid: number): boolean {
        try {
            // process.kill(pid, 0) 不会真正杀死进程，只是检查进程是否存在
            process.kill(pid, 0);
            return true;
        } catch (e: any) {
            // ESRCH: 进程不存在
            // EPERM: 进程存在但无权限（也算存在）
            return e.code === 'EPERM';
        }
    }

    /**
     * 强制终止指定进程
     *
     * @param pid - 要终止的进程 PID
     * @returns true 如果成功终止，false 如果失败
     */
    private killProcess(pid: number): boolean {
        try {
            console.warn(`[ProcessLock] Attempting to kill process (PID: ${pid})...`);
            process.kill(pid, 'SIGTERM');

            // 等待进程退出（最多等待 3 秒）
            const maxWaitTime = 3000;
            const startTime = Date.now();

            while (Date.now() - startTime < maxWaitTime) {
                if (!this.isProcessRunning(pid)) {
                    console.log(`[ProcessLock] Process terminated successfully (PID: ${pid})`);
                    return true;
                }
                // 短暂休眠
                const sleepMs = 100;
                const start = Date.now();
                while (Date.now() - start < sleepMs) {
                    // 忙等待
                }
            }

            // 如果 SIGTERM 失败，尝试 SIGKILL
            console.warn(`[ProcessLock] SIGTERM failed, trying SIGKILL (PID: ${pid})...`);
            process.kill(pid, 'SIGKILL');

            // 再等待 1 秒
            const killWaitTime = 1000;
            const killStartTime = Date.now();
            while (Date.now() - killStartTime < killWaitTime) {
                if (!this.isProcessRunning(pid)) {
                    console.log(`[ProcessLock] Process killed successfully (PID: ${pid})`);
                    return true;
                }
                const sleepMs = 100;
                const start = Date.now();
                while (Date.now() - start < sleepMs) {
                    // 忙等待
                }
            }

            console.error(`[ProcessLock] Failed to kill process (PID: ${pid})`);
            return false;
        } catch (e: any) {
            if (e.code === 'ESRCH') {
                // 进程已经不存在了
                console.log(`[ProcessLock] Process already terminated (PID: ${pid})`);
                return true;
            }
            console.error(`[ProcessLock] Failed to kill process (PID: ${pid}):`, e);
            return false;
        }
    }

    /**
     * 尝试获取锁
     *
     * @param sessionId - 当前会话 ID
     * @param options - 选项
     * @param options.force - 是否强制获取锁（终止旧进程）
     * @returns true 如果成功获取锁，false 如果已有其他进程运行
     */
    acquire(sessionId: string, options: { force?: boolean } = {}): boolean {
        const { force = true } = options;

        // 确保目录存在
        const dir = dirname(this.lockFile);
        if (!existsSync(dir)) {
            mkdirSync(dir, { recursive: true });
        }

        // 检查锁文件是否存在
        if (existsSync(this.lockFile)) {
            try {
                const content = readFileSync(this.lockFile, 'utf-8');
                const lockInfo: ProcessLockInfo = JSON.parse(content);

                // 检查进程是否还在运行
                if (this.isProcessRunning(lockInfo.pid)) {
                    if (force) {
                        // 强制模式：终止旧进程
                        console.warn(`[ProcessLock] Found running instance (PID: ${lockInfo.pid}), force stopping...`);
                        console.warn(`[ProcessLock] Old instance started at: ${lockInfo.startTime}`);
                        console.warn(`[ProcessLock] Old instance session ID: ${lockInfo.sessionId}`);

                        if (this.killProcess(lockInfo.pid)) {
                            // 成功终止，清理锁文件
                            unlinkSync(this.lockFile);
                        } else {
                            console.error(`[ProcessLock] Failed to stop old instance, cannot acquire lock`);
                            return false;
                        }
                    } else {
                        // 非强制模式：拒绝启动
                        console.error(`[ProcessLock] Another instance is already running (PID: ${lockInfo.pid})`);
                        console.error(`[ProcessLock] Started at: ${lockInfo.startTime}`);
                        console.error(`[ProcessLock] Session ID: ${lockInfo.sessionId}`);
                        return false;
                    }
                } else {
                    // 进程已死，清理旧锁文件
                    console.warn(`[ProcessLock] Found stale lock file, cleaning up (PID: ${lockInfo.pid})`);
                    unlinkSync(this.lockFile);
                }
            } catch (e) {
                // 锁文件损坏，删除它
                console.warn(`[ProcessLock] Corrupted lock file, removing it`);
                try {
                    unlinkSync(this.lockFile);
                } catch (unlinkError) {
                    console.error(`[ProcessLock] Failed to remove corrupted lock file:`, unlinkError);
                    return false;
                }
            }
        }

        // 写入当前进程信息
        const lockInfo: ProcessLockInfo = {
            pid: process.pid,
            startTime: new Date().toISOString(),
            sessionId,
        };

        try {
            writeFileSync(this.lockFile, JSON.stringify(lockInfo, null, 2), 'utf-8');
            console.log(`[ProcessLock] Lock acquired (PID: ${process.pid})`);
            return true;
        } catch (e) {
            console.error(`[ProcessLock] Failed to write lock file:`, e);
            return false;
        }
    }

    /**
     * 释放锁
     */
    release(): void {
        try {
            if (existsSync(this.lockFile)) {
                unlinkSync(this.lockFile);
                console.log(`[ProcessLock] Lock released (PID: ${process.pid})`);
            }
        } catch (e) {
            console.error(`[ProcessLock] Failed to release lock:`, e);
        }
    }

    /**
     * 获取当前锁信息（如果存在）
     */
    getInfo(): ProcessLockInfo | null {
        try {
            if (existsSync(this.lockFile)) {
                const content = readFileSync(this.lockFile, 'utf-8');
                return JSON.parse(content);
            }
        } catch (e) {
            console.error(`[ProcessLock] Failed to read lock file:`, e);
        }
        return null;
    }
}
