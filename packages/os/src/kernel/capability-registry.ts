export class CapabilityRegistry {
	private readonly capabilitiesByApp = new Map<string, Set<string>>();

	set(appId: string, capabilities: string[]): void {
		this.capabilitiesByApp.set(appId, new Set(capabilities));
	}

	add(appId: string, capability: string): void {
		const existing = this.capabilitiesByApp.get(appId);
		if (existing) {
			existing.add(capability);
			return;
		}
		this.capabilitiesByApp.set(appId, new Set([capability]));
	}

	has(appId: string, capability: string): boolean {
		return this.capabilitiesByApp.get(appId)?.has(capability) ?? false;
	}

	list(appId: string): string[] {
		return [...(this.capabilitiesByApp.get(appId) ?? new Set<string>())];
	}

	remove(appId: string): void {
		this.capabilitiesByApp.delete(appId);
	}

	listAll(): Record<string, string[]> {
		const result: Record<string, string[]> = {};
		for (const [appId, capabilities] of this.capabilitiesByApp.entries()) {
			result[appId] = [...capabilities];
		}
		return result;
	}
}
