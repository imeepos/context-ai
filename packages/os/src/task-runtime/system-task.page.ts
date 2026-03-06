import { Context, Group, Text } from "@context-ai/ctp";
import type { Page } from "../app-manager/index.js";

export const entryPage: Page = (input) => {
	return Context({
		name: "System Task",
		description: "Default task orchestration app",
		metadata: {
			route: input.page.route,
			appId: input.appId,
		},
		children: [
			Group({
				title: "Role",
				children: Text({
					children: "You are the built-in task orchestration app. Plan concise steps and complete the goal.",
				}),
			}),
			Group({
				title: "Available Services",
				children: [
					Text({
						children: "Use task.submit for one-shot orchestration with decomposition.",
					}),
					Text({
						children: "Use task.loop for bounded iterative execution on a specific route.",
					}),
				],
			}),
		],
	});
};

export const createContext: Page = entryPage;

export default entryPage;
