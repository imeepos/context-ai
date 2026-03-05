export class ShellSessionStore {
	private readonly envBySession = new Map<string, NodeJS.ProcessEnv>();

	get(sessionId: string): NodeJS.ProcessEnv {
		if (!this.envBySession.has(sessionId)) {
			this.envBySession.set(sessionId, {});
		}
		return this.envBySession.get(sessionId) ?? {};
	}

	set(sessionId: string, env: NodeJS.ProcessEnv): void {
		this.envBySession.set(sessionId, { ...env });
	}

	setVar(sessionId: string, key: string, value: string): void {
		const env = this.get(sessionId);
		this.envBySession.set(sessionId, {
			...env,
			[key]: value,
		});
	}

	unsetVar(sessionId: string, key: string): void {
		const env = this.get(sessionId);
		const next: NodeJS.ProcessEnv = { ...env };
		delete next[key];
		this.envBySession.set(sessionId, next);
	}
}
