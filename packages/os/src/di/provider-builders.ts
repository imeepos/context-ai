import type { InjectionTokenType, Provider } from "@context-ai/core";

export interface ValueBinding<T = unknown> {
	provide: InjectionTokenType<T>;
	useValue: T;
}

export function createValueProviders(bindings: ReadonlyArray<ValueBinding>): Provider[] {
	return bindings.map((binding) => ({
		provide: binding.provide,
		useValue: binding.useValue,
	}));
}

export function createRecordValueProviders<T>(
	provide: InjectionTokenType<T>,
	values: Record<string, T>,
): Provider[] {
	return Object.entries(values).map(([key, useValue]) => ({
		provide,
		useValue,
		multi: "record" as const,
		key,
	}));
}
