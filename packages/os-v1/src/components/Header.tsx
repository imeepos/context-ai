import { Type, type Static } from '@sinclair/typebox';
import type { Injector } from '@context-ai/core';
import * as jsx from '@context-ai/ctp';
import { Group, Text, Data } from '@context-ai/ctp';
import { CURRENT_PAGE, PAGES, type PageFactory } from '../tokens.js';

/**
 * Header Props Schema
 */
export const HeaderPropsSchema = Type.Object({});

export type HeaderProps = Static<typeof HeaderPropsSchema> & {
    injector: Injector;
};

export function Header(props: HeaderProps) {
    const pages = props.injector.get(PAGES, []);
    const currentPage = props.injector.get(CURRENT_PAGE)

    // 按应用分组 pages（假设 path 格式为 "app://page"）
    const pagesByApp = pages.reduce((acc, page) => {
        const appName = page.path.split('://')[0] || 'unknown';
        if (!acc[appName]) {
            acc[appName] = [];
        }
        acc[appName].push(page);
        return acc;
    }, {} as Record<string, PageFactory[]>);

    return (
        <Group title="📋 Navigation">

            <Text>## {currentPage.name}</Text>

            <Group title="📍 Current Page">
                <Text>• **Name**: {currentPage.name}</Text>
                <Text>• **Path**: {currentPage.path}</Text>
                <Text>• **Description**: {currentPage.description}</Text>
            </Group>

            <Group title="🗂️ Available Pages">
                <Text>{`系统中注册了 ${pages.length} 个页面：`}</Text>
                {Object.entries(pagesByApp).map(([appName, appPages]) => (
                    <Group title={`${appName}:// (${appPages.length} pages)`} >
                        <Data
                            source={appPages.map(p => ({
                                name: p.name,
                                path: p.path,
                                description: p.description
                            }))}
                            format="table"
                            fields={['name', 'path', 'description']}
                            title={`${appName} Pages`}
                        />
                    </Group>
                ))}
            </Group>
        </Group>
    );
}
