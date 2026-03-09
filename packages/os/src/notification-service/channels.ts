import { OSError } from "../kernel/errors.js";
import type {
	NotificationChannelAdapter,
	NotificationChannelsConfig,
	NotificationRecord,
	ChannelStats,
} from "./types.js";

export class ChannelManager {
	private readonly channelAdapters = new Map<string, NotificationChannelAdapter>();
	private readonly channelStats = new Map<string, ChannelStats>();
	private readonly deliveryConfig: { retries: number; backoffMs: number };

	constructor(deliveryConfig?: { retries: number; backoffMs: number }) {
		this.deliveryConfig = deliveryConfig ?? { retries: 0, backoffMs: 100 };
	}

	registerAdapter(adapter: NotificationChannelAdapter): void {
		this.channelAdapters.set(adapter.name, adapter);
		if (!this.channelStats.has(adapter.name)) {
			this.channelStats.set(adapter.name, {
				success: 0,
				failure: 0,
				retried: 0,
			});
		}
	}

	getStats(): Record<string, ChannelStats> {
		return Object.fromEntries(
			[...this.channelStats.entries()].map(([name, stats]) => [name, { ...stats }]),
		);
	}

	configureChannels(config: NotificationChannelsConfig): { configured: string[] } {
		const configured: string[] = [];

		if (config.webhook?.url) {
			this.registerAdapter({
				name: "webhook",
				send: async (record) => {
					const response = await fetch(config.webhook!.url, {
						method: "POST",
						headers: {
							"content-type": "application/json",
							...config.webhook?.headers,
						},
						body: JSON.stringify(record),
					});
					if (!response.ok) {
						throw new OSError("E_EXTERNAL_FAILURE", `webhook status=${response.status}`);
					}
				},
			});
			configured.push("webhook");
		}

		if (config.slack?.webhookUrl) {
			this.registerAdapter({
				name: "slack",
				send: async (record) => {
					const response = await fetch(config.slack!.webhookUrl, {
						method: "POST",
						headers: { "content-type": "application/json" },
						body: JSON.stringify({
							text: `[${record.severity}] ${record.topic}: ${record.message}`,
						}),
					});
					if (!response.ok) {
						throw new OSError("E_EXTERNAL_FAILURE", `slack status=${response.status}`);
					}
				},
			});
			configured.push("slack");
		}

		if (config.email?.endpoint && config.email.to) {
			this.registerAdapter({
				name: "email",
				send: async (record) => {
					const response = await fetch(config.email!.endpoint, {
						method: "POST",
						headers: { "content-type": "application/json" },
						body: JSON.stringify({
							to: config.email!.to,
							from: config.email!.from,
							subject: `[${record.severity}] ${record.topic}`,
							text: record.message,
						}),
					});
					if (!response.ok) {
						throw new OSError("E_EXTERNAL_FAILURE", `email status=${response.status}`);
					}
				},
			});
			configured.push("email");
		}

		return { configured };
	}

	deliverToChannels(record: NotificationRecord): void {
		for (const [name, adapter] of this.channelAdapters.entries()) {
			this.sendToChannel(name, adapter, record, 0);
		}
	}

	private sendToChannel(
		name: string,
		adapter: NotificationChannelAdapter,
		record: NotificationRecord,
		attempt: number,
	): void {
		Promise.resolve(adapter.send(record))
			.then(() => {
				const stats = this.channelStats.get(name);
				if (!stats) return;
				stats.success += 1;
				this.channelStats.set(name, stats);
			})
			.catch(() => {
				if (attempt < this.deliveryConfig.retries) {
					const stats = this.channelStats.get(name);
					if (stats) {
						stats.retried += 1;
						this.channelStats.set(name, stats);
					}
					setTimeout(() => {
						this.sendToChannel(name, adapter, record, attempt + 1);
					}, this.deliveryConfig.backoffMs * (attempt + 1));
					return;
				}
				const stats = this.channelStats.get(name);
				if (!stats) return;
				stats.failure += 1;
				this.channelStats.set(name, stats);
			});
	}
}
