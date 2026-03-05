import { existsSync, readFileSync } from "fs";
import { join } from "path";
import { CONFIG_DIR_NAME, getAgentDir } from "../config.js";

interface Settings {
	shellPath?: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null;
}

function parseSettingsFile(path: string): Settings {
	if (!existsSync(path)) {
		return {};
	}

	try {
		const raw = readFileSync(path, "utf-8");
		const parsed = JSON.parse(raw) as unknown;
		if (!isRecord(parsed)) {
			return {};
		}
		return {
			shellPath: typeof parsed.shellPath === "string" ? parsed.shellPath : undefined,
		};
	} catch {
		return {};
	}
}

export class SettingsManager {
	private readonly settings: Settings;

	private constructor(settings: Settings) {
		this.settings = settings;
	}

	static create(cwd: string = process.cwd(), agentDir: string = getAgentDir()): SettingsManager {
		const globalSettingsPath = join(agentDir, "settings.json");
		const projectSettingsPath = join(cwd, CONFIG_DIR_NAME, "settings.json");
		const globalSettings = parseSettingsFile(globalSettingsPath);
		const projectSettings = parseSettingsFile(projectSettingsPath);
		return new SettingsManager({ ...globalSettings, ...projectSettings });
	}

	getShellPath(): string | undefined {
		return this.settings.shellPath;
	}
}
