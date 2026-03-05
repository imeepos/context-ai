import { readFile, writeFile } from "node:fs/promises";

interface SnapshotEntry {
	path: string;
	content: string;
}

export class SnapshotStore {
	private readonly snapshots = new Map<string, SnapshotEntry>();

	async capture(snapshotId: string, path: string): Promise<void> {
		const content = await readFile(path, "utf8");
		this.snapshots.set(snapshotId, { path, content });
	}

	async rollback(snapshotId: string): Promise<void> {
		const snapshot = this.snapshots.get(snapshotId);
		if (!snapshot) throw new Error(`Snapshot not found: ${snapshotId}`);
		await writeFile(snapshot.path, snapshot.content, "utf8");
	}
}
