import {
	Injectable,
	InjectionToken,
	Injector,
	RecordInjectionToken,
	createInjector,
	type Provider,
	type Type,
} from "@context-ai/core";
import { token } from "./tokens.js";
import type { OSContext, OSService, Token } from "./types/os.js";

export interface DemoRequest {
	value: string;
}

export interface DemoResponse {
	source: "demo";
	message: string;
}

export interface Demo2Request {
	value: string;
}

export interface Demo2Response {
	source: "demo2";
	upstream: DemoResponse;
	message: string;
}

export const DEMO = token<DemoRequest, DemoResponse, "demo">("demo");
export const DEMO_2 = token<Demo2Request, Demo2Response, "demo2">("demo2");

type AnySystemService = OSService<unknown, unknown, string>;
type SystemServiceFactory = () => AnySystemService;

export abstract class SystemServiceExecutor {
	abstract execute<Request, Response, Name extends string>(
		service: Token<Request, Response, Name>,
		request: Request,
		ctx: OSContext,
	): Promise<Response>;
}

export const SYSTEM_SERVICE_FACTORIES = new RecordInjectionToken<SystemServiceFactory>("system.service-factories");
export const SYSTEM_SERVICE_EXECUTOR = new InjectionToken<SystemServiceExecutor>("system.service-executor");

export function createSystemServiceExecutor(
	factories: Record<string, SystemServiceFactory>,
): SystemServiceExecutor {
	return new (class extends SystemServiceExecutor {
		async execute<Request, Response, Name extends string>(
			service: Token<Request, Response, Name>,
			request: Request,
			ctx: OSContext,
		): Promise<Response> {
			const factory = factories[service];
			if (!factory) {
				throw new Error(`system service not registered: ${service}`);
			}

			const target = factory() as OSService<Request, Response, Name>;
			return target.execute(request, ctx);
		}
	})();
}

export function provideSystemServiceFactory<Request, Response, Name extends string>(
	name: Token<Request, Response, Name>,
	useClass: Type<OSService<Request, Response, Name>>,
): Provider {
	return {
		provide: SYSTEM_SERVICE_FACTORIES,
		multi: "record",
		key: name,
		useFactory: (injector: Injector): SystemServiceFactory => () =>
			injector.get(useClass as Type<AnySystemService>),
		deps: [Injector],
	};
}

@Injectable({ providedIn: null })
export class DemoService implements OSService<DemoRequest, DemoResponse, "demo"> {
	readonly name = DEMO;
	readonly requiredPermissions = ["demo:read"];

	async execute(req: DemoRequest, _ctx: OSContext): Promise<DemoResponse> {
		return {
			source: "demo",
			message: `demo:${req.value}`,
		};
	}
}

@Injectable({ providedIn: null })
export class Demo2Service implements OSService<Demo2Request, Demo2Response, "demo2"> {
	readonly name = DEMO_2;
	readonly dependencies: Array<Token<unknown, unknown>> = [DEMO];

	constructor(private readonly system: SystemServiceExecutor) { }

	async execute(req: Demo2Request, ctx: OSContext): Promise<Demo2Response> {
		const upstream = await this.system.execute(DEMO, { value: req.value }, ctx);
		return {
			source: "demo2",
			upstream,
			message: `demo2:${upstream.message}`,
		};
	}
}

export const systemServiceProviders: Provider[] = [
	{
		provide: SYSTEM_SERVICE_EXECUTOR,
		useFactory: (factories: Record<string, SystemServiceFactory>) =>
			createSystemServiceExecutor(factories),
		deps: [SYSTEM_SERVICE_FACTORIES],
	},
	{ provide: DemoService, useClass: DemoService },
	provideSystemServiceFactory(DEMO, DemoService),
	{
		provide: Demo2Service,
		useFactory: (system: SystemServiceExecutor) => new Demo2Service(system),
		deps: [SYSTEM_SERVICE_EXECUTOR],
	},
	provideSystemServiceFactory(DEMO_2, Demo2Service),
];

export function createDemoContext(overrides: Partial<OSContext> = {}): OSContext {
	return {
		appId: "demo-app",
		sessionId: "demo-session",
		permissions: ["demo:read"],
		workingDirectory: ".",
		...overrides,
	};
}

export function createDemoSystemInjector(parent?: Injector): Injector {
	return createInjector(systemServiceProviders, parent);
}

export async function runDemo(value = "hello"): Promise<Demo2Response> {
	const injector = createDemoSystemInjector();
	const system = injector.get(SYSTEM_SERVICE_EXECUTOR);
	return system.execute(DEMO_2, { value }, createDemoContext());
}
