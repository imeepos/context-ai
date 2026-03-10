import type { Provider } from "@context-ai/core";
import type { Action } from "../../../tokens.js";
import { ACTIONS } from "../../../tokens.js";

export {
	NOVEL_LIST_TOKEN,
	novelListAction,
	NovelListRequestSchema,
	NovelListResponseSchema,
} from "./list.action.js";
export {
	NOVEL_DETAIL_GET_TOKEN,
	novelDetailGetAction,
	NovelDetailRequestSchema,
	NovelDetailResponseSchema,
} from "./detailGet.action.js";
export {
	NOVEL_CREATE_TOKEN,
	novelCreateAction,
	NovelCreateRequestSchema,
} from "./create.action.js";
export {
	NOVEL_DELETE_TOKEN,
	novelDeleteAction,
	NovelDeleteRequestSchema,
} from "./delete.action.js";
export {
	NOVEL_READ_CHAPTER_TOKEN,
	novelReadChapterAction,
	NovelReadChapterRequestSchema,
} from "./readChapter.action.js";
export {
	NOVEL_READ_RECENT_CHAPTERS_TOKEN,
	novelReadRecentChaptersAction,
	NovelReadRecentChaptersRequestSchema,
} from "./readRecentChapters.action.js";
export {
	NOVEL_ADD_CHAPTER_TOKEN,
	novelAddChapterAction,
	NovelAddChapterRequestSchema,
} from "./addChapter.action.js";
export {
	NOVEL_CONTINUE_WRITING_TOKEN,
	novelContinueWritingAction,
	NovelContinueWritingRequestSchema,
} from "./continueWriting.action.js";
export {
	NOVEL_REWRITE_CHAPTER_TOKEN,
	novelRewriteChapterAction,
	NovelRewriteChapterRequestSchema,
} from "./rewriteChapter.action.js";
export {
	NOVEL_CHAPTER_QUALITY_PASS_TOKEN,
	novelChapterQualityPassAction,
	NovelChapterQualityPassRequestSchema,
} from "./qualityPass.action.js";
export {
	NOVEL_LOOP_WRITE_TOKEN,
	novelLoopWriteAction,
	NovelLoopWriteRequestSchema,
} from "./loopWrite.action.js";
export {
	NOVEL_AUTO_PROGRESS_TOKEN,
	novelAutoProgressAction,
	NovelAutoProgressRequestSchema,
} from "./autoProgress.action.js";
export {
	NOVEL_UPDATE_META_TOKEN,
	novelUpdateMetaAction,
	NovelUpdateMetaRequestSchema,
} from "./updateMeta.action.js";
export {
	NOVEL_LIST_LOGS_TOKEN,
	novelListLogsAction,
	NovelListLogsRequestSchema,
} from "./listLogs.action.js";

import { novelListAction } from "./list.action.js";
import { novelDetailGetAction } from "./detailGet.action.js";
import { novelCreateAction } from "./create.action.js";
import { novelDeleteAction } from "./delete.action.js";
import { novelReadChapterAction } from "./readChapter.action.js";
import { novelReadRecentChaptersAction } from "./readRecentChapters.action.js";
import { novelAddChapterAction } from "./addChapter.action.js";
import { novelContinueWritingAction } from "./continueWriting.action.js";
import { novelRewriteChapterAction } from "./rewriteChapter.action.js";
import { novelChapterQualityPassAction } from "./qualityPass.action.js";
import { novelLoopWriteAction } from "./loopWrite.action.js";
import { novelAutoProgressAction } from "./autoProgress.action.js";
import { novelUpdateMetaAction } from "./updateMeta.action.js";
import { novelListLogsAction } from "./listLogs.action.js";

export const novelActions: Array<Action<any, any>> = [
	novelListAction,
	novelDetailGetAction,
	novelCreateAction,
	novelDeleteAction,
	novelReadChapterAction,
	novelReadRecentChaptersAction,
	novelAddChapterAction,
	novelContinueWritingAction,
	novelRewriteChapterAction,
	novelChapterQualityPassAction,
	novelLoopWriteAction,
	novelAutoProgressAction,
	novelUpdateMetaAction,
	novelListLogsAction,
];

export const novelActionProviders: Provider[] = novelActions.flatMap((action) => ([
	{ provide: ACTIONS, useValue: action, multi: true },
	{ provide: action.type, useValue: action },
]));
