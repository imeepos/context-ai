import { describe, expect, it } from "vitest";
import { PolicyEngine } from "../kernel/policy-engine.js";
import type { OSContext } from "../types/os.js";
import { ShellService } from "./index.js";

const context: OSContext = {
	appId: "app.shell",
	sessionId: "session-shell",
	permissions: ["shell:exec"],
	workingDirectory: process.cwd(),
};

describe("ShellService", () => {
	it("denies dangerous command by policy", async () => {
		const service = new ShellService(new PolicyEngine());
		await expect(service.execute({ command: "rm -rf /" }, context)).rejects.toMatchObject({
			code: "E_POLICY_DENIED",
		});
	});

	it("executes command through injected executor", async () => {
		const service = new ShellService(
			new PolicyEngine(),
			async () => ({ stdout: "ok", stderr: "", exitCode: 0 }),
		);
		const result = await service.execute({ command: "echo ok" }, context);
		expect(result.stdout).toBe("ok");
		expect(service.audit.list()).toHaveLength(1);
	});

	it("blocks write command in read-only profile", async () => {
		const service = new ShellService(
			new PolicyEngine(),
			async () => ({ stdout: "ok", stderr: "", exitCode: 0 }),
		);
		await expect(
			service.execute({ command: "rm test.txt", profile: "read-only" }, context),
		).rejects.toThrow("read-only profile");
	});

	it("uses session env in executor", async () => {
		const captured: NodeJS.ProcessEnv[] = [];
		const service = new ShellService(
			new PolicyEngine(),
			async (_request, _context, env) => {
				captured.push(env);
				return { stdout: "ok", stderr: "", exitCode: 0 };
			},
		);
		service.sessions.setVar(context.sessionId, "DEMO_ENV", "1");
		await service.execute({ command: "echo ok" }, context);
		expect(captured[0]?.DEMO_ENV).toBe("1");
	});
});
