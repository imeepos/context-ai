import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";

/**
 * Bug 报告实体
 *
 * 存储所有捕获的错误信息，包括：
 * - 自动恢复系统捕获的错误
 * - 全局错误处理器捕获的错误
 * - 手动报告的错误
 */
@Entity({
    name: 'bug_report'
})
export class BugReport {
    @PrimaryGeneratedColumn('uuid')
    id?: string;

    /**
     * 错误消息
     */
    @Column({ type: 'text', nullable: false })
    error_message?: string;

    /**
     * 错误堆栈
     */
    @Column({ type: 'text', nullable: true })
    error_stack?: string;

    /**
     * 错误类型
     * - TypeError, ReferenceError, SyntaxError 等
     */
    @Column({ type: 'varchar', length: 100, nullable: true })
    error_type?: string;

    /**
     * 错误来源
     * - action: Action 执行失败
     * - global: 全局错误捕获
     * - manual: 手动报告
     */
    @Column({
        type: 'varchar',
        length: 50,
        nullable: false,
        default: 'manual'
    })
    source?: 'action' | 'global' | 'manual';

    /**
     * Action Token 或错误标识
     * 例如：'shell.execute', 'global.error.unhandled_rejection'
     */
    @Column({ type: 'varchar', length: 255, nullable: true })
    token?: string;

    /**
     * 执行 ID（来自 AutoRecoveryService）
     */
    @Column({ type: 'varchar', length: 100, nullable: true })
    execution_id?: string;

    /**
     * Bug 状态
     * - pending: 待处理
     * - fixing: 修复中
     * - fixed: 已修复
     * - failed: 修复失败
     * - ignored: 已忽略
     */
    @Column({
        type: 'varchar',
        length: 50,
        nullable: false,
        default: 'pending'
    })
    status?: 'pending' | 'fixing' | 'fixed' | 'failed' | 'ignored';

    /**
     * 额外上下文信息（JSON）
     * 可以包含：请求参数、环境变量等
     */
    @Column({ type: 'simple-json', nullable: true })
    context?: Record<string, unknown>;

    /**
     * 错误发生的文件路径
     */
    @Column({ type: 'text', nullable: true })
    file_path?: string;

    /**
     * 错误行号
     */
    @Column({ type: 'integer', nullable: true })
    line_number?: number;

    /**
     * 修复尝试次数
     */
    @Column({ type: 'integer', nullable: false, default: 0 })
    fix_attempts?: number;

    /**
     * 修复方法
     * - claude: 使用 Claude
     * - codex: 使用 Codex
     * - manual: 手动修复
     * - auto: 自动决定
     */
    @Column({ type: 'varchar', length: 50, nullable: true })
    fix_method?: 'claude' | 'codex' | 'manual' | 'auto';

    /**
     * 使用的模型
     * - sonnet, opus, haiku (Claude)
     * - claude-opus-4 (Codex)
     */
    @Column({ type: 'varchar', length: 100, nullable: true })
    fix_model?: string;

    /**
     * 修复结果（JSON）
     * 包含：stdout, stderr, exit_code, duration 等
     */
    @Column({ type: 'simple-json', nullable: true })
    fix_result?: {
        success: boolean;
        stdout?: string;
        stderr?: string;
        exit_code?: number;
        duration_ms?: number;
        error?: string;
    };

    /**
     * 严重程度
     * - critical: 致命错误
     * - high: 高优先级
     * - medium: 中等优先级
     * - low: 低优先级
     */
    @Column({
        type: 'varchar',
        length: 50,
        nullable: false,
        default: 'medium'
    })
    severity?: 'critical' | 'high' | 'medium' | 'low';

    /**
     * 是否可自动修复
     */
    @Column({ type: 'boolean', nullable: false, default: true })
    auto_fixable?: boolean;

    /**
     * 标签（用于分类）
     */
    @Column({ type: 'simple-json', nullable: true })
    tags?: string[];

    /**
     * 创建时间
     */
    @CreateDateColumn()
    created_at?: Date;

    /**
     * 更新时间
     */
    @UpdateDateColumn()
    updated_at?: Date;

    /**
     * 修复时间
     */
    @Column({ type: 'datetime', nullable: true })
    fixed_at?: Date;

    /**
     * 最后尝试修复时间
     */
    @Column({ type: 'datetime', nullable: true })
    last_fix_attempt_at?: Date;
}
