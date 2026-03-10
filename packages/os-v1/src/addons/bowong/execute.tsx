import { Type, type Static } from "@sinclair/typebox";
import type { Injector } from "@context-ai/core";
import * as jsx from "@context-ai/ctp";
import { Context, Group, Text, Tool } from "@context-ai/ctp";
import type { ComponentFactory } from "../../tokens.js";
import { ACTION_EXECUTER } from "../../tokens.js";
import { BOWONG_MODEL_AUTO_RUN_TOKEN } from "../../actions/bowong/modelAutoRun.action.js";
import { BOWONG_MODEL_DETAIL_TOKEN } from "../../actions/bowong/modelDetail.action.js";
import { BOWONG_MODEL_LIST_TOKEN } from "../../actions/bowong/modelList.action.js";

export const ExecutePropsSchema = Type.Object({
	preferredCapability: Type.Optional(Type.Union([
		Type.Literal("text"),
		Type.Literal("image"),
		Type.Literal("video"),
	], { description: "默认偏好能力" })),
});

export type ExecuteProps = Static<typeof ExecutePropsSchema>;

export const ExecuteFactory: ComponentFactory<ExecuteProps> = async (props: ExecuteProps, injector: Injector) => {
	const actionExecuter = injector.get(ACTION_EXECUTER);

	return (
		<Context name="Bowong Model Executor" description="根据任务场景自动选模并执行">
			<Group title="Role Definition">
				<Text>你是模型调用编排助手。</Text>
				<Text>先分析任务场景，再选择最合适的 Bowong 模型，补齐必要参数并执行。</Text>
				<Text>若用户指定模型名，先查询模型工具详情确认参数后再调用。</Text>
				<Text>执行后必须返回：模型名称、选择原因、关键参数、结果摘要。</Text>
			</Group>

			<Group title="Execution Guide">
				<Text>文本任务: 优先 text 模型，默认参数使用 input/instructions。</Text>
				<Text>图像任务: 优先 image 模型，默认参数使用 prompt。</Text>
				<Text>视频任务: 优先 video 模型，默认参数使用 prompt。</Text>
				<Text>默认能力偏好: {props.preferredCapability ?? "text"}</Text>
			</Group>

			<Tool
				name="listModels"
				label="列出模型"
				description="列出可用模型，供当前任务选型。"
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
				label="模型详情"
				description="根据模型名称获取模型调用工具详情（含参数 schema）。"
				parameters={Type.Object({
					modelName: Type.String(),
				})}
				execute={async (_toolCallId, params) => {
					const result = await actionExecuter.execute(BOWONG_MODEL_DETAIL_TOKEN, params, injector);
					return {
						content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
						details: result,
					};
				}}
			/>

			<Tool
				name="runTaskWithBestModel"
				label="任务选模执行"
				description="根据任务场景自动选模或按模型名执行，返回模型结果。"
				parameters={Type.Object({
					task: Type.String({ description: "任务描述" }),
					modelName: Type.Optional(Type.String({ description: "可选，指定模型名或 ID" })),
					preferredCapability: Type.Optional(Type.Union([Type.Literal("text"), Type.Literal("image"), Type.Literal("video")])),
					parameters: Type.Optional(Type.Object({}, { additionalProperties: true })),
				})}
				execute={async (_toolCallId, params) => {
					const result = await actionExecuter.execute(
						BOWONG_MODEL_AUTO_RUN_TOKEN,
						{
							task: params.task,
							modelName: params.modelName,
							preferredCapability: params.preferredCapability ?? props.preferredCapability,
							parameters: params.parameters,
						},
						injector,
					);
					return {
						content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
						details: result,
					};
				}}
			/>
		</Context>
	);
};
