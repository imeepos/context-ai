import { Type, type Static } from '@sinclair/typebox';
import type { ComponentFactory } from '../../tokens.js';
import type { Injector } from '@context-ai/core';
import * as jsx from '@context-ai/ctp';
import { Context, Text, Group, Tool } from '@context-ai/ctp';
import { ACTION_EXECUTER } from '../../tokens.js';
import { CLAUDE_TOKEN, type ClaudeRequest } from '../../actions/claude.action.js';
import { CODEX_TOKEN, type CodexRequest } from '../../actions/codex.action.js';
import { CodingHistoryStore } from '../../core/coding-history-store.js';

export const ExecutePropsSchema = Type.Object({
    assistant: Type.Optional(Type.Union([
        Type.Literal('claude', { description: 'Use Claude CLI assistant' }),
        Type.Literal('codex', { description: 'Use Codex CLI assistant' })
    ], { description: 'Choose AI coding assistant' }))
});

export type ExecuteProps = Static<typeof ExecutePropsSchema>;

export const ExecuteFactory: ComponentFactory<ExecuteProps> = async (props: ExecuteProps, injector: Injector) => {
    const actionExecuter = injector.get(ACTION_EXECUTER);
    const historyStore = injector.get(CodingHistoryStore);

    if (!actionExecuter) {
        return (
            <Context
                name="Coding Assistant"
                description="Execute coding tasks with AI assistants"
            >
                <Group title="Error">
                    <Text>ActionExecuter not available. Please check system configuration.</Text>
                </Group>
            </Context>
        );
    }

    const selectedAssistant = props.assistant ?? 'claude';

    return (
        <Context
            name="Coding Assistant"
            description="Execute coding tasks using Claude or Codex AI assistants"
        >
            <Group title="Role Definition">
                <Text>You are an AI coding assistant coordinator that helps users execute coding tasks.</Text>
                <Text></Text>
                <Text>## Your Responsibilities</Text>
                <Text>1. Analyze user's coding requirements and determine the appropriate AI assistant (Claude or Codex)</Text>
                <Text>2. Select the optimal model based on task complexity:</Text>
                <Text>   - Claude Haiku: Simple, quick tasks (code formatting, simple refactoring)</Text>
                <Text>   - Claude Sonnet: Standard development tasks (feature implementation, bug fixes)</Text>
                <Text>   - Claude Opus: Complex architectural decisions, large refactoring</Text>
                <Text>   - Codex: Alternative AI assistant with different capabilities</Text>
                <Text>3. Configure execution parameters (working directory, permissions, timeout)</Text>
                <Text>4. Execute the task using the appropriate tool</Text>
                <Text>5. Interpret and present results to the user clearly</Text>
                <Text></Text>
                <Text>## Decision Guidelines</Text>
                <Text>- For code generation/refactoring: Use Claude Sonnet or Opus</Text>
                <Text>- For debugging: Use Claude Opus for complex issues, Sonnet for standard bugs</Text>
                <Text>- For quick fixes: Use Claude Haiku</Text>
                <Text>- For alternative perspective: Try Codex</Text>
                <Text></Text>
                <Text>## Important Notes</Text>
                <Text>- Always specify the working directory (cwd) if the task is project-specific</Text>
                <Text>- Use appropriate permission modes: 'dontAsk' for automated execution, 'plan' for review-first approach</Text>
                <Text>- Set reasonable timeouts based on task complexity (default: 5 minutes)</Text>
                <Text>- After tool execution, ALWAYS provide a clear summary of what was accomplished or what failed</Text>
            </Group>

            <Group title="Current Configuration">
                <Text>Default Assistant: {selectedAssistant}</Text>
                <Text>Available Models:</Text>
                <Text>  - Claude: haiku (fast), sonnet (balanced), opus (powerful)</Text>
                <Text>  - Codex: claude-opus-4 (default)</Text>
            </Group>

            <Group title="Usage Examples">
                <Text>Example 1: "Write a TypeScript function to validate email addresses"</Text>
                <Text>  → Use executeWithClaude, model: sonnet, permission_mode: dontAsk</Text>
                <Text></Text>
                <Text>Example 2: "Refactor the entire authentication system"</Text>
                <Text>  → Use executeWithClaude, model: opus, permission_mode: plan (for review)</Text>
                <Text></Text>
                <Text>Example 3: "Fix indentation in config.json"</Text>
                <Text>  → Use executeWithClaude, model: haiku, permission_mode: dontAsk</Text>
            </Group>

            <Tool
                name='executeWithClaude'
                label='Execute with Claude'
                description='Execute coding task using Claude CLI. Supports multiple models (sonnet/opus/haiku) and permission modes.'
                parameters={Type.Object({
                    prompt: Type.String({ description: 'Coding task description or instruction' }),
                    cwd: Type.Optional(Type.String({ description: 'Working directory for execution' })),
                    model: Type.Optional(Type.Union([
                        Type.Literal('sonnet'),
                        Type.Literal('opus'),
                        Type.Literal('haiku')
                    ], { description: 'Claude model to use', default: 'sonnet' })),
                    permission_mode: Type.Optional(Type.Union([
                        Type.Literal('acceptEdits'),
                        Type.Literal('bypassPermissions'),
                        Type.Literal('default'),
                        Type.Literal('delegate'),
                        Type.Literal('dontAsk'),
                        Type.Literal('plan')
                    ], { description: 'Permission mode', default: 'dontAsk' })),
                    max_budget_usd: Type.Optional(Type.Number({ description: 'Maximum budget in USD' })),
                    timeout_ms: Type.Optional(Type.Number({ description: 'Timeout in milliseconds', default: 300000 }))
                })}
                execute={async (_toolCallId, params) => {
                    const startTime = Date.now();
                    try {
                        const request: ClaudeRequest = {
                            prompt: params.prompt,
                            cwd: params.cwd,
                            model: params.model,
                            print: true,
                            output_format: 'text',
                            permission_mode: params.permission_mode ?? 'dontAsk',
                            no_session_persistence: true,
                            max_budget_usd: params.max_budget_usd,
                            timeout_ms: params.timeout_ms ?? 300000
                        };

                        const result = await actionExecuter.execute(CLAUDE_TOKEN, request, injector);
                        const duration_ms = Date.now() - startTime;

                        // 记录执行历史
                        if (historyStore) {
                            await historyStore.addRecord({
                                id: `claude-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                                timestamp: new Date().toISOString(),
                                assistant: 'claude',
                                model: params.model ?? 'sonnet',
                                prompt: params.prompt,
                                cwd: params.cwd,
                                success: result.success,
                                duration_ms,
                                exit_code: result.exit_code,
                                stdout_preview: result.stdout.substring(0, 500),
                                stderr_preview: result.stderr.substring(0, 500)
                            });
                        }

                        if (result.success) {
                            return {
                                content: [
                                    { type: 'text', text: `✓ Claude execution completed successfully.\n\nOutput:\n${result.stdout}` }
                                ],
                                details: {
                                    assistant: 'claude',
                                    model: params.model ?? 'sonnet',
                                    exit_code: result.exit_code,
                                    duration_ms,
                                    success: true
                                }
                            };
                        } else {
                            return {
                                content: [
                                    { type: 'text', text: `✗ Claude execution failed (exit code: ${result.exit_code}).\n\nError:\n${result.stderr}\n\nOutput:\n${result.stdout}` }
                                ],
                                details: {
                                    assistant: 'claude',
                                    model: params.model ?? 'sonnet',
                                    exit_code: result.exit_code,
                                    duration_ms,
                                    success: false
                                }
                            };
                        }
                    } catch (error) {
                        const duration_ms = Date.now() - startTime;
                        const errorMessage = error instanceof Error ? error.message : String(error);

                        // 记录失败的执行
                        if (historyStore) {
                            await historyStore.addRecord({
                                id: `claude-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                                timestamp: new Date().toISOString(),
                                assistant: 'claude',
                                model: params.model ?? 'sonnet',
                                prompt: params.prompt,
                                cwd: params.cwd,
                                success: false,
                                duration_ms,
                                exit_code: -1,
                                stderr_preview: errorMessage.substring(0, 500)
                            });
                        }

                        return {
                            content: [{ type: 'text', text: `Failed to execute with Claude: ${errorMessage}` }],
                            details: null
                        };
                    }
                }}
            />

            <Tool
                name='executeWithCodex'
                label='Execute with Codex'
                description='Execute coding task using Codex CLI. Supports model selection and sandbox modes.'
                parameters={Type.Object({
                    prompt: Type.String({ description: 'Coding task description or instruction' }),
                    cwd: Type.Optional(Type.String({ description: 'Working directory for execution' })),
                    model: Type.Optional(Type.String({ description: 'Model to use (e.g., claude-opus-4)', default: 'claude-opus-4' })),
                    sandbox: Type.Optional(Type.Union([
                        Type.Literal('read-only'),
                        Type.Literal('workspace-write'),
                        Type.Literal('danger-full-access')
                    ], { description: 'Sandbox policy', default: 'workspace-write' })),
                    skip_git_repo_check: Type.Optional(Type.Boolean({ description: 'Allow running outside Git repository', default: false })),
                    full_auto: Type.Optional(Type.Boolean({ description: 'Enable full-auto mode', default: true })),
                    timeout_ms: Type.Optional(Type.Number({ description: 'Timeout in milliseconds', default: 300000 }))
                })}
                execute={async (_toolCallId, params) => {
                    const startTime = Date.now();
                    try {
                        const request: CodexRequest = {
                            prompt: params.prompt,
                            cwd: params.cwd,
                            model: params.model,
                            sandbox: params.sandbox ?? 'workspace-write',
                            skip_git_repo_check: params.skip_git_repo_check ?? false,
                            full_auto: params.full_auto ?? true,
                            timeout_ms: params.timeout_ms ?? 300000
                        };

                        const result = await actionExecuter.execute(CODEX_TOKEN, request, injector);
                        const duration_ms = Date.now() - startTime;

                        // 记录执行历史
                        if (historyStore) {
                            await historyStore.addRecord({
                                id: `codex-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                                timestamp: new Date().toISOString(),
                                assistant: 'codex',
                                model: params.model ?? 'claude-opus-4',
                                prompt: params.prompt,
                                cwd: params.cwd,
                                success: result.success,
                                duration_ms,
                                exit_code: result.exit_code,
                                stdout_preview: result.stdout.substring(0, 500),
                                stderr_preview: result.stderr.substring(0, 500)
                            });
                        }

                        if (result.success) {
                            return {
                                content: [
                                    { type: 'text', text: `✓ Codex execution completed successfully.\n\nOutput:\n${result.stdout}` }
                                ],
                                details: {
                                    assistant: 'codex',
                                    model: params.model ?? 'claude-opus-4',
                                    exit_code: result.exit_code,
                                    duration_ms,
                                    success: true
                                }
                            };
                        } else {
                            return {
                                content: [
                                    { type: 'text', text: `✗ Codex execution failed (exit code: ${result.exit_code}).\n\nError:\n${result.stderr}\n\nOutput:\n${result.stdout}` }
                                ],
                                details: {
                                    assistant: 'codex',
                                    model: params.model ?? 'claude-opus-4',
                                    exit_code: result.exit_code,
                                    duration_ms,
                                    success: false
                                }
                            };
                        }
                    } catch (error) {
                        const duration_ms = Date.now() - startTime;
                        const errorMessage = error instanceof Error ? error.message : String(error);

                        // 记录失败的执行
                        if (historyStore) {
                            await historyStore.addRecord({
                                id: `codex-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                                timestamp: new Date().toISOString(),
                                assistant: 'codex',
                                model: params.model ?? 'claude-opus-4',
                                prompt: params.prompt,
                                cwd: params.cwd,
                                success: false,
                                duration_ms,
                                exit_code: -1,
                                stderr_preview: errorMessage.substring(0, 500)
                            });
                        }

                        return {
                            content: [{ type: 'text', text: `Failed to execute with Codex: ${errorMessage}` }],
                            details: null
                        };
                    }
                }}
            />
        </Context>
    );
};
