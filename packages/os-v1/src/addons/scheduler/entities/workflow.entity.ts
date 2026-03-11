import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";

/**
 * 任务摘要（用于压缩历史）
 */
export interface TaskSummary {
    /** 任务 ID */
    id: string;
    /** 任务名称 */
    name: string;
    /** 任务状态 */
    status: 'completed' | 'failed';
    /** 执行结果（简化版，不包含完整的 params） */
    result?: any;
    /** 错误信息（如果失败） */
    error?: string;
    /** 完成时间 */
    completedAt?: Date;
}

/**
 * 滚动窗口配置
 */
export interface WindowConfig {
    /** 后顾窗口大小（默认: 1） */
    lookBehind: number;
    /** 前瞻窗口大小（默认: 3） */
    lookAhead: number;
}

/**
 * 重规划事件记录
 */
export interface ReplanEvent {
    /** 事件时间戳 */
    timestamp: Date;
    /** 触发原因 */
    triggerReason: 'task_failure' | 'dependency_change' | 'user_request';
    /** 触发时的任务 ID */
    taskId: string;
    /** 应用的 Patch 操作 */
    patchesApplied: any[];
    /** 重规划上下文（用户提供的额外信息） */
    context?: any;
}

/**
 * 工作流实体（扩展版 - 支持滚动规划）
 */
@Entity({
    name: 'os_workflow'
})
export class Workflow {
    // ============================================================================
    // 基础字段（现有）
    // ============================================================================

    @PrimaryGeneratedColumn('uuid')
    id?: string;

    @Column({ type: "varchar", length: 255 })
    name?: string;

    @Column({ type: 'text', nullable: true, default: '' })
    description?: string;

    /**
     * 任务列表
     * 存储完整的任务数据（包括 token, params, result, status 等）
     */
    @Column({ type: 'jsonb', nullable: true, default: [] })
    tasks?: any[];

    /**
     * 任务依赖关系（DAG 边）
     */
    @Column({ type: 'jsonb', nullable: true, default: [] })
    edges?: any[];

    // ============================================================================
    // 滚动规划字段（新增）
    // ============================================================================

    /**
     * 当前聚焦的任务 ID（滚动窗口的中心）
     * - 初始值：第一个任务的 ID
     * - 滑动窗口时更新为下一个任务的 ID
     * - 工作流完成时为 null
     */
    @Column({ type: 'varchar', length: 255, nullable: true })
    currentFocus?: string;

    /**
     * 滚动窗口配置
     * - lookBehind: 后顾窗口大小（已完成的任务数量）
     * - lookAhead: 前瞻窗口大小（待执行的任务数量）
     * - 总窗口大小 = lookBehind + 1（当前） + lookAhead
     */
    @Column({
        type: 'jsonb',
        nullable: false,
        default: { lookBehind: 1, lookAhead: 3 }
    })
    windowConfig?: WindowConfig;

    /**
     * 压缩历史记录（最近完成的任务摘要）
     * - 只保留最近 20 个已完成任务的摘要
     * - 包含：id, name, status, result, error
     * - 不包含完整的 params 和其他详细信息
     * - 用于在上下文窗口中提供历史参考，而不占用过多空间
     */
    @Column({ type: 'jsonb', nullable: false, default: [] })
    compressedHistory?: TaskSummary[];

    /**
     * 工作流状态
     * - pending: 待执行（初始状态）
     * - running: 执行中
     * - paused: 已暂停（可恢复）
     * - completed: 已完成（所有任务成功）
     * - failed: 失败（有任务失败且无法恢复）
     */
    @Column({
        type: 'varchar',
        length: 50,
        nullable: false,
        default: 'pending'
    })
    status?: 'pending' | 'running' | 'paused' | 'completed' | 'failed';

    /**
     * 重规划历史记录
     * - 记录所有重规划事件
     * - 用于审计和调试
     * - 包含：timestamp, triggerReason, taskId, patchesApplied, context
     */
    @Column({ type: 'jsonb', nullable: false, default: [] })
    replanHistory?: ReplanEvent[];

    /**
     * 执行统计信息（可选，用于监控）
     */
    @Column({
        type: 'jsonb',
        nullable: true,
        default: {
            totalTasks: 0,
            completedTasks: 0,
            failedTasks: 0,
            retriedTasks: 0
        }
    })
    executionStats?: {
        /** 总任务数 */
        totalTasks: number;
        /** 已完成任务数 */
        completedTasks: number;
        /** 失败任务数 */
        failedTasks: number;
        /** 重试任务数 */
        retriedTasks: number;
    };

    // ============================================================================
    // 时间戳字段
    // ============================================================================

    @CreateDateColumn()
    createAt?: Date;

    @UpdateDateColumn()
    updateAt?: Date;

    /**
     * 最后一次执行时间（任务执行时更新）
     */
    @Column({ type: 'timestamp', nullable: true })
    lastExecutedAt?: Date;

    /**
     * 工作流开始时间（第一次执行时设置）
     */
    @Column({ type: 'timestamp', nullable: true })
    startedAt?: Date;

    /**
     * 工作流完成时间（status 变为 completed 或 failed 时设置）
     */
    @Column({ type: 'timestamp', nullable: true })
    completedAt?: Date;
}
