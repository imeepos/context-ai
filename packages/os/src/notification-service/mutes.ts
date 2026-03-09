import type { NotificationMuteRecord } from "./types.js";

export class MuteManager {
	private readonly topicMuteUntil = new Map<string, number>();

	muteTopic(topic: string, durationMs: number): void {
		this.topicMuteUntil.set(topic, Date.now() + durationMs);
	}

	unmuteTopic(topic: string): boolean {
		return this.topicMuteUntil.delete(topic);
	}

	isTopicMuted(topic: string): boolean {
		const muteUntil = this.topicMuteUntil.get(topic);
		if (muteUntil === undefined) return false;
		if (Date.now() <= muteUntil) return true;
		this.topicMuteUntil.delete(topic);
		return false;
	}

	listMutes(): NotificationMuteRecord[] {
		const now = Date.now();
		const records: NotificationMuteRecord[] = [];
		for (const [topic, muteUntil] of this.topicMuteUntil.entries()) {
			if (muteUntil <= now) {
				this.topicMuteUntil.delete(topic);
				continue;
			}
			records.push({
				topic,
				muteUntil: new Date(muteUntil).toISOString(),
			});
		}
		return records.sort((a, b) => a.topic.localeCompare(b.topic));
	}

	cleanupExpiredMutes(): number {
		const now = Date.now();
		let removed = 0;
		for (const [topic, muteUntil] of this.topicMuteUntil.entries()) {
			if (muteUntil <= now) {
				this.topicMuteUntil.delete(topic);
				removed += 1;
			}
		}
		return removed;
	}
}
