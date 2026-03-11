import type { TSchema, Static } from '@sinclair/typebox';
import type { Token } from '../../tokens.js';

// ============================================================================
// 核心类型定义
// ============================================================================

/**
 * 任务状态枚举
 */
export type TaskStatus = 'pending' | 'running' | 'completed' | 'cancelled' | 'failed';

/**
 * 工作流状态枚举
 */
export type WorkflowStatus = 'pending' | 'running' | 'paused' | 'completed' | 'failed';

/**
 * 任务定义
 */
export interface Task<TRequest extends TSchema = TSchema, TResponse extends TSchema = TSchema> {
    /** 任务唯一标识 */
    id: string;
    /** 任务名称 */
    name: string;
    /** 任务描述 */
    description: string;
    /** 任务状态 */
    status: TaskStatus;
    /** 要执行的 Action Token */
    token: Token<TRequest, TResponse>;
    /** 任务参数 */
    params: Static<TRequest>;
    /** 任务结果 */
    result?: Static<TResponse>;
    /** 错误信息（如果失败） */
    error?: string;
    /** 创建时间 */
    createdAt?: Date;
    /** 开始时间 */
    startedAt?: Date;
    /** 完成时间 */
    completedAt?: Date;
}

/**
 * 任务依赖边
 */
export interface Edge {
    /** 源任务 ID */
    from: string;
    /** 目标任务 ID */
    to: string;
}

/**
 * 工作流定义
 */
export interface WorkflowDefinition {
    /** 工作流 ID */
    id: string;
    /** 工作流名称 */
    name: string;
    /** 工作流描述 */
    description: string;
    /** 任务列表 */
    tasks: Task[];
    /** 任务依赖关系 */
    edges: Edge[];
}

// ============================================================================
// 滚动规划相关类型
// ============================================================================

/**
 * 任务摘要（压缩历史用）
 */
export interface TaskSummary {
    /** 任务 ID */
    id: string;
    /** 任务名称 */
    name: string;
    /** 任务状态 */
    status: 'completed' | 'failed';
    /** 执行结果（简化版） */
    result?: any;
    /** 错误信息 */
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
 * 滚动窗口视图
 */
export interface RollingWindowView {
    /** 后顾任务（已完成的任务） */
    lookBehind: Task[];
    /** 当前任务（正在执行或待执行） */
    current: Task;
    /** 前瞻任务（待执行的任务） */
    lookAhead: Task[];
    /** 压缩历史（最近20个任务的摘要） */
    compressedHistory: TaskSummary[];
}

/**
 * 重规划事件
 */
export interface ReplanEvent {
    /** 事件时间戳 */
    timestamp: Date;
    /** 触发原因 */
    triggerReason: 'task_failure' | 'dependency_change' | 'user_request';
    /** 触发时的任务 ID */
    taskId: string;
    /** 应用的 Patch 操作 */
    patchesApplied: WorkflowPatch[];
    /** 重规划上下文 */
    context?: any;
}

// ============================================================================
// Patch 操作相关类型
// ============================================================================

/**
 * 工作流 Patch 操作
 */
export interface WorkflowPatch {
    /** 操作类型 */
    op: 'add_task' | 'update_task' | 'remove_task' | 'add_edge' | 'remove_edge' | 'reorder';
    /** 目标任务 ID（update_task, remove_task 时需要） */
    targetId?: string;
    /** 操作载荷 */
    payload: Record<string, unknown>;
    /** 操作原因（用于审计） */
    reason: string;
}

// ============================================================================
// Service 接口类型
// ============================================================================

/**
 * 工作流创建输入
 */
export interface CreateWorkflowInput {
    /** 工作流 ID（可选，不提供则自动生成） */
    id?: string;
    /** 工作流名称 */
    name: string;
    /** 工作流描述 */
    description?: string;
    /** 任务列表 */
    tasks?: Task[];
    /** 任务依赖关系 */
    edges?: Edge[];
    /** 窗口配置（可选） */
    windowConfig?: WindowConfig;
}

/**
 * 工作流更新输入
 */
export interface UpdateWorkflowInput {
    /** 工作流名称 */
    name?: string;
    /** 工作流描述 */
    description?: string;
    /** 任务列表 */
    tasks?: Task[];
    /** 任务依赖关系 */
    edges?: Edge[];
    /** 当前聚焦任务 */
    currentFocus?: string;
    /** 窗口配置 */
    windowConfig?: WindowConfig;
    /** 压缩历史 */
    compressedHistory?: TaskSummary[];
    /** 工作流状态 */
    status?: WorkflowStatus;
    /** 重规划历史 */
    replanHistory?: ReplanEvent[];
    /** 执行统计 */
    executionStats?: {
        totalTasks: number;
        completedTasks: number;
        failedTasks: number;
        retriedTasks: number;
    };
    /** 最后执行时间 */
    lastExecutedAt?: Date;
    /** 开始时间 */
    startedAt?: Date;
    /** 完成时间 */
    completedAt?: Date;
}

// ============================================================================
// 执行结果类型
// ============================================================================

/**
 * 任务执行结果
 */
export interface TaskExecutionResult {
    /** 是否成功 */
    success: boolean;
    /** 执行结果 */
    result?: any;
    /** 错误信息 */
    error?: string;
}

/**
 * 工作流执行结果
 */
export interface WorkflowExecutionResult {
    /** 工作流状态 */
    status: WorkflowStatus;
    /** 总步骤数 */
    totalSteps: number;
    /** 已完成步骤数 */
    completedSteps: number;
    /** 失败步骤数 */
    failedSteps: number;
    /** 错误列表 */
    errors: Array<{
        taskId: string;
        taskName: string;
        error: string;
    }>;
}

// ============================================================================
// 工具参数类型（用于 Page 中的 Tool）
// ============================================================================

/**
 * 查看工作流详情工具参数
 */
export interface ViewWorkflowDetailParams {
    /** 工作流 ID */
    workflowId: string;
    /** 用户问题 */
    prompt: string;
}

/**
 * 重规划工具参数
 */
export interface ReplanParams {
    /** 重规划原因 */
    reason: string;
}

// ============================================================================
// 统计和监控类型
// ============================================================================

/**
 * 工作流统计信息
 */
export interface WorkflowStats {
    /** 工作流 ID */
    id: string;
    /** 工作流名称 */
    name: string;
    /** 状态 */
    status: WorkflowStatus;
    /** 总任务数 */
    totalTasks: number;
    /** 已完成任务数 */
    completedTasks: number;
    /** 失败任务数 */
    failedTasks: number;
    /** 进度百分比 */
    progress: number;
    /** 当前聚焦任务 */
    currentFocus?: string;
    /** 创建时间 */
    createdAt?: Date;
    /** 最后执行时间 */
    lastExecutedAt?: Date;
}

/**
 * 滚动窗口统计信息
 */
export interface WindowStats {
    /** 后顾任务数量 */
    lookBehindCount: number;
    /** 前瞻任务数量 */
    lookAheadCount: number;
    /** 压缩历史数量 */
    compressedHistoryCount: number;
    /** 总窗口大小（lookBehind + 1 + lookAhead） */
    totalWindowSize: number;
}
