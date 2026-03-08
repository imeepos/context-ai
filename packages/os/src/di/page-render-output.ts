import type { AppPageEntry } from "../app-manager/manifest.js";

interface RenderedTool {
	name: string;
	description?: string;
	parameters?: unknown;
}

interface RenderedDataView {
	title?: string;
	format: string;
	fields?: string[];
}

interface RenderedPageOutput {
	prompt: string;
	tools?: RenderedTool[];
	dataViews?: RenderedDataView[];
	metadata?: Record<string, unknown>;
}

export function toAppPageRenderResult(page: AppPageEntry, rendered: RenderedPageOutput) {
	return {
		prompt: rendered.prompt,
		tools: (rendered.tools ?? []).map((tool) => ({
			name: tool.name,
			description: tool.description,
			parameters: tool.parameters,
		})),
		dataViews: (rendered.dataViews ?? []).map((dataView) => ({
			title: dataView.title ?? "Untitled",
			format: dataView.format,
			fields: dataView.fields,
		})),
		metadata: {
			route: page.route,
			path: page.path,
			...Object.fromEntries(
				Object.entries(rendered.metadata ?? {}).map(([key, value]) => [key, String(value)]),
			),
		},
	};
}
