export interface AppManifest {
	id: string;
	name: string;
	version: string;
	entry: string;
	permissions: string[];
}

export function validateManifest(manifest: AppManifest): void {
	if (!manifest.id.trim()) throw new Error("Manifest id is required");
	if (!manifest.name.trim()) throw new Error("Manifest name is required");
	if (!manifest.version.trim()) throw new Error("Manifest version is required");
	if (!manifest.entry.trim()) throw new Error("Manifest entry is required");
}
