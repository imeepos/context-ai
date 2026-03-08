import { InjectionToken, RecordInjectionToken } from "@context-ai/core";
import type { OSService } from "../../types/os.js";

export type OSServiceFactory = () => OSService<unknown, unknown, string>;
export type OSServiceFactories = Record<string, OSServiceFactory>;
export type OSServiceDefinition = OSServiceFactory;
export type OSServiceDefinitions = OSServiceFactories;

export const defineToken = <T>(description: string): InjectionToken<T> => new InjectionToken<T>(description);
export const defineRecordToken = <T>(description: string): RecordInjectionToken<T> =>
	new RecordInjectionToken<T>(description);
