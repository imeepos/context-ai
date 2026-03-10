import { Inject, Injectable } from "@context-ai/core";
import { SYSTEM_LOG_FILTER } from "../tokens.js";

export interface ISystemLogger {
	log(namespace: string, ...args: unknown[]): void;
	error(namespace: string, ...args: unknown[]): void;
	setFilter(pattern: string): void;
	getFilter(): string;
}

@Injectable()
export class SystemLogger implements ISystemLogger {
	private filter: string;
	private matchers: RegExp[] = [];

	constructor(@Inject(SYSTEM_LOG_FILTER) filter: string) {
		this.filter = filter && filter.trim().length > 0 ? filter : "*";
		this.matchers = this.compileMatchers(this.filter);
	}

	log(namespace: string, ...args: unknown[]): void {
		if (!this.shouldLog(namespace)) return;
		console.log(`[${namespace}]`, ...args);
	}

	error(namespace: string, ...args: unknown[]): void {
		if (!this.shouldLog(namespace)) return;
		console.error(`[${namespace}]`, ...args);
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
}

