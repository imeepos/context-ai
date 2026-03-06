import { OSError } from "../kernel/errors.js";

export interface AppManifest {
	id: string;
	name: string;
	version: string;
	entry: string;
	permissions: string[];
}

export function validateManifest(manifest: AppManifest): void {
	if (!manifest.id.trim()) throw new OSError("E_VALIDATION_FAILED", "Manifest id is required");
	if (!manifest.name.trim()) throw new OSError("E_VALIDATION_FAILED", "Manifest name is required");
	if (!manifest.version.trim()) throw new OSError("E_VALIDATION_FAILED", "Manifest version is required");
	if (!manifest.entry.trim()) throw new OSError("E_VALIDATION_FAILED", "Manifest entry is required");
}
