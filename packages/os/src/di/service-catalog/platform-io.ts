import { NetRequestOSService } from "../../net-service/index.js";
import { SecurityRedactOSService } from "../../security-service/index.js";
import {
	ShellEnvListOSService,
	ShellEnvSetOSService,
	ShellEnvUnsetOSService,
	ShellExecuteOSService,
} from "../../shell-service/index.js";
import {
	StoreGetOSService,
	StoreSetOSService,
} from "../../store-service/index.js";
import {
	NET_REQUEST,
	SECURITY_REDACT,
	SHELL_ENV_LIST,
	SHELL_ENV_SET,
	SHELL_ENV_UNSET,
	SHELL_EXECUTE,
	STORE_GET,
	STORE_SET,
} from "../../tokens.js";
import { OS_NET, OS_SECURITY, OS_SHELL_SERVICE, OS_STORE } from "../tokens.js";
import { defineInjectableOSService } from "./definition.js";

export const PLATFORM_IO_SERVICE_DEFINITIONS = [
	defineInjectableOSService(SHELL_EXECUTE, ShellExecuteOSService, [OS_SHELL_SERVICE] as const),
	defineInjectableOSService(SHELL_ENV_SET, ShellEnvSetOSService, [OS_SHELL_SERVICE] as const),
	defineInjectableOSService(SHELL_ENV_UNSET, ShellEnvUnsetOSService, [OS_SHELL_SERVICE] as const),
	defineInjectableOSService(SHELL_ENV_LIST, ShellEnvListOSService, [OS_SHELL_SERVICE] as const),
	defineInjectableOSService(SECURITY_REDACT, SecurityRedactOSService, [OS_SECURITY] as const),
	defineInjectableOSService(STORE_SET, StoreSetOSService, [OS_STORE] as const),
	defineInjectableOSService(STORE_GET, StoreGetOSService, [OS_STORE] as const),
	defineInjectableOSService(NET_REQUEST, NetRequestOSService, [OS_NET] as const),
] as const;
