import { UI_RENDER } from "../tokens.js";
import type { OSService } from "../types/os.js";

export interface UINode {
	type: string;
	props?: Record<string, string | number | boolean>;
	children?: UINode[];
	text?: string;
}

export interface UIRenderRequest {
	screen: string;
	tree: UINode;
}

export interface UIRenderResult {
	screen: string;
	schemaVersion: "1.0";
	tree: UINode;
}

export class UIService {
	render(request: UIRenderRequest): UIRenderResult {
		return {
			screen: request.screen,
			schemaVersion: "1.0",
			tree: request.tree,
		};
	}
}

export function createUIRenderService(service: UIService): OSService<UIRenderRequest, UIRenderResult> {
	return {
		name: UI_RENDER,
		requiredPermissions: ["ui:render"],
		execute: async (req) => service.render(req),
	};
}
