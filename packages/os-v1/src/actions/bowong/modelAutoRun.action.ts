import { Type, type Static } from "@sinclair/typebox";
import type { Injector } from "@context-ai/core";
import { ACTION_EXECUTER, ACTIONS, type Action, type Token } from "../../tokens.js";
import { buildBowongModelCatalog, findBowongModelByName, recommendBowongModel, type BowongModelCapability } from "./model-catalog.js";

const AnyObjectSchema = Type.Object({}, { additionalProperties: true });

export const BowongModelAutoRunRequestSchema = Type.Object({
	task: Type.String({ minLength: 1, description: "任务描述，包含场景目标与预期结果" }),
	modelName: Type.Optional(Type.String({ description: "指定模型名称或 ID；不传时自动选择" })),
	preferredCapability: Type.Optional(Type.Union([
		Type.Literal("text"),
		Type.Literal("image"),
		Type.Literal("video"),
	], { description: "偏好能力类型" })),
	parameters: Type.Optional(AnyObjectSchema),
}, { additionalProperties: false });

export type BowongModelAutoRunRequest = Static<typeof BowongModelAutoRunRequestSchema>;

export const BowongModelAutoRunResponseSchema = Type.Object({
	selectedModel: Type.Object({
		name: Type.String(),
		id: Type.String(),
		token: Type.String(),
		capabilities: Type.Array(Type.String()),
	}),
	resolvedParameters: AnyObjectSchema,
	result: Type.Unknown(),
});

export type BowongModelAutoRunResponse = Static<typeof BowongModelAutoRunResponseSchema>;

export const BOWONG_MODEL_AUTO_RUN_TOKEN: Token<typeof BowongModelAutoRunRequestSchema, typeof BowongModelAutoRunResponseSchema> =
	"bowong.model.auto.run";

function buildDefaultParameters(
	task: string,
	capabilities: readonly string[],
	parameters?: Record<string, unknown>,
): Record<string, unknown> {
	const next: Record<string, unknown> = { ...(parameters ?? {}) };

	if (capabilities.includes("video")) {
		if (!("prompt" in next)) {
			next.prompt = task;
		}
		return next;
	}

	if (capabilities.includes("image")) {
		if (!("prompt" in next)) {
			next.prompt = task;
		}
		return next;
	}

	if (!("input" in next) && !("messages" in next) && !("prompt" in next)) {
		next.input = task;
	}
	if (!("instructions" in next)) {
		next.instructions = "根据任务要求直接生成结果，必要时给出简短结构化输出。";
	}
	return next;
}

export const bowongModelAutoRunAction: Action<typeof BowongModelAutoRunRequestSchema, typeof BowongModelAutoRunResponseSchema> = {
	type: BOWONG_MODEL_AUTO_RUN_TOKEN,
	description: "Auto-select and execute Bowong model based on task and scenario",
	request: BowongModelAutoRunRequestSchema,
	response: BowongModelAutoRunResponseSchema,
	requiredPermissions: ["bowong:model:query", "bowong:model:invoke"],
	dependencies: [],
	execute: async (params: BowongModelAutoRunRequest, injector: Injector): Promise<BowongModelAutoRunResponse> => {
		const actions = injector.get<Action<any, any>[]>(ACTIONS, []);
		const catalog = buildBowongModelCatalog(actions);
		if (catalog.length === 0) {
			throw new Error("No Bowong model tools available.");
		}

		const preferred = params.preferredCapability as BowongModelCapability | undefined;
		const selected = params.modelName
			? findBowongModelByName(catalog, params.modelName)
			: recommendBowongModel(catalog, params.task, preferred);

		if (!selected) {
			throw new Error(params.modelName ? `Model not found: ${params.modelName}` : "Failed to select a model.");
		}

		const actionExecuter = injector.get(ACTION_EXECUTER);
		const resolvedParameters = buildDefaultParameters(
			params.task,
			selected.capabilities,
			params.parameters as Record<string, unknown> | undefined,
		);

		const result = await actionExecuter.execute(
			selected.token as Token<any, any>,
			resolvedParameters,
			injector,
		);

		return {
			selectedModel: {
				name: selected.name,
				id: selected.id,
				token: selected.token,
				capabilities: selected.capabilities,
			},
			resolvedParameters,
			result,
		};
	},
};
