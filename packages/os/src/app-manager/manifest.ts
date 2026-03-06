import { OSError } from "../kernel/errors.js";

export interface AppManifest {
	id: string;
	name: string;
	version: string;
	entry: string;
	permissions: string[];
}

export function validateManifest(manifest: AppManifest): void {
	if (!manifest.id.trim()) throw new OSError("E_SERVICE_EXECUTION", "Manifest id is required");
	if (!manifest.name.trim()) throw new OSError("E_SERVICE_EXECUTION", "Manifest name is required");
	if (!manifest.version.trim()) throw new OSError("E_SERVICE_EXECUTION", "Manifest version is required");
	if (!manifest.entry.trim()) throw new OSError("E_SERVICE_EXECUTION", "Manifest entry is required");
}
