import type { Application } from "../../tokens.js";
import { ListFactory, ListPropsSchema } from "./list.js";
import { DetailFactory, DetailPropsSchema } from "./detail.js";
import { novelActionProviders } from "./actions/index.js";
import {
	FileNovelStoreService,
	getDefaultNovelStorageRoot,
	NOVEL_STORE_SERVICE,
} from "./store.js";

export default {
	name: "novel",
	description: "Novel writing workspace: list novels, manage detail, read/continue/rewrite chapters, run loop writing, and track change logs.",
	version: "1.0.0",
	pages: [
		{
			name: "novel-list",
			description: "List and manage novels.",
			path: "novel://list",
			props: ListPropsSchema,
			factory: ListFactory,
		},
		{
			name: "novel-detail",
			description: "View a novel's outline/summary/chapters and perform reading/writing operations.",
			path: "novel://detail/:novelId",
			props: DetailPropsSchema,
			factory: DetailFactory,
		},
	],
	providers: [
		{
			provide: NOVEL_STORE_SERVICE,
			useFactory: () => {
				return new FileNovelStoreService(getDefaultNovelStorageRoot());
			},
			deps: [],
		},
		...novelActionProviders,
	],
} as Application;
