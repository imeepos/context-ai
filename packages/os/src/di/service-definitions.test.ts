import { createInjector } from "@context-ai/core";
import { describe, expect, it } from "vitest";
import { AppInstallOSService, AppPageRenderOSService } from "../app-manager/index.js";
import { SystemRoutesOSService } from "./service-catalog/system-app.js";
import { SystemHealthOSService } from "./service-catalog/system-observability.js";
import { SystemErrorsOSService } from "./service-catalog/system-operations.js";
import { SystemPolicyOSService } from "./service-catalog/system-policy.js";
import { FileReadOSService } from "../file-service/index.js";
import { MediaInspectOSService } from "../media-service/index.js";
import { NotificationSendOSService } from "../notification-service/index.js";
import { PlannerSelectAppsOSService } from "../planner/index.js";
import { SchedulerCancelOSService } from "../scheduler-service/index.js";
import { TaskSubmitOSService } from "../task-runtime/index.js";
import {
	APP_INSTALL,
	APP_PAGE_RENDER,
	FILE_READ,
	MEDIA_INSPECT,
	NOTIFICATION_SEND,
	PLANNER_SELECT_APPS,
	SCHEDULER_CANCEL,
	SYSTEM_ERRORS,
	SYSTEM_HEALTH,
	SYSTEM_POLICY,
	SYSTEM_ROUTES,
	TASK_SUBMIT,
} from "../tokens.js";
import { createOSBaseProviders } from "./providers.js";
import { createOSRootRuntime } from "./root-runtime.js";
import { createOSRootRuntimeComponents } from "./root-runtime-components.js";
import { createOSRootServices } from "./root-services.js";
import {
	createOSServiceCatalog,
	getOSServiceCatalogDefinitionNames,
	OS_SERVICE_CATALOG_DEFINITIONS,
} from "./service-definitions.js";
import { OS_SERVICE_FACTORIES } from "./tokens.js";

function createCatalogFixture() {
	const services = createOSRootServices();
	const components = createOSRootRuntimeComponents({
		services,
		getAppRuntimeRegistry: () => undefined,
	});
	return createOSServiceCatalog({
		...services,
		appPageRenderer: components.appPageRenderer,
		appPageSystemRuntime: components.appPageSystemRuntime,
		appServiceHooks: components.appServiceHooks,
		rollbackHooks: components.rollbackHooks,
	});
}

describe("service definitions", () => {
	it("keeps definition names unique", () => {
		const names = getOSServiceCatalogDefinitionNames();
		expect(new Set(names).size).toBe(names.length);
	});

	it("builds a catalog entry for every declared definition", () => {
		const catalog = createCatalogFixture();
		expect(Object.keys(catalog).sort()).toEqual(getOSServiceCatalogDefinitionNames().sort());
	});

	it("creates services whose runtime name matches the declared token", () => {
		const catalog = createCatalogFixture();
		for (const definition of OS_SERVICE_CATALOG_DEFINITIONS) {
			const service = catalog[definition.name as keyof typeof catalog]();
			expect(service.name).toBe(definition.name);
			if (service.dependencies) {
				expect(service.dependencies.every((dependency) => typeof dependency === "string")).toBe(true);
			}
		}
	});

	it("registers every declared service factory through injector multi providers", () => {
		const runtime = createOSRootRuntime();
		const injector = createInjector(
			createOSBaseProviders({
				options: {},
				runtime,
			}),
		);
		const factories = injector.get(OS_SERVICE_FACTORIES);

		expect(Object.keys(factories).sort()).toEqual(getOSServiceCatalogDefinitionNames().sort());

		for (const definition of OS_SERVICE_CATALOG_DEFINITIONS) {
			const service = factories[definition.name]!();
			expect(service.name).toBe(definition.name);
			if (service.dependencies) {
				expect(service.dependencies.every((dependency) => typeof dependency === "string")).toBe(true);
			}
		}

		expect(factories[FILE_READ]!()).toBeInstanceOf(FileReadOSService);
		expect(factories[APP_INSTALL]!()).toBeInstanceOf(AppInstallOSService);
		expect(factories[APP_PAGE_RENDER]!()).toBeInstanceOf(AppPageRenderOSService);
		expect(factories[TASK_SUBMIT]!()).toBeInstanceOf(TaskSubmitOSService);
		expect(factories[PLANNER_SELECT_APPS]!()).toBeInstanceOf(PlannerSelectAppsOSService);
		expect(factories[MEDIA_INSPECT]!()).toBeInstanceOf(MediaInspectOSService);
		expect(factories[SYSTEM_ERRORS]!()).toBeInstanceOf(SystemErrorsOSService);
		expect(factories[SYSTEM_HEALTH]!()).toBeInstanceOf(SystemHealthOSService);
		expect(factories[SYSTEM_POLICY]!()).toBeInstanceOf(SystemPolicyOSService);
		expect(factories[SYSTEM_ROUTES]!()).toBeInstanceOf(SystemRoutesOSService);
		expect(factories[NOTIFICATION_SEND]!()).toBeInstanceOf(NotificationSendOSService);
		expect(factories[SCHEDULER_CANCEL]!()).toBeInstanceOf(SchedulerCancelOSService);
	});
});
