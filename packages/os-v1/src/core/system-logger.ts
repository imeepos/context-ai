export interface ISystemLogger {
	log(namespace: string, ...args: unknown[]): void;
	error(namespace: string, ...args: unknown[]): void;
	setFilter(pattern: string): void;
	getFilter(): string;
}

interface CallSite {
	file: string;
	line: number;
	column: number;
}

type CallChain = CallSite[];

export class SystemLogger implements ISystemLogger {
	private filter: string;
	private matchers: RegExp[] = [];

	constructor(filter: string) {
		this.filter = filter && filter.trim().length > 0 ? filter : "*";
		this.matchers = this.compileMatchers(this.filter);
	}

	log(namespace: string, ...args: unknown[]): void {
		if (!this.shouldLog(namespace)) return;
		const callChain = this.getCallChain();
		const location = this.formatCallChain(callChain);
		console.log(`[${namespace}] ${location}`, ...args);
	}

	error(namespace: string, ...args: unknown[]): void {
		if (!this.shouldLog(namespace)) return;
		const callChain = this.getCallChain();
		const location = this.formatCallChain(callChain);
		console.error(`[${namespace}] ${location}`, ...args);
	}

	setFilter(pattern: string): void {
		this.filter = pattern && pattern.trim().length > 0 ? pattern : "*";
		this.matchers = this.compileMatchers(this.filter);
	}

	getFilter(): string {
		return this.filter;
	}

	private shouldLog(namespace: string): boolean {
		return this.matchers.some((regex) => regex.test(namespace));
	}

	private compileMatchers(rawPattern: string): RegExp[] {
		return rawPattern
			.split(",")
			.map((p) => p.trim())
			.filter(Boolean)
			.map((pattern) => {
				const escaped = pattern
					.replace(/[.+?^${}()|[\]\\]/g, "\\$&")
					.replace(/\*/g, ".*");
				return new RegExp(`^${escaped}$`);
			});
	}

	private parseStackLine(line: string): CallSite | null {
		// Match patterns like:
		// at functionName (file:///path/to/file.ts:123:45)
		// at file:///path/to/file.ts:123:45
		// at C:\path\to\file.ts:123:45
		const match = line.match(/\((.+):(\d+):(\d+)\)/) || line.match(/at\s+(.+):(\d+):(\d+)/);
		if (!match || !match[1] || !match[2] || !match[3]) return null;

		const fullPath = match[1];
		const lineStr = match[2];
		const columnStr = match[3];

		// Extract just the filename from the full path
		const file = fullPath.split(/[/\\]/).pop() || fullPath;

		return {
			file,
			line: parseInt(lineStr, 10),
			column: parseInt(columnStr, 10),
		};
	}

	private getCallChain(maxDepth: number = 5): CallChain {
		const stack = new Error().stack;
		if (!stack) return [];

		const lines = stack.split("\n");
		const callChain: CallChain = [];

		// Skip:
		// - line 0: "Error"
		// - line 1: getCallChain
		// - line 2: log/error method
		// Start from line 3 onwards to get the actual callers
		for (let i = 3; i < lines.length && callChain.length < maxDepth; i++) {
			const line = lines[i];
			if (!line) continue;

			const callSite = this.parseStackLine(line);
			if (callSite) {
				callChain.push(callSite);
			}
		}

		return callChain;
	}

	private formatCallChain(callChain: CallChain): string {
		if (callChain.length === 0) return "";

		// Format: (file1.ts:10 <- file2.ts:20 <- file3.ts:30)
		const formatted = callChain
			.map(site => `${site.file}:${site.line}`)
			.join(" <- ");

		return `(${formatted})`;
	}
}

