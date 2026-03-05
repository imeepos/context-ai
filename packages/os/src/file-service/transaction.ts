import { rename, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

export async function atomicWrite(path: string, content: string): Promise<void> {
	const tmpPath = join(dirname(path), `.${Date.now()}-${Math.random().toString(36).slice(2)}.tmp`);
	await writeFile(tmpPath, content, "utf8");
	await rename(tmpPath, path);
}
