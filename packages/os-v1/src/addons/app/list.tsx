import { Type, type Static } from '@sinclair/typebox';
import type { ComponentFactory } from '../../tokens.js';
import type { Injector } from '@context-ai/core';
import * as jsx from '@context-ai/ctp';
import { Context, Text, Data, Group, Tool } from '@context-ai/ctp';
import { ACTION_EXECUTER, APPLICATIONS } from '../../tokens.js';
import { LOOP_REQUEST_TOKEN } from '../../actions/loop.action.js';

export const ListPropsSchema = Type.Object({
    keywords: Type.Optional(Type.String({ description: 'Search keywords to filter the application list' }))
});

export type ListProps = Static<typeof ListPropsSchema>;

export const ListFactory: ComponentFactory<ListProps> = async (props: ListProps, injector: Injector) => {
    const applications = injector.get(APPLICATIONS, []);
    const exector = injector.get(ACTION_EXECUTER)

    const filteredApps = props.keywords
        ? applications.filter(app =>
            app.name.includes(props.keywords!) ||
            app.description.includes(props.keywords!)
        )
        : applications;

    return (
        <Context
            name="Application Manager"
            description="Manage installed applications"
        >
            <Group title="Role Definition">
                <Text>You are an application management assistant.</Text>
                <Text>Help users view and manage installed applications in the system.</Text>
                <Text>When users ask about applications, use the available tools to gather information.</Text>
                <Text>IMPORTANT: After using tools, you MUST provide a clear, helpful response to the user based on the tool results. Do not just call tools silently - explain what you found.</Text>
            </Group>

            <Group title="Installed Applications">
                <Data
                    source={filteredApps}
                    format="table"
                    fields={['name', 'description', 'version', 'pages']}
                    title="Application List"
                />
            </Group>

            {props.keywords && (
                <Group title="Search Results">
                    <Text>Keywords: {props.keywords}</Text>
                    <Text>Found {filteredApps.length} matching applications</Text>
                </Group>
            )}

            <Tool
                name='lookAppDetail'
                label='查看应用详情'
                description='Look up application details'
                parameters={Type.Object({
                    appName: Type.String({ description: 'The name of the application to look up' }),
                    prompt: Type.String({ description: 'The user\'s specific question or intent about this application' })
                })}
                execute={async (_toolCallId, params) => {
                    const app = applications.find(a => a.name === params.appName);
                    if (!app) {
                        return {
                            content: [{ type: 'text', text: `Application not found: ${params.appName}` }],
                            details: null
                        };
                    }
                    const res = await exector.execute(LOOP_REQUEST_TOKEN, { path: `apps://detail/${params.appName}`, prompt: params.prompt }, injector)
                    if (res.success) {
                        return { content: [{ type: 'text', text: res.output }], details: null }
                    }
                    return {
                        content: [{
                            type: 'text', text: JSON.stringify(res.error, null, 2)
                        }],
                        details: null
                    };
                }}
            />
        </Context>
    );
};