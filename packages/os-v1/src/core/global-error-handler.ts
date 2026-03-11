/**
 * 全局错误处理器
 *
 * 捕获所有未处理的错误并触发自动恢复
 */

import { Injectable, Inject, Optional } from '@context-ai/core';
import { EVENT_BUS, SESSION_LOGGER, SESSION_ID } from '../tokens.js';
import type { EventBus } from '../tokens.js';
import { ACTION_FAILED_EVENT } from '../events.js';
import type { ISessionLogger } from './session-logger.js';
import { BugReportService } from '../addons/coding/services/bug-report.service.js';

/**
 * 全局错误处理器配置
 */
export interface GlobalErrorHandlerConfig {
    /** 是否启用全局错误捕获 */
    enabled: boolean;
    /** 是否捕获未处理的 Promise rejection */
    captureUnhandledRejection: boolean;
    /** 是否捕获未捕获的异常 */
    captureUncaughtException: boolean;
    /** 是否在捕获后退出进程 */
    exitOnError: boolean;
    /** 退出前等待时间（毫秒），给恢复服务时间 */
    exitDelayMs: number;
}

/**
 * 全局错误处理器
 *
 * 功能：
 * 1. 监听 process 的 uncaughtException 和 unhandledRejection
 * 2. 将错误转换为 ACTION_FAILED_EVENT
 * 3. 触发自动恢复流程
 */
@Injectable({ providedIn: 'auto' })
export class GlobalErrorHandler {
    private config: GlobalErrorHandlerConfig = {
        enabled: true,
        captureUnhandledRejection: true,
        captureUncaughtException: true,
        exitOnError: false,
        exitDelayMs: 30000 // 30 秒，给 Codex 足够时间修复
    };

    private isInstalled = false;
    private originalHandlers: {
        uncaughtException?: NodeJS.UncaughtExceptionListener;
        unhandledRejection?: NodeJS.UnhandledRejectionListener;
    } = {};

    constructor(
        @Inject(EVENT_BUS) private readonly eventBus: EventBus,
        @Inject(SESSION_ID) private readonly sessionId: string,
        @Inject(SESSION_LOGGER) private readonly logger: ISessionLogger,
        @Optional(BugReportService) private readonly bugReportService?: BugReportService
    ) { }

    /**
     * 安装全局错误处理器
     */
    install(config?: Partial<GlobalErrorHandlerConfig>): void {
        if (this.isInstalled) {
            this.logger.warn('GLOBAL_ERROR_HANDLER', 'Already installed');
            return;
        }

        if (config) {
            this.config = { ...this.config, ...config };
        }

        if (!this.config.enabled) {
            this.logger.info('GLOBAL_ERROR_HANDLER', 'Global error handler is disabled');
            return;
        }

        // 捕获未捕获的异常
        if (this.config.captureUncaughtException) {
            const handler = this.handleUncaughtException.bind(this);
            process.on('uncaughtException', handler);
            this.originalHandlers.uncaughtException = handler;
        }

        // 捕获未处理的 Promise rejection
        if (this.config.captureUnhandledRejection) {
            const handler = this.handleUnhandledRejection.bind(this);
            process.on('unhandledRejection', handler);
            this.originalHandlers.unhandledRejection = handler;
        }

        this.isInstalled = true;

        this.logger.info('GLOBAL_ERROR_HANDLER', 'Global error handler installed', {
            config: this.config
        });
    }

    /**
     * 卸载全局错误处理器
     */
    uninstall(): void {
        if (!this.isInstalled) {
            return;
        }

        if (this.originalHandlers.uncaughtException) {
            process.off('uncaughtException', this.originalHandlers.uncaughtException);
        }

        if (this.originalHandlers.unhandledRejection) {
            process.off('unhandledRejection', this.originalHandlers.unhandledRejection);
        }

        this.isInstalled = false;
        this.originalHandlers = {};

        this.logger.info('GLOBAL_ERROR_HANDLER', 'Global error handler uninstalled');
    }

    /**
     * 更新配置
     */
    updateConfig(config: Partial<GlobalErrorHandlerConfig>): void {
        this.config = { ...this.config, ...config };
        this.logger.info('GLOBAL_ERROR_HANDLER', 'Configuration updated', {
            config: this.config
        });
    }

    // ========================================================================
    // 私有方法
    // ========================================================================

    /**
     * 处理未捕获的异常
     */
    private handleUncaughtException(error: Error): void {
        this.logger.error('GLOBAL_ERROR_HANDLER', 'Uncaught exception', {
            error: error.message,
            stack: error.stack
        });

        // 触发错误事件
        this.emitErrorEvent('uncaught_exception', error);

        // 是否退出进程
        if (this.config.exitOnError) {
            this.logger.error('GLOBAL_ERROR_HANDLER', 'Exiting process due to uncaught exception');
            process.exit(1);
        }
    }

    /**
     * 处理未处理的 Promise rejection
     */
    private handleUnhandledRejection(reason: unknown, promise: Promise<unknown>): void {
        const error = reason instanceof Error
            ? reason
            : new Error(String(reason));

        this.logger.error('GLOBAL_ERROR_HANDLER', 'Unhandled rejection', {
            error: error.message,
            stack: error.stack,
            promise: String(promise)
        });

        // 触发错误事件
        this.emitErrorEvent('unhandled_rejection', error);

        // 等待一段时间，让自动恢复服务有机会执行
        const delaySeconds = Math.round(this.config.exitDelayMs / 1000);

        if (this.config.exitOnError) {
            this.logger.warn('GLOBAL_ERROR_HANDLER', `Will exit process in ${delaySeconds} seconds to allow recovery...`);
            setTimeout(() => {
                this.logger.error('GLOBAL_ERROR_HANDLER', 'Exiting process due to unhandled rejection');
                process.exit(1);
            }, this.config.exitDelayMs);
        } else {
            // 不退出，保持进程运行
            this.logger.info('GLOBAL_ERROR_HANDLER', `Keeping process alive. Auto-recovery has ${delaySeconds} seconds to complete.`);

            // 设置一个超时，防止进程无限挂起
            setTimeout(() => {
                this.logger.warn('GLOBAL_ERROR_HANDLER', 'Recovery timeout reached. You may manually exit if needed.');
            }, this.config.exitDelayMs);
        }
    }

    /**
     * 发射错误事件到 EventBus
     */
    private async emitErrorEvent(source: string, error: Error): Promise<void> {
        try {
            const executionId = crypto.randomUUID();
            const token = `global.error.${source}`;

            this.logger.info('GLOBAL_ERROR_HANDLER', '🔥 Emitting error event to trigger auto-recovery', {
                executionId,
                token,
                error: error.message
            });

            // 保存到数据库（如果 BugReportService 可用）
            if (this.bugReportService) {
                try {
                    await this.bugReportService.createBugReport({
                        error_message: error.message,
                        error_stack: error.stack,
                        error_type: error.name,
                        source: 'global',
                        token,
                        execution_id: executionId,
                        severity: this.determineSeverity(error),
                        auto_fixable: true,
                        tags: [source, 'auto-captured']
                    });

                    this.logger.info('GLOBAL_ERROR_HANDLER', '💾 Bug report saved to database', {
                        executionId
                    });
                } catch (dbError) {
                    this.logger.error('GLOBAL_ERROR_HANDLER', 'Failed to save bug report to database', {
                        error: dbError instanceof Error ? dbError.message : String(dbError)
                    });
                }
            }

            // 发射 ACTION_FAILED_EVENT
            this.eventBus.publish(this.sessionId, ACTION_FAILED_EVENT, {
                executionId,
                token,
                error: error.message,
                errorStack: error.stack,
                duration: 0
            });

            this.logger.info('GLOBAL_ERROR_HANDLER', '✅ Error event emitted successfully', {
                executionId,
                source
            });
        } catch (eventError) {
            this.logger.error('GLOBAL_ERROR_HANDLER', 'Failed to emit error event', {
                error: eventError instanceof Error ? eventError.message : String(eventError)
            });
        }
    }

    /**
     * 根据错误类型判断严重程度
     */
    private determineSeverity(error: Error): 'critical' | 'high' | 'medium' | 'low' {
        const message = error.message.toLowerCase();
        const name = error.name.toLowerCase();

        // 致命错误
        if (name.includes('syntaxerror') ||
            name.includes('referenceerror') ||
            message.includes('cannot read') ||
            message.includes('is not defined')) {
            return 'critical';
        }

        // 高优先级
        if (name.includes('typeerror') ||
            message.includes('failed') ||
            message.includes('error')) {
            return 'high';
        }

        // 默认中等
        return 'medium';
    }
}
