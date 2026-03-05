export type AppLifecycleState = "installed" | "resolved" | "active" | "running" | "suspended" | "stopped";

const transitions: Record<AppLifecycleState, AppLifecycleState[]> = {
	installed: ["resolved", "stopped"],
	resolved: ["active", "stopped"],
	active: ["running", "stopped"],
	running: ["suspended", "stopped"],
	suspended: ["running", "stopped"],
	stopped: ["resolved"],
};

export class AppLifecycleManager {
	private readonly states = new Map<string, AppLifecycleState>();

	getState(appId: string): AppLifecycleState {
		return this.states.get(appId) ?? "installed";
	}

	transition(appId: string, next: AppLifecycleState): AppLifecycleState {
		const current = this.getState(appId);
		const allowedNext = transitions[current];
		if (!allowedNext.includes(next)) {
			throw new Error(`Invalid lifecycle transition: ${current} -> ${next}`);
		}
		this.states.set(appId, next);
		return next;
	}

	reset(appId: string): void {
		this.states.delete(appId);
	}
}
