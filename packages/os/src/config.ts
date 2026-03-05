import { existsSync, readFileSync } from "fs";
import { homedir } from "os";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function getPackageDir(): string {
	let dir = __dirname;
	while (dir !== dirname(dir)) {
		if (existsSync(join(dir, "package.json"))) {
			return dir;
		}
		dir = dirname(dir);
	}
	return __dirname;
}

function readPackageConfig(): { name: string; configDir: string } {
	try {
		const pkgPath = join(getPackageDir(), "package.json");
		const pkg = JSON.parse(readFileSync(pkgPath, "utf-8")) as {
			piConfig?: { name?: string; configDir?: string };
		};
		return {
			name: pkg.piConfig?.name || "pi",
			configDir: pkg.piConfig?.configDir || ".pi",
		};
	} catch {
		return { name: "pi", configDir: ".pi" };
	}
}

const packageConfig = readPackageConfig();

export const APP_NAME = packageConfig.name;
export const CONFIG_DIR_NAME = packageConfig.configDir;

const ENV_AGENT_DIR = `${APP_NAME.toUpperCase()}_CODING_AGENT_DIR`;

export function getAgentDir(): string {
	const envDir = process.env[ENV_AGENT_DIR];
	if (envDir) {
		if (envDir === "~") return homedir();
		if (envDir.startsWith("~/")) return homedir() + envDir.slice(1);
		return envDir;
	}
	return join(homedir(), CONFIG_DIR_NAME, "agent");
}

export function getSettingsPath(): string {
	return join(getAgentDir(), "settings.json");
}

export function getBinDir(): string {
	return join(getAgentDir(), "bin");
}
