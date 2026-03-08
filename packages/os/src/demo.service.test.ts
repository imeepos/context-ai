import { describe, expect, it } from "vitest";
import {
	DEMO,
	DEMO_2,
	DemoService,
	SYSTEM_SERVICE_EXECUTOR,
	SYSTEM_SERVICE_FACTORIES,
	createDemoContext,
	createDemoSystemInjector,
	runDemo,
} from "./demo.service.js";

describe("demo.service", () => {
	it("registers service factories through record multi providers", () => {
		const injector = createDemoSystemInjector();
		const factories = injector.get(SYSTEM_SERVICE_FACTORIES);

		expect(Object.keys(factories).sort()).toEqual([DEMO, DEMO_2].sort());
		expect(factories[DEMO]!()).toBe(injector.get(DemoService));
	});

	it("allows one service to call another through the injected executor", async () => {
		const injector = createDemoSystemInjector();
		const system = injector.get(SYSTEM_SERVICE_EXECUTOR);

		const result = await system.execute(DEMO_2, { value: "hello" }, createDemoContext());

		expect(result).toEqual({
			source: "demo2",
			upstream: {
				source: "demo",
				message: "demo:hello",
			},
			message: "demo2:demo:hello",
		});
	});

	it("provides a one-shot demo runner", async () => {
		await expect(runDemo("world")).resolves.toEqual({
			source: "demo2",
			upstream: {
				source: "demo",
				message: "demo:world",
			},
			message: "demo2:demo:world",
		});
	});
});
