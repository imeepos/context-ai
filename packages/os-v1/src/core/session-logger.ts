import { appendFileSync, mkdirSync, existsSync } from "fs";
import { dirname, join } from "path";
import { Injectable, Inject } from "@context-ai/core";
import type { OnDestroy } from "@context-ai/core";
import { LOG_DIR, SESSION_ID } from "../tokens.js";

export interface LogEntry {
    timestamp: string;
    level: 'info' | 'error' | 'warn' | 'debug';
    category: string;
    message: string;
    data?: unknown;
}

/**
 * ISessionLogger - 会话日志记录器接口
 *
 * 定义会话日志记录的公共接口，支持依赖注入和多态实现。
 */
export interface ISessionLogger {
    /**
     * 记录 info 级别日志
     */
    info(category: string, message: string, data?: unknown): void;

    /**
     * 记录 error 级别日志
     */
    error(category: string, message: string, data?: unknown): void;

    /**
     * 记录 warn 级别日志
     */
    warn(category: string, message: string, data?: unknown): void;

    /**
     * 记录 debug 级别日志
     */
    debug(category: string, message: string, data?: unknown): void;

    /**
     * 记录 Action 执行请求
     */
    logRequest(token: string, params: unknown): void;

    /**
     * 记录 Action 执行响应
     */
    logResponse(token: string, result: unknown): void;

    /**
     * 记录错误
     */
    logError(context: string, error: unknown): void;

    /**
     * 结束会话日志
     */
    endSession(): void;

    /**
     * 获取日志文件路径
     */
    getLogFilePath(): string;
}

/**
 * SessionLogger - 会话日志记录器实现
 *
 * 负责将指定 SESSION_ID 的所有日志写入对应的日志文件。
 * 日志文件路径: LOG_DIR/SESSION_ID.log
 *
 * 使用依赖注入，在销毁时自动调用 endSession
 */
@Injectable()
export class SessionLogger implements ISessionLogger, OnDestroy {
    private logFilePath: string;
    private sessionId: string;
    private ended = false;

    constructor(
        @Inject(LOG_DIR) logDir: string,
        @Inject(SESSION_ID) sessionId: string,
    ) {
        this.sessionId = sessionId;
        this.logFilePath = join(logDir, `${sessionId}.log`);

        // 确保日志目录存在
        const logDirPath = dirname(this.logFilePath);
        if (!existsSync(logDirPath)) {
            mkdirSync(logDirPath, { recursive: true });
        }

        // 写入会话开始标记
        this.writeSeparator('SESSION START');
    }

    /**
     * 生命周期：销毁时自动结束会话
     */
    onDestroy(): void {
        if (!this.ended) {
            this.endSession();
        }
    }

    private formatEntry(entry: LogEntry): string {
        const timestamp = new Date().toISOString();
        const dataStr = entry.data !== undefined
            ? '\n' + JSON.stringify(entry.data, null, 2)
            : '';
        return `[${timestamp}] [${entry.level.toUpperCase().padEnd(5)}] [${this.sessionId}] [${entry.category}] ${entry.message}${dataStr}\n`;
    }

    private write(entry: LogEntry): void {
        const formatted = this.formatEntry(entry);
        appendFileSync(this.logFilePath, formatted, 'utf-8');
    }

    private writeSeparator(title: string): void {
        const separator = `\n${'='.repeat(60)}\n${title}\n${'='.repeat(60)}\n`;
        appendFileSync(this.logFilePath, separator, 'utf-8');
    }

    info(category: string, message: string, data?: unknown): void {
        this.write({ timestamp: new Date().toISOString(), level: 'info', category, message, data });
    }

    error(category: string, message: string, data?: unknown): void {
        this.write({ timestamp: new Date().toISOString(), level: 'error', category, message, data });
    }

    warn(category: string, message: string, data?: unknown): void {
        this.write({ timestamp: new Date().toISOString(), level: 'warn', category, message, data });
    }

    debug(category: string, message: string, data?: unknown): void {
        this.write({ timestamp: new Date().toISOString(), level: 'debug', category, message, data });
    }

    /**
     * 记录 Action 执行请求
     */
    logRequest(token: string, params: unknown): void {
        this.info('REQUEST', `Action: ${token}`, params);
    }

    /**
     * 记录 Action 执行响应
     */
    logResponse(token: string, result: unknown): void {
        this.info('RESPONSE', `Action: ${token}`, result);
    }

    /**
     * 记录错误
     */
    logError(context: string, error: unknown): void {
        this.error('ERROR', context, error instanceof Error ? { message: error.message, stack: error.stack } : error);
    }

    /**
     * 结束会话日志
     */
    endSession(): void {
        this.writeSeparator('SESSION END');
    }

    /**
     * 获取日志文件路径
     */
    getLogFilePath(): string {
        return this.logFilePath;
    }
}

// ============================================================================
// MemorySessionLogger - 基于内存的日志记录器（用于单元测试）
// ============================================================================

/**
 * MemorySessionLogger - 基于内存的日志记录器
 *
 * 专为单元测试设计，将日志存储在内存数组中，方便测试验证。
 * 不依赖文件系统，执行效率高。
 *
 * @example
 * const logger = new MemorySessionLogger('test-session');
 * logger.info('TEST', 'Test message', { key: 'value' });
 * const logs = logger.getLogs();
 * expect(logs).toHaveLength(1);
 * expect(logs[0].category).toBe('TEST');
 */
export class MemorySessionLogger implements ISessionLogger {
    private logs: LogEntry[] = [];
    private sessionId: string;
    private ended = false;

    constructor(sessionId: string = 'test-session') {
        this.sessionId = sessionId;
    }

    info(category: string, message: string, data?: unknown): void {
        this.addLog('info', category, message, data);
    }

    error(category: string, message: string, data?: unknown): void {
        this.addLog('error', category, message, data);
    }

    warn(category: string, message: string, data?: unknown): void {
        this.addLog('warn', category, message, data);
    }

    debug(category: string, message: string, data?: unknown): void {
        this.addLog('debug', category, message, data);
    }

    logRequest(token: string, params: unknown): void {
        this.info('REQUEST', `Action: ${token}`, params);
    }

    logResponse(token: string, result: unknown): void {
        this.info('RESPONSE', `Action: ${token}`, result);
    }

    logError(context: string, error: unknown): void {
        this.error('ERROR', context, error instanceof Error ? { message: error.message, stack: error.stack } : error);
    }

    endSession(): void {
        this.ended = true;
        this.addLog('info', 'SESSION', 'Session ended');
    }

    getLogFilePath(): string {
        return `/memory/${this.sessionId}.log`;
    }

    // ========================================================================
    // 测试辅助方法
    // ========================================================================

    /**
     * 获取所有日志记录
     */
    getLogs(): LogEntry[] {
        return [...this.logs];
    }

    /**
     * 获取指定级别的日志
     */
    getLogsByLevel(level: LogEntry['level']): LogEntry[] {
        return this.logs.filter(log => log.level === level);
    }

    /**
     * 获取指定分类的日志
     */
    getLogsByCategory(category: string): LogEntry[] {
        return this.logs.filter(log => log.category === category);
    }

    /**
     * 查找包含指定消息的日志
     */
    findLogsByMessage(messageFragment: string): LogEntry[] {
        return this.logs.filter(log => log.message.includes(messageFragment));
    }

    /**
     * 获取日志数量
     */
    getLogCount(): number {
        return this.logs.length;
    }

    /**
     * 清空所有日志
     */
    clear(): void {
        this.logs = [];
        this.ended = false;
    }

    /**
     * 检查会话是否已结束
     */
    isEnded(): boolean {
        return this.ended;
    }

    // ========================================================================
    // 私有方法
    // ========================================================================

    private addLog(level: LogEntry['level'], category: string, message: string, data?: unknown): void {
        this.logs.push({
            timestamp: new Date().toISOString(),
            level,
            category,
            message,
            data
        });
    }
}
