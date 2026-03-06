import { access } from "node:fs/promises";
import { constants } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import * as osExports from "./index.js";

async function exists(path: string): Promise<boolean> {
	try {
		await access(path, constants.F_OK);
		return true;
	} catch {
		return false;
	}
}

describe("legacy module removal", () => {
	it("keeps source tree free of deprecated modules", async () => {
		const root = process.cwd();
		const hasBash = await exists(join(root, "src", "bash"));
		const hasFileManager = await exists(join(root, "src", "file-manager"));
		const hasLegacyConfig = await exists(join(root, "src", "config.ts"));
		const hasLegacySettings = await exists(join(root, "src", "core", "settings-manager.ts"));
		const hasLegacyShellUtils = await exists(join(root, "src", "utils", "shell.ts"));
		const hasLegacyToolsUtils = await exists(join(root, "src", "utils", "tools-manager.ts"));
		expect(hasBash).toBe(false);
		expect(hasFileManager).toBe(false);
		expect(hasLegacyConfig).toBe(false);
		expect(hasLegacySettings).toBe(false);
		expect(hasLegacyShellUtils).toBe(false);
		expect(hasLegacyToolsUtils).toBe(false);
	});

	it("does not expose legacy exports from package entry", () => {
		expect("bash" in osExports).toBe(false);
		expect("fileManager" in osExports).toBe(false);
	});
});
