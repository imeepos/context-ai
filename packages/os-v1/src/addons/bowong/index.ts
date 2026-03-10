import type { Application } from "../../tokens.js";
import { ListFactory, ListPropsSchema } from "./list.js";
import { ExecuteFactory, ExecutePropsSchema } from "./execute.js";

export default {
	name: "bowong",
	description: "Bowong 模型调度应用。支持模型列表检索、模型工具详情查询、按任务场景自动选模并执行。",
	version: "1.0.0",
	pages: [
		{
			name: "bowong-model-list",
			description: "展示 Bowong 所有模型（名称/ID/简介），并可按模型名查询调用工具详情。",
			path: "bowong://list",
			props: ListPropsSchema,
			factory: ListFactory,
		},
		{
			name: "bowong-model-execute",
			description: "根据任务与场景自动选择模型，生成参数并执行模型调用。",
			path: "bowong://execute",
			props: ExecutePropsSchema,
			factory: ExecuteFactory,
		},
	],
	providers: [],
} as Application;
