import type { LLMOSKernel } from "../kernel/index.js";
import type { NotificationService } from "../notification-service/index.js";
import { APP_INSTALL, APP_INSTALL_V1 } from "../tokens.js";

export interface RegisterDefaultRuntimeObserversInput {
	kernel: LLMOSKernel;
	notificationService: NotificationService;
}

export function registerDefaultRuntimeObservers(input: RegisterDefaultRuntimeObserversInput): void {
	input.kernel.events.subscribe<{
		service: string;
		traceId: string;
		error: string;
		errorCode: string;
	}>("kernel.service.failed", (event) => {
		input.notificationService.send({
			topic: "system.alert",
			message: `[${event.payload.errorCode}] ${event.payload.service}: ${event.payload.error} (trace=${event.payload.traceId})`,
		});
	});

	input.kernel.events.subscribe<{
		id: string;
		attempt: number;
		error: string;
	}>("scheduler.task.failed", (event) => {
		input.notificationService.send({
			topic: "system.alert",
			message: `scheduler task failed: ${event.payload.id} attempt=${event.payload.attempt} error=${event.payload.error}`,
		});
	});

	input.kernel.events.subscribe<{
		service: string;
		appId: string;
		traceId: string;
	}>("kernel.service.executed", (event) => {
		if (
			event.payload.service !== APP_INSTALL &&
			event.payload.service !== APP_INSTALL_V1
		) {
			return;
		}
		input.notificationService.send({
			topic: "system.app.install",
			severity: "info",
			message: `app installed by ${event.payload.appId} via ${event.payload.service} trace=${event.payload.traceId}`,
		});
	});
}
