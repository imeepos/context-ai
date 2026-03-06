import { describe, expect, it } from "vitest";
import { AppAuthorizationGovernor, AppQuotaGovernor } from "./resource-governor.js";
import { OSError } from "./errors.js";

describe("AppAuthorizationGovernor", () => {
	const context = {
		appId: "app.admin",
		sessionId: "s-gov",
		permissions: ["app:manage"],
		workingDirectory: process.cwd(),
	};

	it("bypasses app.install.rollback for unregistered app context", () => {
		const governor = new AppAuthorizationGovernor(
			() => false,
			() => false,
			() => false,
		);
		expect(() =>
			governor.beforeExecute({
				serviceName: "app.install.rollback",
				context,
				request: { appId: "todo", rollbackToken: "t" },
			}),
		).not.toThrow();
	});

	it("enforces authorization for non-bypass services", () => {
		const governor = new AppAuthorizationGovernor(
			() => false,
			() => false,
			() => false,
		);
		expect(() =>
			governor.beforeExecute({
				serviceName: "app.page.render",
				context,
				request: { route: "todo://list" },
			}),
		).toThrowError(expect.objectContaining({ code: "E_APP_NOT_REGISTERED" } satisfies Partial<OSError>));
	});
});

describe("AppQuotaGovernor", () => {
	const context = {
		appId: "app.admin",
		sessionId: "s-gov",
		permissions: ["app:manage"],
		workingDirectory: process.cwd(),
	};

	it("bypasses rollback and install management services", () => {
		let consumeCalls = 0;
		const governor = new AppQuotaGovernor(() => {
			consumeCalls += 1;
		});
		governor.beforeExecute({
			serviceName: "app.install.rollback",
			context,
			request: { appId: "todo", rollbackToken: "t" },
		});
		governor.beforeExecute({
			serviceName: "app.install.v1",
			context,
			request: {},
		});
		expect(consumeCalls).toBe(0);
	});

	it("consumes quota for normal runtime services", () => {
		let consumeCalls = 0;
		const governor = new AppQuotaGovernor(() => {
			consumeCalls += 1;
		});
		governor.beforeExecute({
			serviceName: "app.page.render",
			context,
			request: { route: "todo://list" },
		});
		expect(consumeCalls).toBe(1);
	});
});
