export class AppPermissionStore {
	private readonly grantedByApp = new Map<string, Set<string>>();

	grant(appId: string, permissions: string[]): void {
		this.grantedByApp.set(appId, new Set(permissions));
	}

	has(appId: string, permission: string): boolean {
		return this.grantedByApp.get(appId)?.has(permission) ?? false;
	}

	list(appId: string): string[] {
		return [...(this.grantedByApp.get(appId) ?? new Set<string>())];
	}

	revokeAll(appId: string): void {
		this.grantedByApp.delete(appId);
	}
}
