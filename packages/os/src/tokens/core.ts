import type {
    FileEditRequest,
    FileFindRequest,
    FileGrepRequest,
    FileListRequest,
    FileReadRequest,
    FileWriteRequest,
} from "../file-service/index.js";
import type {
    ShellEnvListRequest,
    ShellEnvSetRequest,
    ShellEnvUnsetRequest,
    ShellExecuteRequest,
    ShellExecutionResult,
} from "../shell-service/index.js";
import type { StoreGetRequest, StoreSetRequest, StoreValue } from "../store-service/index.js";
import type { NetRequest, NetResponse } from "../net-service/index.js";
import { token } from "./shared.js";

// File Service Response Types
export interface FileReadResponse {
    content: string;
}

export interface FileWriteResponse {
    ok: true;
}

export interface FileListResponse {
    entries: string[];
}

export interface FileFindResponse {
    paths: string[];
}

export interface FileGrepMatch {
    line: number;
    text: string;
}

export interface FileGrepResponse {
    matches: FileGrepMatch[];
}

export interface FileEditResponse {
    changed: boolean;
}

// Shell Service Response Types
export interface ShellAckResponse {
    ok: true;
}

export interface ShellEnvListResponse {
    env: NodeJS.ProcessEnv;
}

// Store Service Response Types
export interface StoreSetResponse {
    ok: true;
}

export interface StoreGetResponse {
    value: StoreValue | undefined;
}

// File Tokens
export const FILE_READ = token<
    FileReadRequest,
    FileReadResponse,
    "file.read"
>("file.read");

export const FILE_WRITE = token<
    FileWriteRequest,
    FileWriteResponse,
    "file.write"
>("file.write");

export const FILE_LIST = token<
    FileListRequest,
    FileListResponse,
    "file.list"
>("file.list");

export const FILE_FIND = token<
    FileFindRequest,
    FileFindResponse,
    "file.find"
>("file.find");

export const FILE_GREP = token<
    FileGrepRequest,
    FileGrepResponse,
    "file.grep"
>("file.grep");

export const FILE_EDIT = token<
    FileEditRequest,
    FileEditResponse,
    "file.edit"
>("file.edit");

// Shell Tokens
export const SHELL_EXECUTE = token<
    ShellExecuteRequest,
    ShellExecutionResult,
    "shell.execute"
>("shell.execute");

export const SHELL_ENV_SET = token<
    ShellEnvSetRequest,
    ShellAckResponse,
    "shell.env.set"
>("shell.env.set");

export const SHELL_ENV_UNSET = token<
    ShellEnvUnsetRequest,
    ShellAckResponse,
    "shell.env.unset"
>("shell.env.unset");

export const SHELL_ENV_LIST = token<
    ShellEnvListRequest,
    ShellEnvListResponse,
    "shell.env.list"
>("shell.env.list");

// Store Tokens
export const STORE_SET = token<
    StoreSetRequest,
    StoreSetResponse,
    "store.set"
>("store.set");

export const STORE_GET = token<
    StoreGetRequest,
    StoreGetResponse,
    "store.get"
>("store.get");

// Net Tokens
export const NET_REQUEST = token<
    NetRequest,
    NetResponse,
    "net.request"
>("net.request");
