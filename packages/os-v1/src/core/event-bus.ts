/**
 * EventBus Service
 * 基于 RxJS Subject 的事件总线实现，支持类型安全和多订阅者
 */

import { EventEmitter } from "node:events";
import { Injectable } from "@context-ai/core";
import { Subject, type Observable, type Subscription } from "rxjs";
import { filter } from "rxjs/operators";
import type { EventBus } from "../tokens.js";
import type { EventEnvelope, EventToken } from "../events.js";
import type { TSchema, Static } from "@sinclair/typebox";

/**
 * EventBus 实现
 *
 * 提供发布/订阅模式的事件总线，用于组件间解耦通信
 *
 * 特性：
 * - 基于 Node.js EventEmitter
 * - 支持通配符订阅（使用 * 匹配任意主题）
 * - 自动错误处理
 * - 订阅管理（返回取消订阅函数）
 */
@Injectable({ providedIn: "root" })
export class EventBusService implements EventBus {
	/** 单个全局 Subject，发射所有事件 */
	private readonly globalSubject = new Subject<EventEnvelope>();

	/** 保留 EventEmitter 用于向后兼容 */
	private readonly emitter = new EventEmitter();

	constructor() {
		// 设置最大监听器数量，避免内存泄漏警告
		this.emitter.setMaxListeners(100);
	}

	/**
	 * 类型安全的事件发布
	 *
	 * @param sessionId 会话 ID
	 * @param token 事件令牌
	 * @param payload 事件负载
	 */
	publish<TPayload extends TSchema>(
		sessionId: string,
		token: EventToken<TPayload>,
		payload: Static<TPayload>
	): void;

	/**
	 * 向后兼容：旧的发布方法
	 *
	 * @param topic 事件主题
	 * @param payload 事件负载
	 */
	publish(topic: string, payload: unknown): void;

	publish<TPayload extends TSchema>(
		sessionIdOrTopic: string,
		tokenOrPayload: EventToken<TPayload> | unknown,
		payload?: Static<TPayload>
	): void {
		try {
			// 新的类型安全 API
			if (payload !== undefined) {
				const sessionId = sessionIdOrTopic;
				const token = tokenOrPayload as EventToken<TPayload>;

				const envelope: EventEnvelope<TPayload> = {
					sessionId,
					type: token,
					payload,
					timestamp: Date.now()
				};

				// 发射到全局 Subject
				this.globalSubject.next(envelope);

				// 向后兼容：发射到 EventEmitter
				this.emitter.emit(token as string, payload);
			} else {
				// 旧的 API（向后兼容）
				const topic = sessionIdOrTopic;
				const oldPayload = tokenOrPayload;

				this.emitter.emit(topic, oldPayload);
			}
		} catch (error) {
			console.error(`[EventBus] Error publishing event:`, error);
		}
	}

	/**
	 * 类型安全的事件订阅
	 *
	 * @param pattern 事件模式（支持通配符 *）
	 * @param handler 事件处理器
	 * @param options 订阅选项（sessionId、metadata 过滤）
	 * @returns RxJS Subscription
	 */
	subscribe<TPayload extends TSchema>(
		pattern: string | EventToken<TPayload>,
		handler: (envelope: EventEnvelope<TPayload>) => void,
		options?: { sessionId?: string; metadata?: Record<string, unknown> }
	): Subscription;

	/**
	 * 向后兼容：旧的订阅方法
	 *
	 * @param topic 事件主题（支持通配符 *）
	 * @param handler 事件处理函数
	 * @returns 取消订阅函数
	 */
	subscribe(topic: string, handler: (payload: unknown) => void): () => void;

	subscribe<TPayload extends TSchema>(
		pattern: string | EventToken<TPayload>,
		handler: ((envelope: EventEnvelope<TPayload>) => void) | ((payload: unknown) => void),
		options?: { sessionId?: string; metadata?: Record<string, unknown> }
	): Subscription | (() => void) {
		// 新的类型安全 API（有 options 参数）
		if (options !== undefined || handler.length === 1) {
			return this.globalSubject
				.pipe(
					filter(envelope => {
						// 1. 匹配事件类型（支持通配符）
						const typeMatches = this.matchPattern(pattern as string, envelope.type);
						if (!typeMatches) return false;

						// 2. 匹配 sessionId（如果指定）
						if (options?.sessionId && envelope.sessionId !== options.sessionId) {
							return false;
						}

						// 3. 匹配 metadata（如果指定）
						if (options?.metadata) {
							for (const [key, value] of Object.entries(options.metadata)) {
								if (envelope.metadata?.[key] !== value) {
									return false;
								}
							}
						}

						return true;
					})
				)
				.subscribe({
					next: (envelope) => {
						try {
							(handler as (envelope: EventEnvelope<TPayload>) => void)(envelope as EventEnvelope<TPayload>);
						} catch (error) {
							console.error(`[EventBus] Error in handler for "${pattern}":`, error);
						}
					},
					error: (error) => {
						console.error(`[EventBus] Stream error:`, error);
					}
				});
		}

		// 旧的 API（向后兼容）
		const topic = pattern as string;
		const oldHandler = handler as (payload: unknown) => void;

		const wrappedHandler = (payload: unknown) => {
			try {
				oldHandler(payload);
			} catch (error) {
				console.error(`[EventBus] Error in handler for "${topic}":`, error);
			}
		};

		this.emitter.on(topic, wrappedHandler);

		// 返回取消订阅函数
		return () => {
			this.emitter.off(topic, wrappedHandler);
		};
	}

	/**
	 * 获取事件流的 Observable（高级用法）
	 *
	 * @param pattern 事件模式（支持通配符）
	 * @param sessionId 可选，只接收特定会话的事件
	 * @returns Observable<EventEnvelope>
	 */
	getEventStream<TPayload extends TSchema>(
		pattern?: string | EventToken<TPayload>,
		sessionId?: string
	): Observable<EventEnvelope<TPayload>> {
		let stream = this.globalSubject.asObservable();

		if (pattern) {
			stream = stream.pipe(
				filter(envelope => this.matchPattern(pattern as string, envelope.type))
			);
		}

		if (sessionId) {
			stream = stream.pipe(
				filter(envelope => envelope.sessionId === sessionId)
			);
		}

		return stream as Observable<EventEnvelope<TPayload>>;
	}

	/**
	 * 订阅一次性事件（触发后自动取消订阅）
	 *
	 * @param topic 事件主题
	 * @param handler 事件处理函数
	 */
	once(topic: string, handler: (payload: unknown) => void): void {
		const wrappedHandler = (payload: unknown) => {
			try {
				handler(payload);
			} catch (error) {
				console.error(`[EventBus] Error in once handler for "${topic}":`, error);
			}
		};

		this.emitter.once(topic, wrappedHandler);
	}

	/**
	 * 取消所有订阅
	 *
	 * @param topic 可选，指定主题则只取消该主题的订阅
	 */
	unsubscribeAll(topic?: string): void {
		if (topic) {
			this.emitter.removeAllListeners(topic);
		} else {
			this.emitter.removeAllListeners();
		}
	}

	/**
	 * 获取主题的监听器数量
	 *
	 * @param topic 事件主题
	 * @returns 监听器数量
	 */
	listenerCount(topic: string): number {
		return this.emitter.listenerCount(topic);
	}

	/**
	 * 匹配通配符模式
	 *
	 * @param pattern 模式（支持 * 通配符）
	 * @param topic 实际主题
	 * @returns 是否匹配
	 *
	 * @example
	 * matchPattern("scheduler.*", "scheduler.task.started") // true
	 * matchPattern("*.task.*", "scheduler.task.completed") // true
	 */
	private matchPattern(pattern: string, topic: string): boolean {
		const regexPattern = pattern
			.split("*")
			.map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
			.join(".*");

		const regex = new RegExp(`^${regexPattern}$`);
		return regex.test(topic);
	}
}
