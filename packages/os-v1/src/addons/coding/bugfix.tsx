import { Type, type Static } from '@sinclair/typebox';
import type { ComponentFactory } from '../../tokens.js';
import type { Injector } from '@context-ai/core';
import * as jsx from '@context-ai/ctp';
import { Context, Text, Data, Group, Tool } from '@context-ai/ctp';
import { BugReportService } from './services/bug-report.service.js';
import { ACTION_EXECUTER } from '../../tokens.js';
import { Layout } from '../../components/Layout.js';
import type { ClaudeRequest, ClaudeResponse } from '../../actions/claude.action.js';
import type { CodexRequest, CodexResponse } from '../../actions/codex.action.js';
import { CLAUDE_TOKEN } from '../../actions/claude.action.js';
import { CODEX_TOKEN } from '../../actions/codex.action.js';

/**
 * Bugfix 页面 Props Schema
 */
export const BugfixPropsSchema = Type.Object({
    status: Type.Optional(Type.Union([
        Type.Literal('pending'),
        Type.Literal('fixing'),
        Type.Literal('fixed'),
        Type.Literal('failed'),
        Type.Literal('ignored')
    ], { description: '按状态过滤 Bug（可选）' })),
    severity: Type.Optional(Type.Union([
        Type.Literal('critical'),
        Type.Literal('high'),
        Type.Literal('medium'),
        Type.Literal('low')
    ], { description: '按严重程度过滤 Bug（可选）' }))
});

export type BugfixProps = Static<typeof BugfixPropsSchema>;

/**
 * Bugfix 页面 ComponentFactory
 *
 * Page: coding://bugfix
 * 用途：展示所有 Bug 报告，支持自动修复
 */
export const BugfixFactory: ComponentFactory<BugfixProps> = async (props: BugfixProps, injector: Injector) => {
    const bugReportService = injector.get(BugReportService);
    const executor = injector.get(ACTION_EXECUTER);

    // 获取过滤条件
    const filters: Parameters<typeof bugReportService.listBugReports>[0] = {};
    if (props.status) filters.status = props.status as any;
    if (props.severity) filters.severity = props.severity as any;

    // 获取 Bug 列表和统计信息
    const bugs = await bugReportService.listBugReports(filters);
    const stats = await bugReportService.getBugStats();

    return (
        <Layout injector={injector}>
            <Context
                name="Bug 报告系统 - 自动化错误修复"
                description="Bug 报告索引 - 捕获、存储和智能修复系统错误"
            >
                <Group title="🐛 System Identity">
                    <Text>你是 Bug 修复伙伴，负责管理和修复系统中的所有错误。</Text>
                    <Text>所有错误都会被自动捕获并存储到数据库中，包括：</Text>
                    <Text>• Action 执行失败的错误（source: action）</Text>
                    <Text>• 全局错误处理器捕获的错误（source: global）</Text>
                    <Text>• 手动报告的错误（source: manual）</Text>
                    <Text>你可以调用 Claude 或 Codex 来智能修复这些错误。</Text>
                </Group>

                <Group title="📊 Bug Statistics">
                    <Text>总 Bug 数: {stats.total}</Text>
                    <Text>状态分布:</Text>
                    <Text>  • pending（待处理）: {stats.pending} 个</Text>
                    <Text>  • fixing（修复中）: {stats.fixing} 个</Text>
                    <Text>  • fixed（已修复）: {stats.fixed} 个</Text>
                    <Text>  • failed（修复失败）: {stats.failed} 个</Text>
                    <Text>  • ignored（已忽略）: {stats.ignored} 个</Text>
                    <Text></Text>
                    <Text>严重程度分布:</Text>
                    <Text>  • critical（致命）: {stats.bySeverity.critical} 个</Text>
                    <Text>  • high（高优先级）: {stats.bySeverity.high} 个</Text>
                    <Text>  • medium（中等）: {stats.bySeverity.medium} 个</Text>
                    <Text>  • low（低优先级）: {stats.bySeverity.low} 个</Text>
                    <Text></Text>
                    <Text>来源分布:</Text>
                    <Text>  • action（Action 错误）: {stats.bySource.action} 个</Text>
                    <Text>  • global（全局错误）: {stats.bySource.global} 个</Text>
                    <Text>  • manual（手动报告）: {stats.bySource.manual} 个</Text>
                    <Text></Text>
                    <Text>修复成功率: {stats.fixSuccessRate}%</Text>
                    {(props.status || props.severity) && (
                        <Text>
                            当前筛选条件: {props.status ? `status="${props.status}"` : ''}
                            {props.severity ? ` severity="${props.severity}"` : ''}
                            - 结果集 = {bugs.length} 个 Bug
                        </Text>
                    )}
                </Group>

                <Group title="🐞 Bug Report List">
                    <Data
                        source={bugs.map(bug => ({
                            id: bug.id?.substring(0, 8) || '',
                            status: bug.status || 'unknown',
                            severity: bug.severity || 'medium',
                            source: bug.source || 'manual',
                            error_message: bug.error_message?.substring(0, 80) || '',
                            token: bug.token || 'N/A',
                            fix_attempts: bug.fix_attempts || 0,
                            fix_method: bug.fix_method || 'N/A',
                            created_at: bug.created_at ? new Date(bug.created_at).toISOString() : 'N/A'
                        }))}
                        format="table"
                        fields={['id', 'status', 'severity', 'source', 'error_message', 'token', 'fix_attempts', 'fix_method', 'created_at']}
                        title="Bug Reports"
                    />
                </Group>

                <Group title="🎯 Available Actions">
                    <Text>• viewBugDetail: 查看 Bug 详情（包含完整堆栈和上下文信息）</Text>
                    <Text>• autoFixBug: 智能修复 Bug（AI 自动选择 Claude 或 Codex）</Text>
                    <Text>• fixWithClaude: 使用 Claude 修复 Bug（适合复杂推理）</Text>
                    <Text>• fixWithCodex: 使用 Codex 修复 Bug（适合快速修复）</Text>
                    <Text>• updateBugStatus: 手动更新 Bug 状态</Text>
                </Group>

                {/* Tool: 查看 Bug 详情 */}
                <Tool
                    name='viewBugDetail'
                    label='查看 Bug 详情'
                    description='查看指定 Bug 的完整信息，包括错误堆栈、上下文、文件路径等'
                    parameters={Type.Object({
                        bugId: Type.String({
                            description: 'Bug ID（从上方表格的 id 列中选择，可以是前 8 位）'
                        })
                    })}
                    execute={async (_toolCallId, params) => {
                        // 支持短 ID
                        const fullBug = bugs.find(b => b.id?.startsWith(params.bugId));
                        if (!fullBug || !fullBug.id) {
                            return {
                                content: [{ type: 'text', text: `❌ Bug not found: ${params.bugId}` }],
                                details: null
                            };
                        }

                        const bug = await bugReportService.getBugReport(fullBug.id);
                        if (!bug) {
                            return {
                                content: [{ type: 'text', text: `❌ Bug not found: ${params.bugId}` }],
                                details: null
                            };
                        }

                        const detail = [
                            `📋 Bug Report Detail (ID: ${bug.id})`,
                            ``,
                            `Status: ${bug.status}`,
                            `Severity: ${bug.severity}`,
                            `Source: ${bug.source}`,
                            `Token: ${bug.token || 'N/A'}`,
                            `Execution ID: ${bug.execution_id || 'N/A'}`,
                            ``,
                            `❌ Error Message:`,
                            bug.error_message || 'N/A',
                            ``,
                            `📍 Stack Trace:`,
                            bug.error_stack || 'N/A',
                            ``,
                            `📂 File: ${bug.file_path || 'N/A'}`,
                            `📏 Line: ${bug.line_number || 'N/A'}`,
                            ``,
                            `🔧 Fix Attempts: ${bug.fix_attempts || 0}`,
                            `🛠️ Fix Method: ${bug.fix_method || 'N/A'}`,
                            `🤖 Fix Model: ${bug.fix_model || 'N/A'}`,
                            ``,
                            `📦 Context:`,
                            JSON.stringify(bug.context || {}, null, 2),
                            ``,
                            `✅ Fix Result:`,
                            bug.fix_result ? JSON.stringify(bug.fix_result, null, 2) : 'No fix attempts yet',
                            ``,
                            `🏷️ Tags: ${bug.tags?.join(', ') || 'None'}`,
                            `⏰ Created: ${bug.created_at}`,
                            `⏰ Updated: ${bug.updated_at}`,
                            `⏰ Fixed: ${bug.fixed_at || 'Not fixed yet'}`,
                            `⏰ Last Fix Attempt: ${bug.last_fix_attempt_at || 'Never'}`
                        ].join('\n');

                        return {
                            content: [{ type: 'text', text: detail }],
                            details: null
                        };
                    }}
                />

                {/* Tool: 智能自动修复 */}
                <Tool
                    name='autoFixBug'
                    label='智能修复 Bug'
                    description='AI 自动分析错误并选择最适合的修复方式（Claude 或 Codex）'
                    parameters={Type.Object({
                        bugId: Type.String({
                            description: 'Bug ID（从表格中选择）'
                        }),
                        reason: Type.String({
                            description: '为什么要修复这个 Bug？提供上下文帮助 AI 做出更好的决策'
                        })
                    })}
                    execute={async (_toolCallId, params) => {
                        const fullBug = bugs.find(b => b.id?.startsWith(params.bugId));
                        if (!fullBug || !fullBug.id) {
                            return {
                                content: [{ type: 'text', text: `❌ Bug not found: ${params.bugId}` }],
                                details: null
                            };
                        }

                        const bug = await bugReportService.getBugReport(fullBug.id);
                        if (!bug) {
                            return {
                                content: [{ type: 'text', text: `❌ Bug not found: ${params.bugId}` }],
                                details: null
                            };
                        }

                        // AI 决策：根据错误类型和严重程度选择修复方式
                        const shouldUseClaude =
                            bug.severity === 'critical' ||
                            bug.severity === 'high' ||
                            (bug.error_message?.includes('logic') ||
                             bug.error_message?.includes('design') ||
                             bug.error_message?.includes('architecture'));

                        const method = shouldUseClaude ? 'claude' : 'codex';
                        const model = shouldUseClaude ? 'sonnet' : 'claude-sonnet-4.5';

                        // 构建修复提示词
                        const prompt = [
                            `Fix the following error:`,
                            ``,
                            `Error: ${bug.error_message}`,
                            ``,
                            `Stack Trace:`,
                            bug.error_stack || 'N/A',
                            ``,
                            `File: ${bug.file_path || 'Unknown'}`,
                            `Line: ${bug.line_number || 'Unknown'}`,
                            ``,
                            `Context:`,
                            JSON.stringify(bug.context || {}, null, 2),
                            ``,
                            `Reason for fix: ${params.reason}`,
                            ``,
                            `Please analyze the error and provide a fix.`
                        ].join('\n');

                        // 更新状态为 fixing
                        await bugReportService.updateBugStatus(bug.id!, 'fixing');

                        // 执行修复
                        const startTime = Date.now();
                        try {
                            let result: ClaudeResponse | CodexResponse;
                            if (method === 'claude') {
                                const request: ClaudeRequest = {
                                    prompt,
                                    model: model as any,
                                    permission_mode: 'dontAsk'
                                };
                                result = await executor.execute(CLAUDE_TOKEN, request, injector);
                            } else {
                                const request: CodexRequest = {
                                    prompt,
                                    model: model as any,
                                    full_auto: true
                                };
                                result = await executor.execute(CODEX_TOKEN, request, injector);
                            }

                            const duration = Date.now() - startTime;

                            if (result.success) {
                                await bugReportService.recordFixAttempt(bug.id!, method, model, {
                                    success: true,
                                    stdout: result.stdout,
                                    stderr: result.stderr,
                                    exit_code: result.exit_code,
                                    duration_ms: duration
                                });

                                return {
                                    content: [{
                                        type: 'text',
                                        text: `✅ Bug fixed successfully using ${method.toUpperCase()} (${model})!\n\nFix Output:\n${result.stdout}`
                                    }],
                                    details: null
                                };
                            } else {
                                await bugReportService.recordFixAttempt(bug.id!, method, model, {
                                    success: false,
                                    stderr: result.stderr,
                                    exit_code: result.exit_code,
                                    duration_ms: duration
                                });

                                return {
                                    content: [{
                                        type: 'text',
                                        text: `❌ Fix failed using ${method.toUpperCase()}: ${result.stderr}`
                                    }],
                                    details: null
                                };
                            }
                        } catch (error) {
                            const duration = Date.now() - startTime;
                            const errorMsg = error instanceof Error ? error.message : String(error);

                            await bugReportService.recordFixAttempt(bug.id!, method, model, {
                                success: false,
                                error: errorMsg,
                                duration_ms: duration
                            });

                            return {
                                content: [{
                                    type: 'text',
                                    text: `❌ Fix failed with exception: ${errorMsg}`
                                }],
                                details: null
                            };
                        }
                    }}
                />

                {/* Tool: 使用 Claude 修复 */}
                <Tool
                    name='fixWithClaude'
                    label='使用 Claude 修复'
                    description='使用 Claude 进行复杂推理修复（适合架构、设计类问题）'
                    parameters={Type.Object({
                        bugId: Type.String({ description: 'Bug ID' }),
                        model: Type.Optional(Type.Union([
                            Type.Literal('sonnet'),
                            Type.Literal('opus'),
                            Type.Literal('haiku')
                        ], { description: 'Claude 模型（默认 sonnet）' }))
                    })}
                    execute={async (_toolCallId, _params) => {
                        // 实现类似 autoFixBug，但强制使用 Claude
                        return {
                            content: [{ type: 'text', text: '🚧 Claude 修复功能开发中...' }],
                            details: null
                        };
                    }}
                />

                {/* Tool: 使用 Codex 修复 */}
                <Tool
                    name='fixWithCodex'
                    label='使用 Codex 修复'
                    description='使用 Codex 进行快速修复（适合语法、类型类问题）'
                    parameters={Type.Object({
                        bugId: Type.String({ description: 'Bug ID' })
                    })}
                    execute={async (_toolCallId, _params) => {
                        // 实现类似 autoFixBug，但强制使用 Codex
                        return {
                            content: [{ type: 'text', text: '🚧 Codex 修复功能开发中...' }],
                            details: null
                        };
                    }}
                />

                {/* Tool: 更新状态 */}
                <Tool
                    name='updateBugStatus'
                    label='更新 Bug 状态'
                    description='手动更新 Bug 的状态'
                    parameters={Type.Object({
                        bugId: Type.String({ description: 'Bug ID' }),
                        status: Type.Union([
                            Type.Literal('pending'),
                            Type.Literal('fixing'),
                            Type.Literal('fixed'),
                            Type.Literal('failed'),
                            Type.Literal('ignored')
                        ], { description: '新状态' })
                    })}
                    execute={async (_toolCallId, params) => {
                        const fullBug = bugs.find(b => b.id?.startsWith(params.bugId));
                        if (!fullBug || !fullBug.id) {
                            return {
                                content: [{ type: 'text', text: `❌ Bug not found: ${params.bugId}` }],
                                details: null
                            };
                        }

                        await bugReportService.updateBugStatus(fullBug.id, params.status as any);

                        return {
                            content: [{
                                type: 'text',
                                text: `✅ Bug status updated to: ${params.status}`
                            }],
                            details: null
                        };
                    }}
                />
            </Context>
        </Layout>
    );
};
