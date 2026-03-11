/**
 * 自动错误恢复服务
 *
 * 当 Action 执行失败时，自动调用 Codex 进行错误修复
 */

import { Injectable, Injector, Inject, Optional } from '@context-ai/core';
import type { Subscription } from 'rxjs';
import { EVENT_BUS, ACTION_EXECUTER, CURRENT_DIR, SESSION_LOGGER } from '../tokens.js';
import type { EventBus, ActionExecuter } from '../tokens.js';
import { ACTION_FAILED_EVENT, type ActionFailedPayload } from '../events.js';
import { CODEX_TOKEN, type CodexRequest } from '../actions/codex.action.js';
import type { ISessionLogger } from './session-logger.js';
import { BugReportService } from '../addons/coding/services/bug-report.service.js';

// ============================================================================
// 配置类型
// ============================================================================

/**
 * 自动恢复配置
 */
export interface AutoRecoveryConfig {
    /** 是否启用自动恢复 */
    enabled: boolean;
    /** 最大重试次数 */
    maxRetries: number;
    /** 需要自动恢复的 action 列表（空表示全部） */
    includedActions: string[];
    /** 不需要自动恢复的 action 列表 */
    excludedActions: string[];
    /** Codex 模型 */
    codexModel?: string;
    /** Codex 超时时间（毫秒） */
    codexTimeout?: number;
}

/**
 * 恢复记录
 */
interface RecoveryRecord {
    executionId: string;
    token: string;
    attemptCount: number;
    lastAttemptTime: number;
    originalError: string;
    bugReportId?: string; // 关联的 Bug 报告 ID
    recoveryHistory: Array<{
        timestamp: number;
        success: boolean;
        error?: string;
    }>;
}

// ============================================================================
// 自动恢复服务
// ============================================================================

/**
 * 自动错误恢复服务
 *
 * 功能：
 * 1. 监听所有 ACTION_FAILED_EVENT
 * 2. 根据配置决定是否需要恢复
 * 3. 构造修复 prompt 并调用 Codex
 * 4. 记录恢复历史和统计
 */
@Injectable({ providedIn: 'auto' })
export class AutoRecoveryService {
    /** 恢复记录表 */
    private readonly recoveryRecords = new Map<string, RecoveryRecord>();

    /** 事件订阅 */
    private subscription?: Subscription;

    /** 配置 */
    private config: AutoRecoveryConfig = {
        enabled: true,
        maxRetries: 3,
        includedActions: [],
        excludedActions: ['codex.execute', 'claude.execute'], // 避免无限递归
        codexModel: 'claude-sonnet-4.5',
        codexTimeout: 300000 // 5 分钟
    };

    constructor(
        @Inject(EVENT_BUS) private readonly eventBus: EventBus,
        @Inject(ACTION_EXECUTER) private readonly actionExecuter: ActionExecuter,
        @Inject(CURRENT_DIR) private readonly currentDir: string,
        @Inject(SESSION_LOGGER) private readonly logger: ISessionLogger,
        @Inject(Injector) private readonly injector: Injector,
        @Optional(BugReportService) private readonly bugReportService?: BugReportService
    ) { }

    /**
     * 启动自动恢复服务
     */
    start(config?: Partial<AutoRecoveryConfig>): void {
        if (config) {
            this.config = { ...this.config, ...config };
        }

        if (!this.config.enabled) {
            this.logger.info('AUTO_RECOVERY', 'Auto recovery is disabled');
            return;
        }

        // 订阅 ACTION_FAILED_EVENT
        this.subscription = this.eventBus.subscribe(
            ACTION_FAILED_EVENT,
            (envelope) => this.handleActionFailure(envelope.sessionId, envelope.payload),
            {}
        );

        this.logger.info('AUTO_RECOVERY', 'Auto recovery service started', {
            config: this.config
        });
    }

    /**
     * 停止自动恢复服务
     */
    stop(): void {
        if (this.subscription) {
            this.subscription.unsubscribe();
            this.subscription = undefined;
        }

        this.logger.info('AUTO_RECOVERY', 'Auto recovery service stopped');
    }

    /**
     * 更新配置
     */
    updateConfig(config: Partial<AutoRecoveryConfig>): void {
        this.config = { ...this.config, ...config };
        this.logger.info('AUTO_RECOVERY', 'Configuration updated', { config: this.config });
    }

    /**
     * 获取恢复统计
     */
    getStatistics() {
        const records = Array.from(this.recoveryRecords.values());

        return {
            totalFailures: records.length,
            totalAttempts: records.reduce((sum, r) => sum + r.attemptCount, 0),
            successfulRecoveries: records.filter(r =>
                r.recoveryHistory.some(h => h.success)
            ).length,
            failedRecoveries: records.filter(r =>
                r.attemptCount >= this.config.maxRetries
            ).length,
            activeRecoveries: records.filter(r =>
                r.attemptCount > 0 && r.attemptCount < this.config.maxRetries
            ).length
        };
    }

    /**
     * 清空恢复记录
     */
    clearRecords(): void {
        this.recoveryRecords.clear();
        this.logger.info('AUTO_RECOVERY', 'Recovery records cleared');
    }

    // ========================================================================
    // 私有方法
    // ========================================================================

    /**
     * 处理 Action 失败事件
     *
     * 注意：这个方法不应该抛出异常，因为它是在事件监听器中调用的
     */
    private async handleActionFailure(
        sessionId: string,
        payload: ActionFailedPayload
    ): Promise<void> {
        const { executionId, token, error, errorStack } = payload;

        // 1. 检查是否需要恢复
        if (!this.shouldRecover(token)) {
            this.logger.debug('AUTO_RECOVERY', 'Skipping recovery for action', { token });
            return;
        }

        // 2. 获取或创建恢复记录
        let record = this.recoveryRecords.get(executionId);

        if (!record) {
            record = {
                executionId,
                token,
                attemptCount: 0,
                lastAttemptTime: Date.now(),
                originalError: error,
                recoveryHistory: []
            };
            this.recoveryRecords.set(executionId, record);

            // 创建 Bug 报告
            if (this.bugReportService) {
                try {
                    const bugReport = await this.bugReportService.createBugReport({
                        error_message: error,
                        error_stack: errorStack,
                        source: 'action',
                        token,
                        execution_id: executionId,
                        severity: this.determineSeverity(error),
                        auto_fixable: true,
                        tags: ['auto-recovery']
                    });
                    record.bugReportId = bugReport.id;

                    this.logger.info('AUTO_RECOVERY', 'Bug report created', {
                        executionId,
                        bugReportId: bugReport.id
                    });
                } catch (dbError) {
                    this.logger.error('AUTO_RECOVERY', 'Failed to create bug report', {
                        error: dbError instanceof Error ? dbError.message : String(dbError)
                    });
                }
            }
        }

        // 3. 检查是否超过最大重试次数
        if (record.attemptCount >= this.config.maxRetries) {
            this.logger.warn('AUTO_RECOVERY', 'Max retries exceeded', {
                executionId,
                token,
                maxRetries: this.config.maxRetries
            });
            return;
        }

        // 4. 执行恢复
        record.attemptCount++;
        record.lastAttemptTime = Date.now();

        this.logger.info('AUTO_RECOVERY', 'Attempting recovery', {
            executionId,
            token,
            attempt: record.attemptCount,
            maxRetries: this.config.maxRetries
        });

        try {
            const recoveryResult = await this.attemptRecovery(sessionId, token, error, errorStack);

            // 恢复成功
            record.recoveryHistory.push({
                timestamp: Date.now(),
                success: true
            });

            // 更新 Bug 报告状态
            if (this.bugReportService && record.bugReportId) {
                try {
                    await this.bugReportService.recordFixAttempt(
                        record.bugReportId,
                        'codex',
                        this.config.codexModel || 'claude-sonnet-4.5',
                        {
                            success: true,
                            stdout: recoveryResult.stdout,
                            stderr: recoveryResult.stderr,
                            exit_code: recoveryResult.exit_code,
                            duration_ms: Date.now() - record.lastAttemptTime
                        }
                    );
                } catch (dbError) {
                    this.logger.error('AUTO_RECOVERY', 'Failed to update bug report', {
                        error: dbError instanceof Error ? dbError.message : String(dbError)
                    });
                }
            }

            this.logger.info('AUTO_RECOVERY', 'Recovery successful', {
                executionId,
                token,
                attempt: record.attemptCount
            });
        } catch (recoveryError) {
            // 恢复失败
            const errorMessage = recoveryError instanceof Error
                ? recoveryError.message
                : String(recoveryError);

            record.recoveryHistory.push({
                timestamp: Date.now(),
                success: false,
                error: errorMessage
            });

            // 更新 Bug 报告状态
            if (this.bugReportService && record.bugReportId) {
                try {
                    await this.bugReportService.recordFixAttempt(
                        record.bugReportId,
                        'codex',
                        this.config.codexModel || 'claude-sonnet-4.5',
                        {
                            success: false,
                            error: errorMessage,
                            duration_ms: Date.now() - record.lastAttemptTime
                        }
                    );
                } catch (dbError) {
                    this.logger.error('AUTO_RECOVERY', 'Failed to update bug report', {
                        error: dbError instanceof Error ? dbError.message : String(dbError)
                    });
                }
            }

            this.logger.error('AUTO_RECOVERY', 'Recovery failed', {
                executionId,
                token,
                attempt: record.attemptCount,
                error: errorMessage
            });
        }
    }

    /**
     * 判断是否应该恢复该 Action
     */
    private shouldRecover(token: string): boolean {
        // 检查排除列表
        if (this.config.excludedActions.includes(token)) {
            return false;
        }

        // 如果有包含列表，只恢复列表中的 action
        if (this.config.includedActions.length > 0) {
            return this.config.includedActions.includes(token);
        }

        return true;
    }

    /**
     * 尝试执行恢复
     */
    private async attemptRecovery(
        _sessionId: string,
        token: string,
        error: string,
        errorStack?: string
    ): Promise<{ success: boolean; stdout: string; stderr: string; exit_code: number }> {
        // 构造修复 prompt
        const prompt = this.buildRecoveryPrompt(token, error, errorStack);

        // 调用 Codex 进行修复
        const codexRequest: CodexRequest = {
            prompt,
            cwd: this.currentDir,
            model: this.config.codexModel,
            sandbox: 'workspace-write',
            full_auto: true,
            timeout_ms: this.config.codexTimeout
        };

        this.logger.debug('AUTO_RECOVERY', 'Calling Codex for recovery', {
            token,
            prompt: prompt.substring(0, 200) + '...'
        });

        const result = await this.actionExecuter.execute(
            CODEX_TOKEN,
            codexRequest,
            this.injector
        );

        if (!result.success) {
            throw new Error(`Codex recovery failed: ${result.stderr}`);
        }

        this.logger.debug('AUTO_RECOVERY', 'Codex recovery completed', {
            token,
            exitCode: result.exit_code,
            stdout: result.stdout.substring(0, 500)
        });

        return result;
    }

    /**
     * 根据错误信息判断严重程度
     */
    private determineSeverity(error: string): 'critical' | 'high' | 'medium' | 'low' {
        const lowerError = error.toLowerCase();

        if (lowerError.includes('syntaxerror') ||
            lowerError.includes('referenceerror') ||
            lowerError.includes('cannot read')) {
            return 'critical';
        }

        if (lowerError.includes('typeerror') ||
            lowerError.includes('failed') ||
            lowerError.includes('rejected')) {
            return 'high';
        }

        return 'medium';
    }

    /**
     * 构造恢复 prompt
     */
    private buildRecoveryPrompt(
        token: string,
        error: string,
        errorStack?: string
    ): string {
        // 检测是否为全局错误
        const isGlobalError = token.startsWith('global.error.');
        const errorType = isGlobalError
            ? token.replace('global.error.', '')
            : 'action_execution';

        const lines: string[] = [
            '# 自动错误修复请求',
            '',
            `## 错误类型`,
            `- **类型**: \`${errorType}\``,
            `- **来源**: ${isGlobalError ? '全局错误捕获' : 'Action 执行失败'}`,
            '',
            `## Action 信息`,
            `- **Action Token**: \`${token}\``,
            '',
            '## 错误信息',
            '```',
            error,
            '```',
        ];

        if (errorStack) {
            lines.push(
                '',
                '## 错误堆栈',
                '```',
                errorStack,
                '```'
            );
        }

        lines.push(
            '',
            '## 修复要求',
            '',
            '请分析上述错误，并执行以下操作：',
            '',
            '1. **根本原因分析**：识别导致错误的根本原因',
            '2. **影响范围评估**：确定需要修改的文件和代码',
            '3. **修复实施**：',
            '   - 修复导致错误的代码',
            '   - 确保修复不会引入新的问题',
            '   - 保持代码风格一致',
            '4. **验证修复**：',
            '   - 运行相关测试',
            '   - 确保构建成功',
            '   - 验证类型检查通过',
            '',
            '## 注意事项',
            '',
            '- 只修复与错误直接相关的代码，不要进行不必要的重构',
            '- 保持现有的架构和设计模式',
            '- 确保修改后的代码符合项目的编码规范',
            '- 如果需要添加依赖，请在修复说明中注明',
            '',
            '开始修复...'
        );

        return lines.join('\n');
    }
}
