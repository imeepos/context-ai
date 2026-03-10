import { Type, type Static } from "@sinclair/typebox";
import type { Injector } from "@context-ai/core";
import * as jsx from "@context-ai/ctp";
import { Context, Data, Group, Text, Tool } from "@context-ai/ctp";
import type { ComponentFactory } from "../../tokens.js";
import { ACTION_EXECUTER } from "../../tokens.js";
import { BOWONG_MODEL_DETAIL_TOKEN } from "../../actions/bowong/modelDetail.action.js";
import { BOWONG_MODEL_LIST_TOKEN } from "../../actions/bowong/modelList.action.js";

export const ListPropsSchema = Type.Object({
	keywords: Type.Optional(Type.String({ description: "关键词过滤模型" })),
	capability: Type.Optional(Type.Union([
		Type.Literal("text"),
		Type.Literal("image"),
		Type.Literal("video"),
	], { description: "按能力过滤" })),
});

export type ListProps = Static<typeof ListPropsSchema>;

export const ListFactory: ComponentFactory<ListProps> = async (props: ListProps, injector: Injector) => {
	const actionExecuter = injector.get(ACTION_EXECUTER);
	const list = await actionExecuter.execute(
		BOWONG_MODEL_LIST_TOKEN,
		{
			keywords: props.keywords,
			capability: props.capability,
		},
		injector,
	);

	const rows = list.data.map((item) => ({
		name: item.name,
		id: item.id,
		capabilities: item.capabilities.join(", "),
		scenarios: item.scenarios.join(" / "),
		strengths: item.strengths.join(", "),
	}));

	return (
		<Context name="Bowong Model Center" description="浏览 Bowong 模型，并获取可调用工具详情">
			<Group title="Role Definition">
				<Text>你是模型选型助手。</Text>
				<Text>先理解任务场景，再选择合适模型；必要时先查看模型工具详情，再执行调用。</Text>
				<Text>工具执行后必须向用户总结模型选择理由、关键参数和执行结果。</Text>
			</Group>

			<Group title="Model List">
				<Text>共 {list.total} 个模型</Text>
				<Data
					source={rows}
					format="table"
					fields={["name", "id", "capabilities", "scenarios", "strengths"]}
					title="Bowong Models"
				/>
			</Group>

			<Tool
				name="listModels"
				label="列出模型"
				description="按关键词或能力筛选 Bowong 模型。"
				parameters={Type.Object({
					keywords: Type.Optional(Type.String()),
					capability: Type.Optional(Type.Union([Type.Literal("text"), Type.Literal("image"), Type.Literal("video")])),
				})}
				execute={async (_toolCallId, params) => {
					const result = await actionExecuter.execute(BOWONG_MODEL_LIST_TOKEN, params, injector);
					return {
						content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
						details: result,
					};
				}}
			/>

			<Tool
				name="getModelDetail"
				label="模型工具详情"
				description="根据模型名称或 ID 获取调用工具详情（token、参数 schema、能力信息）。"
				parameters={Type.Object({
					modelName: Type.String({ description: "模型名称或 ID" }),
				})}
				execute={async (_toolCallId, params) => {
					const result = await actionExecuter.execute(BOWONG_MODEL_DETAIL_TOKEN, params, injector);
					return {
						content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
						details: result,
					};
				}}
			/>
		</Context>
	);
};
