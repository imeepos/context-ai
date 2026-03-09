import type { AppManifestV1 } from "../manifest.js";
import { normalizeManifest } from "../manifest.js";
import type { OSService } from "../../types/os.js";
import { createOSServiceClass } from "../../os-service-class.js";
import { APP_INSTALL, APP_INSTALL_V1 } from "../../tokens.js";
import type {
	AppInstallRequest,
	AppInstallDeltaReport,
	AppServiceHooks,
	AppInstallV1Request,
} from "../types.js";
import type { AppManager } from "../manager.js";
import type { SecurityService } from "../../security-service/index.js";
import { OSError } from "../../kernel/errors.js";
import { randomUUID } from "node:crypto";

const diffAddedRoutes = (previous: AppManifestV1 | undefined, next: AppManifestV1): number => {
	if (!previous) return next.entry.pages.length;
	const previousRoutes = new Set(previous.entry.pages.map((item) => item.route));
	return next.entry.pages.filter((item) => !previousRoutes.has(item.route)).length;
};

export async function executeAppInstall(
	manager: AppManager,
	hooks: AppServiceHooks | undefined,
	req: AppInstallRequest,
): Promise<{ ok: true; report: AppInstallDeltaReport }> {
	const next = normalizeManifest(req.manifest);
	const previous = manager.registry.has(next.id) ? manager.registry.get(next.id) : undefined;
	const previousQuota = manager.quota.getQuota(next.id);
	const addedRoutes = diffAddedRoutes(previous, next);
	if (!req.force && addedRoutes === 0 && previous) {
		throw new OSError("E_VALIDATION_FAILED", `No page delta for app.install: ${next.id}`);
	}
	manager.install(req.manifest, req.quota);
	hooks?.onInstall?.(req.manifest);
	const report: AppInstallDeltaReport = {
		appId: next.id,
		version: next.version,
		addedPages: next.entry.pages
			.map((page) => page.route)
			.filter((route) => !previous?.entry.pages.some((item) => item.route === route)),
		addedPolicies: next.permissions.filter((permission) => !previous?.permissions.includes(permission)),
		addedObservability: [`audit:${next.id}`, `metrics:${next.id}`, `events:${next.id}`],
		rollbackToken: `${next.id}@${next.version}:${randomUUID()}`,
	};
	manager.setInstallReport(report);
	manager.setRollbackSnapshot(report.rollbackToken, {
		appId: next.id,
		previous,
		previousQuota,
	});
	return { ok: true, report };
}

export const AppInstallOSService = createOSServiceClass(APP_INSTALL, {
	requiredPermissions: ["app:manage"],
	execute: ([manager, hooks]: [AppManager, AppServiceHooks | undefined], req) => executeAppInstall(manager, hooks, req),
});

export function createAppInstallService(
	manager: AppManager,
	hooks?: AppServiceHooks,
): OSService<AppInstallRequest, { ok: true; report: AppInstallDeltaReport }> {
	return new AppInstallOSService(manager, hooks);
}

function buildManifestSigningPayload(manifest: AppManifestV1): string {
	const pages = [...manifest.entry.pages]
		.map((page) => ({
			id: page.id,
			route: page.route,
			name: page.name,
			description: page.description,
			path: page.path,
			tags: page.tags ?? [],
			default: page.default ?? false,
		}))
		.sort((a, b) => a.route.localeCompare(b.route));
	return JSON.stringify({
		id: manifest.id,
		name: manifest.name,
		version: manifest.version,
		pages,
		permissions: [...manifest.permissions].sort(),
	});
}

async function executeAppInstallV1(
	manager: AppManager,
	securityService: SecurityService,
	hooks: AppServiceHooks | undefined,
	req: AppInstallV1Request,
): Promise<{ ok: true; report: AppInstallDeltaReport }> {
	if (req.requireSignature) {
		if (!req.manifest.signing?.signature) {
			throw new OSError("E_VALIDATION_FAILED", `Manifest signing signature is required: ${req.manifest.id}`);
		}
		if (!req.signingSecret) {
			throw new OSError("E_VALIDATION_FAILED", "Signing secret is required when requireSignature=true");
		}
		const payload = buildManifestSigningPayload(req.manifest);
		const verified = securityService.verify(payload, req.signingSecret, req.manifest.signing.signature);
		if (!verified) {
			throw new OSError("E_POLICY_DENIED", `Invalid manifest signature: ${req.manifest.id}@${req.manifest.version}`);
		}
	}
	return executeAppInstall(manager, hooks, {
		manifest: req.manifest,
		quota: req.quota,
		force: req.force,
	});
}

export const AppInstallV1OSService = createOSServiceClass(APP_INSTALL_V1, {
	requiredPermissions: ["app:manage"],
	execute: ([manager, securityService, hooks]: [AppManager, SecurityService, AppServiceHooks | undefined], req) =>
		executeAppInstallV1(manager, securityService, hooks, req),
});

export function createAppInstallV1Service(
	manager: AppManager,
	securityService: SecurityService,
	hooks?: AppServiceHooks,
): OSService<AppInstallV1Request, { ok: true; report: AppInstallDeltaReport }> {
	return new AppInstallV1OSService(manager, securityService, hooks);
}
