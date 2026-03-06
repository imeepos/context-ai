import { OSError } from "../kernel/errors.js";

export interface AppPageEntry {
	id: string;
	route: string;
	name: string;
	description: string;
	path: string;
	tags?: string[];
	default?: boolean;
}

export interface AppEntryV1 {
	pages: AppPageEntry[];
}

export interface AppManifestV1 {
	id: string;
	name: string;
	version: string;
	entry: AppEntryV1;
	permissions: string[];
	metadata?: Record<string, string>;
	signing?: { keyId: string; signature: string };
}

export interface LegacyAppManifest {
	id: string;
	name: string;
	version: string;
	entry: string;
	permissions: string[];
}

export type AppManifest = AppManifestV1 | LegacyAppManifest;

const routePattern = /^([a-zA-Z0-9._-]+):\/\/([a-zA-Z0-9._-]+)$/;

export function normalizeManifest(manifest: AppManifest): AppManifestV1 {
	if (typeof manifest.entry !== "string") {
		return manifest as AppManifestV1;
	}
	const defaultPageId = "main";
	return {
		id: manifest.id,
		name: manifest.name,
		version: manifest.version,
		entry: {
			pages: [
				{
					id: defaultPageId,
					route: `${manifest.id}://${defaultPageId}`,
					name: "Default Page",
					description: "Migrated from legacy entry",
					path: manifest.entry,
					default: true,
				},
			],
		},
		permissions: manifest.permissions,
	};
}

export function validateManifest(manifest: AppManifest): void {
	const normalized = normalizeManifest(manifest);

	if (!manifest.id.trim()) throw new OSError("E_VALIDATION_FAILED", "Manifest id is required");
	if (!manifest.name.trim()) throw new OSError("E_VALIDATION_FAILED", "Manifest name is required");
	if (!manifest.version.trim()) throw new OSError("E_VALIDATION_FAILED", "Manifest version is required");
	if (!Array.isArray(normalized.entry.pages) || normalized.entry.pages.length === 0) {
		throw new OSError("E_VALIDATION_FAILED", "Manifest entry.pages is required");
	}
	const seenRoutes = new Set<string>();
	let defaultCount = 0;
	for (const page of normalized.entry.pages) {
		if (!page.id.trim()) throw new OSError("E_VALIDATION_FAILED", "Manifest page id is required");
		if (!page.route.trim()) throw new OSError("E_VALIDATION_FAILED", "Manifest page route is required");
		if (!page.name.trim()) throw new OSError("E_VALIDATION_FAILED", "Manifest page name is required");
		if (!page.description.trim()) throw new OSError("E_VALIDATION_FAILED", "Manifest page description is required");
		if (!page.path.trim()) throw new OSError("E_VALIDATION_FAILED", "Manifest page path is required");
		const matched = routePattern.exec(page.route);
		if (!matched) {
			throw new OSError("E_VALIDATION_FAILED", `Invalid page route: ${page.route}`);
		}
		const [, appId, pageId] = matched;
		if (appId !== normalized.id) {
			throw new OSError("E_VALIDATION_FAILED", `Route app id mismatch: ${page.route}`);
		}
		if (pageId !== page.id) {
			throw new OSError("E_VALIDATION_FAILED", `Route page id mismatch: ${page.route}`);
		}
		if (seenRoutes.has(page.route)) {
			throw new OSError("E_VALIDATION_FAILED", `Duplicate page route: ${page.route}`);
		}
		seenRoutes.add(page.route);
		if (page.default) {
			defaultCount += 1;
		}
	}
	if (defaultCount > 1) {
		throw new OSError("E_VALIDATION_FAILED", "Manifest default page must be unique");
	}
	if (defaultCount === 0 && normalized.entry.pages.length > 1) {
		throw new OSError("E_VALIDATION_FAILED", "Manifest default page is required for multi-page entry");
	}
}
