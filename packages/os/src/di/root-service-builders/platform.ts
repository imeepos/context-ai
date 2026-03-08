import { FileService } from "../../file-service/index.js";
import { NetService } from "../../net-service/index.js";
import { NotificationService } from "../../notification-service/index.js";
import { SchedulerService, StoreSchedulerStateAdapter } from "../../scheduler-service/index.js";
import { SecurityService } from "../../security-service/index.js";
import { ShellService } from "../../shell-service/index.js";
import { StoreService } from "../../store-service/index.js";
import type { CreateDefaultLLMOSOptions } from "../../llm-os.types.js";
import type { OSRootServiceFoundation } from "./foundation.js";
import { createNetJournalWriter } from "./net-journal.js";
import {
	createOSRootSidecarServices,
	type OSRootSidecarServices,
} from "./sidecar-services.js";

export interface OSRootPlatformServices extends OSRootSidecarServices {
	fileService: FileService;
	shellService: ShellService;
	securityService: SecurityService;
	storeService: StoreService;
	netService: NetService;
	schedulerService: SchedulerService;
	notificationService: NotificationService;
}

export function createOSRootPlatformServices(
	foundation: OSRootServiceFoundation,
	options: CreateDefaultLLMOSOptions = {},
): OSRootPlatformServices {
	const fileService = new FileService(foundation.policy);
	const shellService = new ShellService(foundation.policy);
	const securityService = new SecurityService();
	const storeService = new StoreService();
	const netService = new NetService(
		foundation.policy,
		securityService,
		createNetJournalWriter(storeService, options),
	);
	const schedulerService = new SchedulerService(
		foundation.kernel.events,
		{
			storage: new StoreSchedulerStateAdapter(storeService),
			autoPersist: true,
		},
	);
	const notificationService = new NotificationService(foundation.kernel.events, {
		dedupeWindowMs: options.notificationDedupeWindowMs,
		rateLimit: options.notificationRateLimit,
		retentionLimit: options.notificationRetentionLimit,
	});
	const sidecars = createOSRootSidecarServices(securityService, options);

	return {
		fileService,
		shellService,
		securityService,
		storeService,
		netService,
		schedulerService,
		notificationService,
		...sidecars,
	};
}
