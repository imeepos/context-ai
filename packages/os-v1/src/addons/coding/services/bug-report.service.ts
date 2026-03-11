import { Inject, Injectable } from "@context-ai/core";
import { DataSource } from "typeorm";
import { BugReport } from "../entities/bug-report.entity.js";

/**
 * Bug 报告服务
 *
 * 负责 Bug 报告的 CRUD 操作和统计查询
 */
@Injectable()
export class BugReportService {
    constructor(@Inject(DataSource) private readonly dataSource: DataSource) {}

    // ============================================================================
    // CRUD 操作
    // ============================================================================

    /**
     * 创建 Bug 报告
     */
    async createBugReport(input: {
        error_message: string;
        error_stack?: string;
        error_type?: string;
        source: 'action' | 'global' | 'manual';
        token?: string;
        execution_id?: string;
        context?: Record<string, unknown>;
        file_path?: string;
        line_number?: number;
        severity?: 'critical' | 'high' | 'medium' | 'low';
        auto_fixable?: boolean;
        tags?: string[];
    }): Promise<BugReport> {
        const repo = this.getRepository();
        const created = repo.create({
            error_message: input.error_message,
            error_stack: input.error_stack,
            error_type: input.error_type,
            source: input.source,
            token: input.token,
            execution_id: input.execution_id,
            context: input.context,
            file_path: input.file_path,
            line_number: input.line_number,
            severity: input.severity ?? 'medium',
            auto_fixable: input.auto_fixable ?? true,
            tags: input.tags,
            status: 'pending',
            fix_attempts: 0
        });
        return repo.save(created);
    }

    /**
     * 列出所有 Bug 报告（支持过滤）
     */
    async listBugReports(filters?: {
        status?: 'pending' | 'fixing' | 'fixed' | 'failed' | 'ignored';
        severity?: 'critical' | 'high' | 'medium' | 'low';
        source?: 'action' | 'global' | 'manual';
        auto_fixable?: boolean;
    }): Promise<BugReport[]> {
        const repo = this.getRepository();

        if (!filters) {
            return repo.find({ order: { created_at: 'DESC' } });
        }

        const where: {
            status?: 'pending' | 'fixing' | 'fixed' | 'failed' | 'ignored';
            severity?: 'critical' | 'high' | 'medium' | 'low';
            source?: 'action' | 'global' | 'manual';
            auto_fixable?: boolean;
        } = {};
        if (filters.status) where.status = filters.status;
        if (filters.severity) where.severity = filters.severity;
        if (filters.source) where.source = filters.source;
        if (filters.auto_fixable !== undefined) where.auto_fixable = filters.auto_fixable;

        return repo.find({ where, order: { created_at: 'DESC' } });
    }

    /**
     * 获取 Bug 报告
     */
    async getBugReport(id: string): Promise<BugReport | null> {
        return this.getRepository().findOne({ where: { id } });
    }

    /**
     * 获取 Bug 报告（不存在则抛出异常）
     */
    async getBugReportOrThrow(id: string): Promise<BugReport> {
        const bug = await this.getBugReport(id);
        if (!bug) {
            throw new Error(`Bug report not found: ${id}`);
        }
        return bug;
    }

    /**
     * 更新 Bug 报告状态
     */
    async updateBugStatus(
        id: string,
        status: 'pending' | 'fixing' | 'fixed' | 'failed' | 'ignored'
    ): Promise<BugReport> {
        const repo = this.getRepository();
        const bug = await this.getBugReportOrThrow(id);
        bug.status = status;

        if (status === 'fixed') {
            bug.fixed_at = new Date();
        }

        return repo.save(bug);
    }

    /**
     * 记录修复尝试
     */
    async recordFixAttempt(
        id: string,
        method: 'claude' | 'codex' | 'manual' | 'auto',
        model: string,
        result: {
            success: boolean;
            stdout?: string;
            stderr?: string;
            exit_code?: number;
            duration_ms?: number;
            error?: string;
        }
    ): Promise<BugReport> {
        const repo = this.getRepository();
        const bug = await this.getBugReportOrThrow(id);

        bug.fix_attempts = (bug.fix_attempts || 0) + 1;
        bug.fix_method = method;
        bug.fix_model = model;
        bug.fix_result = result;
        bug.last_fix_attempt_at = new Date();

        // 根据修复结果更新状态
        if (result.success) {
            bug.status = 'fixed';
            bug.fixed_at = new Date();
        } else if (bug.fix_attempts >= 3) {
            bug.status = 'failed';
        }

        return repo.save(bug);
    }

    /**
     * 删除 Bug 报告
     */
    async deleteBugReport(id: string): Promise<boolean> {
        const repo = this.getRepository();
        const bug = await this.getBugReport(id);
        if (!bug) {
            return false;
        }
        await repo.remove(bug);
        return true;
    }

    // ============================================================================
    // 统计查询
    // ============================================================================

    /**
     * 获取 Bug 统计信息
     */
    async getBugStats(): Promise<{
        total: number;
        pending: number;
        fixing: number;
        fixed: number;
        failed: number;
        ignored: number;
        bySeverity: {
            critical: number;
            high: number;
            medium: number;
            low: number;
        };
        bySource: {
            action: number;
            global: number;
            manual: number;
        };
        fixSuccessRate: number;
    }> {
        const repo = this.getRepository();
        const allBugs = await repo.find();

        const total = allBugs.length;
        const pending = allBugs.filter(b => b.status === 'pending').length;
        const fixing = allBugs.filter(b => b.status === 'fixing').length;
        const fixed = allBugs.filter(b => b.status === 'fixed').length;
        const failed = allBugs.filter(b => b.status === 'failed').length;
        const ignored = allBugs.filter(b => b.status === 'ignored').length;

        const bySeverity = {
            critical: allBugs.filter(b => b.severity === 'critical').length,
            high: allBugs.filter(b => b.severity === 'high').length,
            medium: allBugs.filter(b => b.severity === 'medium').length,
            low: allBugs.filter(b => b.severity === 'low').length,
        };

        const bySource = {
            action: allBugs.filter(b => b.source === 'action').length,
            global: allBugs.filter(b => b.source === 'global').length,
            manual: allBugs.filter(b => b.source === 'manual').length,
        };

        const fixAttempted = fixed + failed;
        const fixSuccessRate = fixAttempted > 0 ? Math.round((fixed / fixAttempted) * 100) : 0;

        return {
            total,
            pending,
            fixing,
            fixed,
            failed,
            ignored,
            bySeverity,
            bySource,
            fixSuccessRate
        };
    }

    /**
     * 获取最近的 Bug 报告
     */
    async getRecentBugs(limit: number = 10): Promise<BugReport[]> {
        const repo = this.getRepository();
        return repo.find({
            order: { created_at: 'DESC' },
            take: limit
        });
    }

    /**
     * 根据 execution_id 查找 Bug
     */
    async getBugsByExecutionId(executionId: string): Promise<BugReport[]> {
        const repo = this.getRepository();
        return repo.find({
            where: { execution_id: executionId },
            order: { created_at: 'DESC' }
        });
    }

    // ============================================================================
    // Private Helper Methods
    // ============================================================================

    private getRepository() {
        return this.dataSource.getRepository(BugReport);
    }
}
