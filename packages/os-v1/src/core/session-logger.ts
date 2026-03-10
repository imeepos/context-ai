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
 * SessionLogger - 会话日志记录器
 *
 * 负责将指定 SESSION_ID 的所有日志写入对应的日志文件。
 * 日志文件路径: LOG_DIR/SESSION_ID.log
 *
 * 使用依赖注入，在销毁时自动调用 endSession
 */
@Injectable()
export class SessionLogger implements OnDestroy {
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
