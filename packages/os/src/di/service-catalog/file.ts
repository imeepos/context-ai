import {
	FileEditOSService,
	FileFindOSService,
	FileGrepOSService,
	FileListOSService,
	FileReadOSService,
	FileWriteOSService,
} from "../../file-service/index.js";
import {
	FILE_EDIT,
	FILE_FIND,
	FILE_GREP,
	FILE_LIST,
	FILE_READ,
	FILE_WRITE,
} from "../../tokens.js";
import { OS_FILE_SERVICE } from "../tokens.js";
import { defineInjectableOSService } from "./definition.js";

export const FILE_SERVICE_DEFINITIONS = [
	defineInjectableOSService(FILE_READ, FileReadOSService, [OS_FILE_SERVICE] as const),
	defineInjectableOSService(FILE_WRITE, FileWriteOSService, [OS_FILE_SERVICE] as const),
	defineInjectableOSService(FILE_LIST, FileListOSService, [OS_FILE_SERVICE] as const),
	defineInjectableOSService(FILE_FIND, FileFindOSService, [OS_FILE_SERVICE] as const),
	defineInjectableOSService(FILE_GREP, FileGrepOSService, [OS_FILE_SERVICE] as const),
	defineInjectableOSService(FILE_EDIT, FileEditOSService, [OS_FILE_SERVICE] as const),
] as const;
