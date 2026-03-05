import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, describe, expect, it } from "vitest";
import { PolicyEngine } from "../kernel/policy-engine.js";
import type { OSContext } from "../types/os.js";
import { FileService } from "./index.js";

const tempDirs: string[] = [];

afterEach(async () => {
	await Promise.all(tempDirs.map((path) => rm(path, { recursive: true, force: true })));
	tempDirs.length = 0;
});

describe("FileService", () => {
	it("writes and reads file with path guard", async () => {
		const root = await mkdtemp(join(tmpdir(), "os-file-test-"));
		tempDirs.push(root);
		const policy = new PolicyEngine({ pathRule: { allow: [root], deny: [] } });
		const service = new FileService(policy);
		const ctx: OSContext = {
			appId: "app.file",
			sessionId: "s1",
			permissions: ["file:read", "file:write"],
			workingDirectory: root,
		};
		const filePath = join(root, "a.txt");

		await service.write({ path: filePath, content: "hello" }, ctx);
		await expect(service.read({ path: filePath }, ctx)).resolves.toBe("hello");
	});

	it("captures snapshot and rolls back", async () => {
		const root = await mkdtemp(join(tmpdir(), "os-file-snap-"));
		tempDirs.push(root);
		const filePath = join(root, "note.txt");
		await writeFile(filePath, "v1", "utf8");
		const policy = new PolicyEngine({ pathRule: { allow: [root], deny: [] } });
		const service = new FileService(policy);
		const ctx: OSContext = {
			appId: "app.file",
			sessionId: "s1",
			permissions: [],
			workingDirectory: root,
		};

		await service.snapshot({ snapshotId: "snap-1", path: filePath }, ctx);
		await service.write({ path: filePath, content: "v2" }, ctx);
		await service.rollback("snap-1");

		await expect(readFile(filePath, "utf8")).resolves.toBe("v1");
	});

	it("supports list find grep edit", async () => {
		const root = await mkdtemp(join(tmpdir(), "os-file-ops-"));
		tempDirs.push(root);
		const sub = join(root, "sub");
		await writeFile(join(root, "a.log"), "line1\nhello world\nline3", "utf8");
		await writeFile(join(root, "sub.txt"), "sub", "utf8");
		await writeFile(sub, "", "utf8");
		const policy = new PolicyEngine({ pathRule: { allow: [root], deny: [] } });
		const service = new FileService(policy);
		const ctx: OSContext = {
			appId: "app.file",
			sessionId: "s2",
			permissions: [],
			workingDirectory: root,
		};

		const entries = await service.list({ path: root }, ctx);
		expect(entries).toContain("a.log");
		expect(entries).toContain("sub.txt");

		const found = await service.find({ path: root, nameContains: ".log" }, ctx);
		expect(found.some((p) => p.endsWith("a.log"))).toBe(true);

		const matches = await service.grep({ path: join(root, "a.log"), pattern: "hello" }, ctx);
		expect(matches).toHaveLength(1);
		expect(matches[0]?.line).toBe(2);

		const edit = await service.edit(
			{ path: join(root, "a.log"), search: "hello world", replace: "hello ctp" },
			ctx,
		);
		expect(edit.changed).toBe(true);
		await expect(readFile(join(root, "a.log"), "utf8")).resolves.toContain("hello ctp");
	});
});
