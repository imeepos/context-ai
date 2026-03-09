import { Type, type Static } from '@sinclair/typebox';
import type { ComponentFactory } from '../../tokens.js';
import type { Injector } from '@context-ai/core';
import * as jsx from '@context-ai/ctp';
import { Context, Text, Data, Group } from '@context-ai/ctp';
import { APPLICATIONS } from '../../tokens.js';

export const DetailPropsSchema = Type.Object({
    appName: Type.String({ description: 'The name of the application to query' })
});

export type DetailProps = Static<typeof DetailPropsSchema>;

export const DetailFactory: ComponentFactory<DetailProps> = async (props: DetailProps, injector: Injector) => {
    const applications = injector.get(APPLICATIONS, []);
    const app = applications.find(a => a.name === props.appName);

    if (!app) {
        return (
            <Context
                name="Application Detail"
                description="View application details"
            >
                <Group title="Error">
                    <Text>Application not found: {props.appName}</Text>
                </Group>
            </Context>
        );
    }

    const pageData = app.pages.map(page => ({
        name: page.name,
        path: page.path,
        description: page.description
    }));

    return (
        <Context
            name="Application Detail"
            description="View application details"
        >
            <Group title="Role Definition">
                <Text>You are an application detail assistant.</Text>
                <Text>Help users understand specific application information and available pages.</Text>
            </Group>

            <Group title="Application Info">
                <Data
                    source={[{
                        name: app.name,
                        description: app.description,
                        version: app.version
                    }]}
                    format="table"
                    fields={['name', 'description', 'version']}
                    title="Application Information"
                />
            </Group>

            <Group title="Available Pages">
                <Data
                    source={pageData}
                    format="table"
                    fields={['name', 'path', 'description']}
                    title="Pages"
                />
            </Group>
        </Context>
    );
};