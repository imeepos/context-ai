import type { OSService } from "../types/os.js";
import type { SecurityService } from "../security-service/index.js";
import { OSError } from "../kernel/errors.js";
import { PACKAGE_INSTALL, PACKAGE_LIST } from "../tokens.js";

export interface AppPackage {
	name: string;
	version: string;
	source: string;
	signature?: string;
}

export class PackageService {
	private readonly packages = new Map<string, AppPackage>();
	private readonly signingSecret?: string;
	private readonly security?: SecurityService;

	constructor(options?: { signingSecret?: string; security?: SecurityService }) {
		this.signingSecret = options?.signingSecret;
		this.security = options?.security;
	}

	install(pkg: AppPackage): void {
		if (this.signingSecret && this.security) {
			if (!pkg.signature) {
				throw new OSError("E_POLICY_DENIED", `Package signature required: ${pkg.name}@${pkg.version}`);
			}
			const payload = `${pkg.name}@${pkg.version}:${pkg.source}`;
			const ok = this.security.verify(payload, this.signingSecret, pkg.signature);
			if (!ok) {
				throw new OSError("E_POLICY_DENIED", `Invalid package signature: ${pkg.name}@${pkg.version}`);
			}
		}
		this.packages.set(`${pkg.name}@${pkg.version}`, pkg);
	}

	list(): AppPackage[] {
		return [...this.packages.values()];
	}
}

export interface PackageInstallRequest {
	package: AppPackage;
}

export function createPackageInstallService(service: PackageService): OSService<PackageInstallRequest, { ok: true }> {
	return {
		name: PACKAGE_INSTALL,
		requiredPermissions: ["package:write"],
		execute: async (req) => {
			service.install(req.package);
			return { ok: true };
		},
	};
}

export function createPackageListService(service: PackageService): OSService<Record<string, never>, { packages: AppPackage[] }> {
	return {
		name: PACKAGE_LIST,
		requiredPermissions: ["package:read"],
		execute: async () => ({ packages: service.list() }),
	};
}
