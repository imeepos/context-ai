import { Type, type Static } from '@sinclair/typebox';
import type { Injector } from '@context-ai/core';
import * as jsx from '@context-ai/ctp';
import { Context, Group, Tool } from '@context-ai/ctp';
import { Header } from './Header.js';
import { Footer } from './Footer.js';
import { PAGES, ACTION_EXECUTER, CURRENT_PAGE } from '../tokens.js';
import { LOOP_REQUEST_TOKEN } from '../actions/loop.action.js';

/**
 * Layout Props Schema
 */
export const LayoutPropsSchema = Type.Object({});

export type LayoutProps = Static<typeof LayoutPropsSchema> & { injector: Injector };

export const Layout = async (
    props: LayoutProps & { children?: any },
) => {
    const page = props.injector.get(CURRENT_PAGE)
    const pages = props.injector.get(PAGES, []);
    const executor = props.injector.get(ACTION_EXECUTER);


    return (
        <Context
            name={page.name}
            description={page.description}
        >
            {/* Header - 直接使用同步组件 */}
            {<Header injector={props.injector} />}

            {/* Main Content */}
            {props.children}

            {/* Footer - 直接使用同步组件 */}
            {<Footer injector={props.injector} />}

            {/* Navigation Tool */}
            <Group title="🧭 Navigation Tools">
                <Tool
                    name='navigateTo'
                    label='导航到其他页面'
                    description='跳转到指定的页面路径并执行提示词。支持所有已注册的页面。'
                    parameters={Type.Object({
                        path: Type.String({
                            description: '目标页面路径（例如：workflow://list, workflow://detail/workflow-123）'
                        }),
                        prompt: Type.String({
                            description: '要在目标页面执行的提示词（例如：查看当前状态、执行下一步）'
                        })
                    })}
                    execute={async (_toolCallId, params) => {
                        try {
                            const res = await executor.execute(
                                LOOP_REQUEST_TOKEN,
                                {
                                    path: params.path,
                                    prompt: params.prompt
                                },
                                props.injector
                            );

                            if (res.success) {
                                return {
                                    content: [{
                                        type: 'text',
                                        text: `✓ 页面跳转成功\n\n目标页面: ${params.path}\n\n--- 页面输出 ---\n\n${res.output}\n\n--- 输出结束 ---\n\n工具调用次数: ${res.toolCallsCount}`
                                    }],
                                    details: null
                                };
                            }

                            return {
                                content: [{
                                    type: 'text',
                                    text: `✗ 页面跳转失败\n\n目标页面: ${params.path}\n错误信息: ${res.error || 'Unknown error'}\n\n可用页面列表:\n${pages.map(p => `• ${p.path} - ${p.name}`).join('\n')}`
                                }],
                                details: null
                            };
                        } catch (error) {
                            const errorMessage = error instanceof Error ? error.message : String(error);
                            return {
                                content: [{
                                    type: 'text',
                                    text: `✗ 导航执行失败: ${errorMessage}`
                                }],
                                details: null
                            };
                        }
                    }}
                />
            </Group>
        </Context>
    );
}
