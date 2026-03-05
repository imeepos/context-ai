import type { EventMessage } from "../types/os.js";

type EventHandler<T> = (message: EventMessage<T>) => void;

export class EventBus {
	private readonly handlers = new Map<string, Set<EventHandler<unknown>>>();
	private readonly history: EventMessage<unknown>[] = [];
	private readonly maxHistory = 500;

	subscribe<T>(topic: string, handler: EventHandler<T>): () => void {
		const existing = this.handlers.get(topic);
		if (existing) {
			existing.add(handler as EventHandler<unknown>);
		} else {
			this.handlers.set(topic, new Set([handler as EventHandler<unknown>]));
		}

		return () => {
			const topicHandlers = this.handlers.get(topic);
			if (!topicHandlers) return;
			topicHandlers.delete(handler as EventHandler<unknown>);
			if (topicHandlers.size === 0) {
				this.handlers.delete(topic);
			}
		};
	}

	publish<T>(topic: string, payload: T): void {
		const event: EventMessage<T> = {
			topic,
			payload,
			timestamp: new Date().toISOString(),
		};
		this.history.push(event as EventMessage<unknown>);
		if (this.history.length > this.maxHistory) {
			this.history.splice(0, this.history.length - this.maxHistory);
		}

		for (const handler of this.handlers.get(topic) ?? []) {
			handler(event as EventMessage<unknown>);
		}
	}

	list(topic?: string, limit?: number): EventMessage<unknown>[] {
		let events = [...this.history];
		if (topic) {
			events = events.filter((event) => event.topic === topic);
		}
		if (limit && limit > 0) {
			events = events.slice(-limit);
		}
		return events;
	}
}
