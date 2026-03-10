import type { Action } from "../../tokens.js";

export type BowongModelCapability = "text" | "image" | "video";

export interface BowongModelCatalogItem {
	id: string;
	name: string;
	token: string;
	description: string;
	capabilities: BowongModelCapability[];
	scenarios: string[];
	strengths: string[];
	requestSchema: unknown;
	responseSchema: unknown;
}

function normalizeModelId(id: string): string {
	return id.toLowerCase().trim().replaceAll("_", "-").replaceAll(" ", "-");
}

function titleCase(input: string): string {
	return input
		.replaceAll("/", " ")
		.replaceAll("-", " ")
		.split(" ")
		.filter(Boolean)
		.map((part) => part[0]?.toUpperCase() + part.slice(1))
		.join(" ");
}

function inferCapabilities(modelId: string): BowongModelCapability[] {
	const id = modelId.toLowerCase();
	const caps: BowongModelCapability[] = [];

	const looksVideo =
		id.includes("video") ||
		id.includes("veo") ||
		id.includes("kling") ||
		id.includes("sora") ||
		id.includes("seedance") ||
		id.includes("hailuo");
	if (looksVideo) {
		caps.push("video");
	}

	const looksImage =
		id.includes("image") ||
		id.includes("img") ||
		id.includes("flux") ||
		id.includes("seedream") ||
		id.includes("banana") ||
		id.includes("mj");
	if (looksImage) {
		caps.push("image");
	}

	if (caps.length === 0) {
		caps.push("text");
	}

	return caps;
}

function inferScenarios(capabilities: readonly BowongModelCapability[]): string[] {
	const scenarios: string[] = [];
	if (capabilities.includes("text")) {
		scenarios.push("对话问答", "文本总结", "代码/分析任务");
	}
	if (capabilities.includes("image")) {
		scenarios.push("文生图", "图像风格迁移", "图片编辑");
	}
	if (capabilities.includes("video")) {
		scenarios.push("文生视频", "图生视频", "视频创意生成");
	}
	return scenarios;
}

function inferStrengths(modelId: string, capabilities: readonly BowongModelCapability[]): string[] {
	const id = modelId.toLowerCase();
	const strengths: string[] = [];

	if (id.includes("pro")) {
		strengths.push("质量优先");
	}
	if (id.includes("flash") || id.includes("lite") || id.includes("mini") || id.includes("nano") || id.includes("fast")) {
		strengths.push("速度优先");
	}
	if (id.includes("thinking")) {
		strengths.push("复杂推理");
	}
	if (id.includes("code")) {
		strengths.push("代码任务");
	}
	if (capabilities.includes("image")) {
		strengths.push("视觉生成");
	}
	if (capabilities.includes("video")) {
		strengths.push("视频生成");
	}
	if (strengths.length === 0) {
		strengths.push("通用能力");
	}

	return strengths;
}

function extractModelId(action: Action<any, any>): string {
	const prefix = "Run Bowong model ";
	if (action.description.startsWith(prefix)) {
		return action.description.slice(prefix.length).trim();
	}
	return action.type;
}

export function buildBowongModelCatalog(actions: readonly Action<any, any>[]): BowongModelCatalogItem[] {
	return actions
		.filter((action) => action.description.startsWith("Run Bowong model "))
		.map((action) => {
			const id = extractModelId(action);
			const capabilities = inferCapabilities(id);
			return {
				id,
				name: titleCase(id),
				token: action.type,
				description: action.description,
				capabilities,
				scenarios: inferScenarios(capabilities),
				strengths: inferStrengths(id, capabilities),
				requestSchema: action.request,
				responseSchema: action.response,
			} satisfies BowongModelCatalogItem;
		});
}

export function findBowongModelByName(catalog: readonly BowongModelCatalogItem[], modelName: string): BowongModelCatalogItem | undefined {
	const query = normalizeModelId(modelName);
	return catalog.find((item) => {
		const id = normalizeModelId(item.id);
		const name = normalizeModelId(item.name);
		return id === query || name === query || id.includes(query) || name.includes(query);
	});
}

export function recommendBowongModel(
	catalog: readonly BowongModelCatalogItem[],
	task: string,
	preferredCapability?: BowongModelCapability,
): BowongModelCatalogItem | undefined {
	if (catalog.length === 0) {
		return undefined;
	}

	const taskText = task.toLowerCase();
	const desiredCapability: BowongModelCapability =
		preferredCapability ??
		(taskText.includes("视频") || taskText.includes("video")
			? "video"
			: taskText.includes("图片") || taskText.includes("图像") || taskText.includes("image")
				? "image"
				: "text");

	const ranked = catalog
		.filter((item) => item.capabilities.includes(desiredCapability))
		.sort((a, b) => {
			const score = (item: BowongModelCatalogItem): number => {
				let value = 0;
				const id = item.id.toLowerCase();
				if (desiredCapability === "text" && (id.includes("pro") || id.includes("gpt-5") || id.includes("gemini"))) value += 3;
				if (desiredCapability === "image" && (id.includes("pro") || id.includes("gpt-image") || id.includes("flux"))) value += 3;
				if (desiredCapability === "video" && (id.includes("pro") || id.includes("veo") || id.includes("kling") || id.includes("sora"))) value += 3;
				if (taskText.includes("快") || taskText.includes("快速") || taskText.includes("fast")) {
					if (id.includes("flash") || id.includes("fast") || id.includes("lite") || id.includes("mini")) {
						value += 2;
					}
				}
				return value;
			};
			return score(b) - score(a);
		});

	return ranked[0] ?? catalog[0];
}
