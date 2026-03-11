import { Type, type Static } from '@sinclair/typebox';
import type { Injector } from '@context-ai/core';
import * as jsx from '@context-ai/ctp';
import { Group, Text } from '@context-ai/ctp';
import { APPLICATIONS } from '../tokens.js';

/**
 * Footer Props Schema
 */
export const FooterPropsSchema = Type.Object({});

export type FooterProps = Static<typeof FooterPropsSchema> & {
    injector: Injector;
};

export function Footer(props: FooterProps) {
    const applications = props.injector.get(APPLICATIONS, []);

    return (
        <Group title="ℹ️ System Info">
            <Group title="📦 Installed Applications">
                <Text>{`当前系统安装了 ${applications.length} 个应用：`}</Text>
                {applications.map(app => (
                    <Text>{`• **${app.name}** v${app.version} - ${app.description}`}</Text>
                ))}
            </Group>

            <Group title="💡 Help & Tips">
                <Text>• 使用 navigateTo 工具跳转到其他页面</Text>
                <Text>• 每个页面都有特定的 Props Schema，请根据 Schema 传递正确的参数</Text>
                <Text>• 查看页面列表：使用 Header 组件的 showPageList 参数</Text>
            </Group>

            <Text>---</Text>
            <Text>Powered by Context AI OS v1</Text>
        </Group>
    );
}
