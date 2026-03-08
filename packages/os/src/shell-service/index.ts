import { spawn } from "node:child_process";
import type { PolicyEngine } from "../kernel/policy-engine.js";
import { createOSServiceClass } from "../os-service-class.js";
import { SHELL_ENV_LIST, SHELL_ENV_SET, SHELL_ENV_UNSET, SHELL_EXECUTE } from "../tokens.js";
import type { OSContext, OSService } from "../types/os.js";
import { ShellAuditLog } from "./audit.js";
import { ShellPolicyGuard, type ExecutionProfile } from "./policy.js";
import { ShellSessionStore } from "./session.js";

export interface ShellExecuteRequest {
	command: string;
	timeoutMs?: number;
	profile?: ExecutionProfile;
}

export interface ShellEnvSetRequest {
	key: string;
	value: string;
}

export interface ShellEnvUnsetRequest {
	key: string;
}

export interface ShellEnvListRequest {
	readonly _: "list";
}

export interface ShellExecutionResult {
	stdout: string;
	stderr: string;
	exitCode: number;
}

type Executor = (request: ShellExecuteRequest, context: OSContext, env: NodeJS.ProcessEnv) => Promise<ShellExecutionResult>;

async function defaultExecutor(request: ShellExecuteRequest, context: OSContext, env: NodeJS.ProcessEnv): Promise<ShellExecutionResult> {
	return new Promise((resolve, reject) => {
		const child = spawn(process.platform === "win32" ? "powershell.exe" : "bash", [process.platform === "win32" ? "-Command" : "-lc", request.command], {
			cwd: context.workingDirectory,
			env: { ...process.env, ...env },
			stdio: ["ignore", "pipe", "pipe"],
		});
		const stdoutChunks: Buffer[] = [];
		const stderrChunks: Buffer[] = [];
		let timeoutHandle: NodeJS.Timeout | undefined;
		if (request.timeoutMs && request.timeoutMs > 0) {
			timeoutHandle = setTimeout(() => {
				child.kill();
			}, request.timeoutMs);
		}
		child.stdout.on("data", (chunk: Buffer) => stdoutChunks.push(chunk));
		child.stderr.on("data", (chunk: Buffer) => stderrChunks.push(chunk));
		child.on("error", (error) => {
			if (timeoutHandle) clearTimeout(timeoutHandle);
			reject(error);
		});
		child.on("close", (code) => {
			if (timeoutHandle) clearTimeout(timeoutHandle);
			resolve({
				stdout: Buffer.concat(stdoutChunks).toString("utf8"),
				stderr: Buffer.concat(stderrChunks).toString("utf8"),
				exitCode: code ?? -1,
			});
		});
	});
}

export class ShellService {
	readonly guard: ShellPolicyGuard;
	readonly sessions = new ShellSessionStore();
	readonly audit = new ShellAuditLog();
	private readonly executor: Executor;

	constructor(policy: PolicyEngine, executor?: Executor) {
		this.guard = new ShellPolicyGuard(policy);
		this.executor = executor ?? defaultExecutor;
	}

	async execute(request: ShellExecuteRequest, context: OSContext): Promise<ShellExecutionResult> {
		this.guard.assertCommandAllowed(request.command, context, request.profile);
		const started = Date.now();
		const env = this.sessions.get(context.sessionId);
		const result = await this.executor(request, context, env);
		this.audit.record({
			command: request.command,
			exitCode: result.exitCode,
			durationMs: Date.now() - started,
			sessionId: context.sessionId,
		});
		return result;
	}
}

export const ShellExecuteOSService = createOSServiceClass(SHELL_EXECUTE, {
	requiredPermissions: ["shell:exec"],
	execute: ([shellService]: [ShellService], req, ctx) => shellService.execute(req, ctx),
});

export function createShellExecuteService(shellService: ShellService): OSService<ShellExecuteRequest, ShellExecutionResult> {
	return new ShellExecuteOSService(shellService);
}

export const ShellEnvSetOSService = createOSServiceClass(SHELL_ENV_SET, {
	requiredPermissions: ["shell:exec"],
	execute: ([shellService]: [ShellService], req, ctx) => {
		shellService.sessions.setVar(ctx.sessionId, req.key, req.value);
		return { ok: true as const };
	},
});

export function createShellEnvSetService(shellService: ShellService): OSService<ShellEnvSetRequest, { ok: true }> {
	return new ShellEnvSetOSService(shellService);
}

export const ShellEnvUnsetOSService = createOSServiceClass(SHELL_ENV_UNSET, {
	requiredPermissions: ["shell:exec"],
	execute: ([shellService]: [ShellService], req, ctx) => {
		shellService.sessions.unsetVar(ctx.sessionId, req.key);
		return { ok: true as const };
	},
});

export function createShellEnvUnsetService(shellService: ShellService): OSService<ShellEnvUnsetRequest, { ok: true }> {
	return new ShellEnvUnsetOSService(shellService);
}

export const ShellEnvListOSService = createOSServiceClass(SHELL_ENV_LIST, {
	requiredPermissions: ["shell:exec"],
	execute: ([shellService]: [ShellService], _req, ctx) => ({
		env: shellService.sessions.get(ctx.sessionId),
	}),
});

export function createShellEnvListService(shellService: ShellService): OSService<ShellEnvListRequest, { env: NodeJS.ProcessEnv }> {
	return new ShellEnvListOSService(shellService);
}
